(function() {
    'use strict';

    // 统一管理主题、布局更新器和尺寸变化时的短暂暂停。

    let pagePaused = false;
    let pauseTimer = null;
    let pauseCloseTimer = null;
    const layoutUpdaters = [];

    const themeStorageKey = 'resume-theme';
    const themeToggle = document.getElementById('themeToggle');
    const existingTheme = document.body.dataset.theme;
    const savedTheme = window.localStorage.getItem(themeStorageKey);
    let currentTheme = existingTheme === 'light' || existingTheme === 'dark'
        ? existingTheme
        : savedTheme === 'light' || savedTheme === 'dark'
            ? savedTheme
        : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    function updateThemeButton() {
        const isDark = currentTheme === 'dark';
        document.body.dataset.theme = currentTheme;
        themeToggle.innerHTML = `<i class="fas fa-${isDark ? 'sun' : 'moon'}" aria-hidden="true" position="absolute"></i>`;
        themeToggle.setAttribute('aria-label', isDark ? '切换到日间模式' : '切换到夜间模式');
        themeToggle.setAttribute('aria-pressed', String(isDark));
    }

    updateThemeButton();

    themeToggle.addEventListener('click', function() {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        window.localStorage.setItem(themeStorageKey, currentTheme);
        updateThemeButton();
        window.__pageLayout.update();
    });

    window.__pageLayout = {
        register: function(updater) {
            layoutUpdaters.push(updater);
        },
        update: function() {
            if (pagePaused) return;
            layoutUpdaters.forEach(function(updater) { updater(); });
        },
        isPaused: function() {
            return pagePaused;
        }
    };

    // 尺寸变化期间暂停布局更新，稳定后统一刷新并关闭遮罩。
    window.__pageLayout.pause = function pausePage(duration) {
        const pauseScreen = document.getElementById('pause-screen');
        const shouldAnimate = pauseScreen.hidden && !pauseScreen.classList.contains('is-closing');
        const wasClosing = pauseScreen.classList.contains('is-closing');

        pagePaused = true;
        clearTimeout(pauseTimer);
        clearTimeout(pauseCloseTimer);
        pauseScreen.classList.remove('is-closing');
        pauseScreen.hidden = false;

        if (shouldAnimate || wasClosing) {
            pauseScreen.classList.remove('is-entering');
            requestAnimationFrame(function() {
                if (pagePaused && !pauseScreen.hidden) {
                    pauseScreen.classList.add('is-entering');
                }
            });
        }

        pauseTimer = setTimeout(function() {
            pagePaused = false;
            pauseScreen.classList.add('is-closing');
            window.__pageLayout.update();
            pauseCloseTimer = setTimeout(function() {
                pauseScreen.hidden = true;
                pauseScreen.classList.remove('is-closing', 'is-entering');
            }, 300);
        }, Math.max(0, duration));
    };

    window.__pageLayout.pause(500);
    window.scrollBy(-10, 0);
}());