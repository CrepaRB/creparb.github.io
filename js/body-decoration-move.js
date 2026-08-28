(function () {
    'use strict';

    const doc = document;
    const maskCircle = doc.getElementById('mask-circle');
    const maskRect = doc.getElementById('mask-rect');
    const strokeSvg = doc.getElementById('ring-stroke-svg');
    const strokeCircle = doc.getElementById('ring-stroke-circle');
    const ringLayer = doc.querySelector('.wire-layer');
    let topBarIsFixed = false;

    // 直接获取 HTML 中预置的线条
    const lineLeft = doc.getElementById('line-left');
    const lineRight = doc.getElementById('line-right');
    const sublineLeft = doc.getElementById('subline-left');
    const sublineRight = doc.getElementById('subline-right');

    function getCssValue(name) {
        return getComputedStyle(doc.documentElement).getPropertyValue(name).trim();
    }

    function toPixels(value) {
        if (!value) return 0;
        const text = String(value).trim();
        if (text.endsWith('px')) return parseFloat(text);
        if (text.endsWith('vh')) return parseFloat(text) / 100 * window.innerHeight;
        if (text.endsWith('vw')) return parseFloat(text) / 100 * window.innerWidth;
        if (text.endsWith('rem')) return parseFloat(text) * parseFloat(getComputedStyle(doc.documentElement).fontSize);
        return parseFloat(text) || 0;
    }

    function getFinalRadius(viewportWidth, viewportHeight) {
        const breakpoint = toPixels(getCssValue('--wire-breakpoint') || '768px');
        const mobileRadius = toPixels('50vw');
        if (viewportWidth <= breakpoint) return mobileRadius;
        return Math.min(mobileRadius, viewportHeight * 3 / 5);
    }

    // 计算圆外一点到圆的两条切点
    function getTangentPoints(cx, cy, r, px, py) {
        const dx = px - cx;
        const dy = py - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= r) return null;
        const theta = Math.atan2(dy, dx);
        const alpha = Math.acos(r / d);
        const angle1 = theta + alpha;
        const angle2 = theta - alpha;
        return {
            t1: { x: cx + r * Math.cos(angle1), y: cy + r * Math.sin(angle1) },
            t2: { x: cx + r * Math.cos(angle2), y: cy + r * Math.sin(angle2) }
        };
    }

    // 更新四条直线的位置
    function updateLines(isFixed, vw, vh, cx, cy, radius) {
        if (!lineLeft || !lineRight || !sublineLeft || !sublineRight) return;

        // 读取所有必要变量
        const color = getCssValue('--decoration-line-color');
        const stroke = getCssValue('--decoration-line-stroke');
        const focusHeightRaw = getCssValue('--decoration-line-focus-height');
        const subHeightRaw = getCssValue('--decoration-line-sub-height');

        const allVarsExist = color && stroke && focusHeightRaw && subHeightRaw;
        const focusHeight = allVarsExist ? toPixels(focusHeightRaw) : 0;
        const subHeight = allVarsExist ? toPixels(subHeightRaw) : 0; // 单位 vw，自动转换
        const valid = allVarsExist && focusHeight > 0 && subHeight >= 0;

    // 若变量无效，不更新坐标（保留上次位置）
    if (!valid) return;

        // ---- 计算主直线 ----
        const O = { x: vw / 2, y: vh - focusHeight };
        const tangents = getTangentPoints(cx, cy, radius, O.x, O.y);
    if (!tangents) return;

        const tLeft = tangents.t1.x < tangents.t2.x ? tangents.t1 : tangents.t2;
        const tRight = tangents.t1.x > tangents.t2.x ? tangents.t1 : tangents.t2;

        const dxL = tLeft.x - O.x;
        const dyL = tLeft.y - O.y;
        const lenL = Math.sqrt(dxL * dxL + dyL * dyL);
        const dxR = tRight.x - O.x;
        const dyR = tRight.y - O.y;
        const lenR = Math.sqrt(dxR * dxR + dyR * dyR);

        const halfLen = Math.max(vw, vh) * 2.5;
        const uL = { x: dxL / lenL, y: dyL / lenL };
        const uR = { x: dxR / lenR, y: dyR / lenR };

        // 主直线端点
        const pL1 = { x: O.x - uL.x * halfLen, y: O.y - uL.y * halfLen };
        const pL2 = { x: O.x + uL.x * halfLen, y: O.y + uL.y * halfLen };
        const pR1 = { x: O.x - uR.x * halfLen, y: O.y - uR.y * halfLen };
        const pR2 = { x: O.x + uR.x * halfLen, y: O.y + uR.y * halfLen };

        // 更新坐标
        lineLeft.setAttribute('x1', pL1.x);
        lineLeft.setAttribute('y1', pL1.y);
        lineLeft.setAttribute('x2', pL2.x);
        lineLeft.setAttribute('y2', pL2.y);

        lineRight.setAttribute('x1', pR1.x);
        lineRight.setAttribute('y1', pR1.y);
        lineRight.setAttribute('x2', pR2.x);
        lineRight.setAttribute('y2', pR2.y);

        // ---- 计算辅助线 ----
        // 主直线与底边 y=vh 的交点
        const t_bottom_L = (vh - O.y) / uL.y;
        const x_bottom_L = O.x + uL.x * t_bottom_L;
        const pBottomL = { x: x_bottom_L, y: vh };

        const t_bottom_R = (vh - O.y) / uR.y;
        const x_bottom_R = O.x + uR.x * t_bottom_R;
        const pBottomR = { x: x_bottom_R, y: vh };

        // 辅助线终点：在侧边上，到底角距离为 subHeight（竖直距离）
        const endY = vh - subHeight; // subHeight 已转为像素

        // 左侧辅助线：从底边交点向左上至 (0, endY)
        sublineLeft.setAttribute('x1', pBottomL.x);
        sublineLeft.setAttribute('y1', pBottomL.y);
        sublineLeft.setAttribute('x2', vw);
        sublineLeft.setAttribute('y2', endY);

        // 右侧辅助线：从底边交点向右上至 (vw, endY)
        sublineRight.setAttribute('x1', pBottomR.x);
        sublineRight.setAttribute('y1', pBottomR.y);
        sublineRight.setAttribute('x2', 0);
        sublineRight.setAttribute('y2', endY);
    }

    // 原有的 updateRing 保持不变
    function updateRing() {
        if (!maskCircle || !maskRect || !strokeSvg || !strokeCircle) return;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const initialRadius = Math.max(viewportWidth / 6, viewportHeight / 3.375);
        const targetRadius = initialRadius * 3;
        const transitionHeight = toPixels(getCssValue('--hero-transition-height') || '300px');
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const delta = Math.max(0, Math.min(scrollY, transitionHeight));
        const radius = initialRadius + delta / (transitionHeight || 1) * (targetRadius - initialRadius);
        const transitionProgress = delta / (transitionHeight || 1);
        const centerX = viewportWidth / 2;
        const centerY = viewportHeight - initialRadius / 3 - scrollY;
        const displayedCenterY = topBarIsFixed ? -viewportWidth / 6 : centerY;
        const ringStroke = strokeSvg.closest('.ring-stroke');

        ringStroke?.classList.toggle('is-fixed', topBarIsFixed);

        maskCircle.setAttribute('cx', centerX - 2);
        maskCircle.setAttribute('cy', displayedCenterY - 12);
        maskCircle.setAttribute('r', radius - 12);
        maskRect.setAttribute('x', centerX - radius - 2);
        maskRect.setAttribute('y', displayedCenterY - 12);
        maskRect.setAttribute('width', 2 * radius - 12);
        maskRect.setAttribute('height', ringLayer ? toPixels(getComputedStyle(ringLayer).minHeight) : 0);

        strokeSvg.setAttribute('viewBox', '0 0 ' + viewportWidth + ' ' + viewportHeight);
        strokeCircle.setAttribute('cx', centerX);
        strokeCircle.setAttribute('cy', displayedCenterY);
        strokeCircle.setAttribute('r', topBarIsFixed ? getFinalRadius(viewportWidth, viewportHeight) : radius);
        strokeCircle.style.opacity = topBarIsFixed ? 1 : 1 - Math.pow(transitionProgress, 3);

        // 更新所有线条
        updateLines(
            topBarIsFixed,
            viewportWidth,
            viewportHeight,
            centerX,
            displayedCenterY,
            topBarIsFixed ? getFinalRadius(viewportWidth, viewportHeight) : radius
        );
    }

    // setTopBarFixed, scheduleRingUpdate, window.__ring 等保持不变

    function setTopBarFixed(isFixed) {
        topBarIsFixed = Boolean(isFixed);
        if (!window.__pageLayout.isPaused()) {
            updateRing();
        }
    }

    window.__ring = {
        setTopBarFixed,
    };

    let ringFrame = null;
    function scheduleRingUpdate() {
        if (ringFrame !== null) return;
        ringFrame = requestAnimationFrame(function() {
            if (!window.__pageLayout.isPaused()) {
                updateRing();
            }
            ringFrame = null;
        });
    }

    window.__pageLayout.register(updateRing);
    window.addEventListener('scroll', scheduleRingUpdate, { passive: true });
    if (doc.readyState === 'loading') {
        doc.addEventListener('DOMContentLoaded', scheduleRingUpdate);
    } else {
        scheduleRingUpdate();
    }

})();