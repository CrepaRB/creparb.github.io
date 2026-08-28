(function() {
            'use strict';

            // 生成分层线框，并在滚动和尺寸变化时更新其视差位置。

            const wireRegistry = {
                'elements-mobile': [
                    { id: 'wire_001', x: -0.1, y: 0.1, depth: 0 },
                    { id: 'wire_002', x: 0.85, y: 0, depth: 3 },
                    { id: 'wire_003', x: 0.55, y: 0.4, depth: 12 },
                    { id: 'wire_004', x: 0.35, y: 0.65, depth: 7 }
                ],
                'elements-pc': [
                    { id: 'wire_001', x: -0.02, y: 0.25, depth: 0 },
                    { id: 'wire_002', x: 0.87, y: 0.1, depth: 3 },
                    { id: 'wire_003', x: 0.52, y: 0.55, depth: 10 },
                    { id: 'wire_004', x: 0.95, y: 0.7, depth: 5 }
                ]
            };

            const initialViewport = { height: window.innerHeight };
            const wires = [];
            const runtimeRegistry = { elements: [] };
            const welcomeDecoration = document.querySelector('.hero-decoration');
            const welcomeTitle = document.querySelector('.hero-title');
            let currentLayout;
            let lastWidth = window.innerWidth;
            let scrollFrame = null;

            function getCssNumber(name) {
                return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
            }

            function getCssValue(name) {
                return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
            }

            function getLayout() {
                return window.innerWidth <= getCssNumber('--wire-breakpoint') ? 'mobile' : 'pc';
            }

            function generateWireRegistry(layout) {
                const source = wireRegistry['elements-' + layout];
                const count = getCssNumber('--wire-' + layout + '-layer-count');
                const repeatGap = layout === 'pc' ? getCssNumber('--wire-pc-repeat-gap') / 100 : 0;
                const result = [];

                // 每一层复用同一组线框，通过 y 偏移形成纵深。
                for (let layer = 0; layer < count; layer += 1) {
                    source.forEach(function(item) {
                        result.push({
                            id: item.id + '_layer_' + layer,
                            x: item.x,
                            y: item.y + layer * (1 + repeatGap),
                            depth: item.depth,
                            layout: layout
                        });
                    });
                }

                return result;
            }

            class DepthWireFrame {
                constructor(data) {
                    this.data = data;
                    this.svg = document.getElementById('wire-template').content.firstElementChild.cloneNode(true);
                    this.svg.style.setProperty('--wire-depth-zero-color', getCssValue('--wire-' + data.layout + '-depth-zero-color'));
                    this.svg.style.setProperty('--wire-depth-zero-line-width', getCssValue('--wire-' + data.layout + '-depth-zero-line-width'));
                    this.svg.style.zIndex = 100 - data.depth;
                    document.getElementById('wire-layer').appendChild(this.svg);
                    this.progress = 0;
                    this.lines = Array.from(this.svg.querySelectorAll('.st0'));
                    this.prepareDraw();
                    this.resize();
                    this.animateDraw();
                }

                get scale() {
                    return 1 / (1 + this.data.depth * 0.12);
                }

                get brightness() {
                    return Math.max(15, 100 - this.data.depth * 6);
                }

                get movementFactor() {
                    const maxDepth = getCssNumber('--max-depth');
                    if (maxDepth <= 0) return 0;
                    const motionDepth = Math.min(Math.max(this.data.depth, 0), maxDepth);
                    return 1 - motionDepth / maxDepth;
                }

                get entryMovementFactor() {
                    const maxDepth = getCssNumber('--max-depth');
                    if (maxDepth <= 0) return 0;
                    const motionDepth = Math.min(Math.max(this.data.depth, 0), maxDepth);
                    const perspectiveCoefficient = 0.12;
                    const perspectiveScale = 1 / (1 + motionDepth * perspectiveCoefficient);
                    const maxDepthScale = 1 / (1 + maxDepth * perspectiveCoefficient);
                    // 将不同深度映射到统一的入场位移范围。
                    return (perspectiveScale - maxDepthScale) / (1 - maxDepthScale);
                }

                get entryDistance() {
                    return getCssNumber('--wire-in-distance') * this.entryMovementFactor;
                }

                get entryOffset() {
                    const remainingProgress = 1 - this.progress;
                    return this.entryDistance * remainingProgress * remainingProgress;
                }

                get depthZeroScale() {
                    return getCssNumber('--wire-' + this.data.layout + '-depth-zero-scale');
                }

                resize() {
                    this.centerX = window.innerWidth * this.data.x;
                    this.centerY = initialViewport.height * this.data.y;
                    const size = window.innerWidth / 2 * this.depthZeroScale * this.scale;
                    this.svg.style.width = size + 'px';
                    this.svg.style.height = size + 'px';
                    this.svg.style.left = this.centerX - size / 2 + 'px';
                    this.svg.style.top = this.centerY - size / 2 + 'px';
                    this.svg.style.filter = 'brightness(' + this.brightness + '%)';
                    this.draw();
                    this.updatePosition();
                }

                updatePosition(scrollY) {
                    const currentScrollY = scrollY === undefined ? window.scrollY : scrollY;
                    const parallaxOffset = -currentScrollY * this.movementFactor;
                    this.svg.style.transform = 'translateY(' + (parallaxOffset + this.entryOffset) + 'px)';
                }

                prepareDraw() {
                    this.lines.forEach(function(line) {
                        const length = line.getTotalLength();
                        line.dataset.length = length;
                        line.style.strokeDasharray = length;
                        line.style.strokeDashoffset = length;
                    });
                }

                animateDraw() {
                    let previousTime = performance.now();
                    const duration = 1000;
                    const frame = (now) => {
                        if (!window.__pageLayout.isPaused()) {
                            this.progress = Math.min(1, this.progress + (now - previousTime) / duration);
                            this.draw();
                            this.updatePosition();
                        }
                        previousTime = now;
                        if (this.progress < 1) {
                            requestAnimationFrame(frame);
                        }
                    };
                    requestAnimationFrame(frame);
                }

                draw() {
                    this.lines.forEach(function(line) {
                        line.style.strokeDashoffset = line.dataset.length * (1 - this.progress);
                    }, this);
                }
            }

            function drawLayout(layout) {
                wires.forEach(function(wire) { wire.svg.remove(); });
                wires.length = 0;
                runtimeRegistry.elements = generateWireRegistry(layout);
                runtimeRegistry.elements.forEach(function(data) {
                    wires.push(new DepthWireFrame(data));
                });
                currentLayout = layout;
            }

            function updateWireLayout() {
                const nextLayout = getLayout();
                if (nextLayout !== currentLayout) {
                    drawLayout(nextLayout);
                } else {
                    wires.forEach(function(wire) { wire.resize(); });
                }
                updateWelcomePosition(window.scrollY);
            }

            function updateWelcomePosition(scrollY) {
                if (!welcomeDecoration || !welcomeTitle) return;
                const currentScrollY = scrollY === undefined ? window.scrollY : scrollY;
                welcomeDecoration.style.transform = 'translateY(' + -currentScrollY + 'px)';
                welcomeTitle.style.transform = 'translateY(' + -currentScrollY + 'px)';
            }

            window.__pageLayout.register(updateWireLayout);

            function initialize() {
                drawLayout(getLayout());
                updateWelcomePosition();

                window.addEventListener('scroll', function() {
                    if (window.__pageLayout.isPaused() || scrollFrame !== null) return;
                    scrollFrame = requestAnimationFrame(function() {
                        if (!window.__pageLayout.isPaused()) {
                            wires.forEach(function(wire) { wire.updatePosition(window.scrollY); });
                            updateWelcomePosition(window.scrollY);
                        }
                        scrollFrame = null;
                    });
                }, { passive: true });
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initialize);
            } else {
                initialize();
            }
        }());
