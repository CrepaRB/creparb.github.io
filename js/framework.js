(function() {
            'use strict';

                // 控制顶栏标题的缩放、位移，以及 sticky 状态同步。
            const hero = document.getElementById('hero');
            const topBar = document.getElementById('topBar');
            const topBarInner = topBar.querySelector('.top-bar-inner');
            const topBarTitleGroup = document.getElementById('topBarTitleGroup');
            const textPrimary = document.getElementById('textPrimary');
            const textSecondary = document.getElementById('textSecondary');
            const topBarBarrier = document.getElementById('topBarBarrier');
            const themeToggle = document.getElementById('themeToggle');

            // 可调参数集中放在这里，便于修改滚动过渡效果。
            const config = {
                textPrimaryBaseSize: 12,
                textPrimaryMinSize: 2.8,
                get heroHeight() {
                    return hero.offsetHeight;
                },
            };

            let scrollProgress = 0;
            let isRafScheduled = false;
            let adsorptionFrame = null;
            let lastScrollActivity = performance.now();
            let isAutoScrolling = false;
            let hasCheckedPageMovement = false;
            // 初始化滚动步长缓存
            let topBarAdsorptionFastSpeed = null

            // 进度从首屏居中状态过渡到顶栏左侧状态。
            function updateTextStyles(progress) {
                const p = Math.min(Math.max(progress, 0), 1);

                const sizeRange = config.textPrimaryBaseSize - config.textPrimaryMinSize;
                const currentSize = config.textPrimaryBaseSize - sizeRange * p;
                textPrimary.style.fontSize = `${currentSize}rem`;

                const groupStartLeft = topBarTitleGroup.offsetLeft;
                const innerCenter = topBarInner.clientWidth / 2;
                const primaryCenter = textPrimary.offsetLeft + textPrimary.offsetWidth / 2;
                const initialTranslate = innerCenter - (groupStartLeft + primaryCenter);
                const finalTranslate = -groupStartLeft;
                const currentTranslate = initialTranslate * (1 - p) + finalTranslate * p;
                topBarTitleGroup.style.transform = `translateX(${currentTranslate}px)`;

                const innerRect = topBarInner.getBoundingClientRect();
                const primaryRect = textPrimary.getBoundingClientRect();
                const secondaryRect = textSecondary.getBoundingClientRect();
                const barrierStart = primaryRect.left - innerRect.left;
                const barrierEnd = secondaryRect.right - innerRect.left + window.innerWidth * 0.5;
                const barrierLeft = barrierStart + (barrierEnd - barrierStart) * p;
                topBarBarrier.style.left = `${barrierLeft}px`;
            }

            function updateTopBarStuckState() {
                const rect = topBar.getBoundingClientRect();
                const isStuck = rect.top <= 0 && window.scrollY >= hero.offsetHeight - 1;

                if (isStuck) {
                    topBar.classList.add('is-stuck');
                } else {
                    topBar.classList.remove('is-stuck');
                }

                updateRingForTopBarState(isStuck);
            }

            // 将根元素中的像素或视口高度单位转换为像素值。
            function getRootLengthInPixels(propertyName) {
                const value = window.getComputedStyle(document.documentElement)
                    .getPropertyValue(propertyName).trim();
                const match = value.match(/^([+-]?(?:\d+\.?\d*|\.\d+))\s*(px|vh)$/i);
                if (!match) return 0;

                const amount = Number.parseFloat(match[1]);
                return match[2].toLowerCase() === 'vh'
                    ? amount * window.innerHeight / 100
                    : amount;
            }

            // 读取顶栏吸附开始生效的最大距离。
            function getTopBarAdsorptionDistance() {
                return getRootLengthInPixels('--top-bar-adsorption');
            }


            // 将根元素中的秒或毫秒时间转换为毫秒值。
            function getRootTimeInMilliseconds(propertyName) {
                const value = window.getComputedStyle(document.documentElement)
                    .getPropertyValue(propertyName).trim();
                const match = value.match(/^([+]?(?:\d+\.?\d*|\.\d+))\s*(ms|s)$/i);
                if (!match) return 0;

                const amount = Number.parseFloat(match[1]);
                return match[2].toLowerCase() === 's' ? amount * 1000 : amount;
            }

            // 根据总吸附距离和目标时长计算快速挡的每帧速度。
            function getTopBarAdsorptionFastSpeed(distance) {
                const duration = getRootTimeInMilliseconds('--top-bar-adsorption-fast-duration');
                if (duration < 2) return 2;

                return distance / (duration / 1000 * 60);
            }

            // 在页面静止后按剩余距离执行顶栏两挡速度吸附。
            function runTopBarAdsorption() {
                adsorptionFrame = null;

                if (window.__pageLayout.isPaused()) return;

                const distance = topBar.getBoundingClientRect().top;
                const adsorptionDistance = getTopBarAdsorptionDistance();
                if (distance <= 0 || distance > adsorptionDistance) {
                    topBarAdsorptionFastSpeed = null
                    return;
                }

                const scrollIdleDuration = performance.now() - lastScrollActivity;
                if (scrollIdleDuration >= 100 && !hasCheckedPageMovement) {
                    hasCheckedPageMovement = true;
                }

                if (scrollIdleDuration < 300) {
                    adsorptionFrame = window.requestAnimationFrame(runTopBarAdsorption);
                    return;
                }

                // 读取顶栏吸附切换到低速档的剩余距离。
                const speedSwitch = getRootLengthInPixels('--top-bar-adsorption-speed-switch');
                if (topBarAdsorptionFastSpeed === null) {
                    topBarAdsorptionFastSpeed = getTopBarAdsorptionFastSpeed(distance);
                }
                let scrollStep;
                if (distance > speedSwitch) {
                    scrollStep = topBarAdsorptionFastSpeed;
                } else if (distance <= 10) {
                    scrollStep = 2
                } else {
                    scrollStep = topBarAdsorptionFastSpeed / 2;
                }

                isAutoScrolling = true;
                window.scrollBy(0, scrollStep);
                window.requestAnimationFrame(function() {
                    isAutoScrolling = false;
                });
                adsorptionFrame = window.requestAnimationFrame(runTopBarAdsorption);
                //console.log(distance, scrollStep)
            }

            // 调度顶栏吸附帧，并在暂停期间保持停止状态。
            function scheduleTopBarAdsorption() {
                if (window.__pageLayout.isPaused() || adsorptionFrame !== null) return;
                adsorptionFrame = window.requestAnimationFrame(runTopBarAdsorption);
            }

            // 用户尝试滚动时立即取消当前吸附，并重新开始静止计时。
            function interruptTopBarAdsorption() {
                if (adsorptionFrame !== null) {
                    window.cancelAnimationFrame(adsorptionFrame);
                    adsorptionFrame = null;
                }
                isAutoScrolling = false;
                hasCheckedPageMovement = false;
                lastScrollActivity = performance.now();
            }

            function updateRingForTopBarState(isTopBarStuck) {
                window.__ring?.setTopBarFixed(isTopBarStuck);
            }

            function performUpdate() {
                if (window.__pageLayout.isPaused()) {
                    isRafScheduled = false;
                    return;
                }

                const scrollY = window.scrollY;
                const heroH = config.heroHeight;

                if (heroH > 0) {
                    scrollProgress = scrollY / heroH;
                } else {
                    scrollProgress = 0;
                }

                updateTextStyles(scrollProgress);
                updateTopBarStuckState();
                scheduleTopBarAdsorption();
                isRafScheduled = false;
            }

                // 用 requestAnimationFrame 合并同一帧内的滚动更新。
            function handleScroll() {
                if (window.__pageLayout.isPaused()) return;
                if (!isAutoScrolling) lastScrollActivity = performance.now();
                if (!isRafScheduled) {
                    isRafScheduled = true;
                    window.requestAnimationFrame(performUpdate);
                }
            }

            function updateFrameworkLayout() {
                performUpdate();
            }

            window.__pageLayout.register(updateFrameworkLayout);

            let lastWidth = window.innerWidth;
            let lastHeight = window.innerHeight;
            let updateTimer = null;
            const rootStyles = getComputedStyle(document.documentElement);
            const breakpoint = parseInt(rootStyles.getPropertyValue('--wire-breakpoint'), 10) || 768;
            function initialize() {
                performUpdate();

                window.addEventListener('scroll', handleScroll, { passive: true });
                window.addEventListener('wheel', interruptTopBarAdsorption, { passive: true });
                window.addEventListener('touchstart', interruptTopBarAdsorption, { passive: true });
                window.addEventListener('touchmove', interruptTopBarAdsorption, { passive: true });
                window.addEventListener('keydown', function(event) {
                    const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
                    if (scrollKeys.includes(event.key)) interruptTopBarAdsorption();
                });
                window.addEventListener('resize', function () {
                    const newWidth = window.innerWidth;
                    const newHeight = window.innerHeight;
                    const widthChanged = newWidth !== lastWidth;
                    const heightChanged = newHeight !== lastHeight;

                    // 没有任何变化则直接返回
                    if (!widthChanged && !heightChanged) return;

                    // 以当前宽度判断移动端
                    const isMobile = newWidth <= breakpoint;
                    // 移动端：宽/高变化均不显示遮罩，只刷新布局
                    if (isMobile) {
                        clearTimeout(updateTimer);
                        updateTimer = setTimeout(() => {
                            window.__pageLayout.update(); // 直接更新，无遮罩
                        }, 50); // 防抖延迟，防止高频触发
                    } else {
                        window.__pageLayout.pause(300);
                    }

                    // 更新记录值
                    lastWidth = newWidth;
                    lastHeight = newHeight;
                }, { passive: true });

                if (window.scrollY > 0) {
                    handleScroll();
                }

                console.log('[框架] 初始化完成');
                console.log('[框架] Hero 高度:', config.heroHeight, 'px');
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initialize);
            } else {
                initialize();
            }

                // 保留调试接口，便于检查滚动进度和顶栏状态。
            window.__framework = {
                config: config,
                getScrollProgress: () => scrollProgress,
                updateTextStyles: updateTextStyles,
                updateTopBarStuckState: updateTopBarStuckState,
                elements: {
                    hero,
                    topBar,
                    textPrimary,
                    textSecondary,
                },
            };

        })();
