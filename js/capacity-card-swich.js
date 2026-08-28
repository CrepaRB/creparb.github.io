(function() {
    'use strict';

    const capacityList = document.getElementById('capacity-list');
    const lore = document.getElementById('capacity-lore-for-pc');

    if (!capacityList || !lore) return;

    const desktopQuery = window.matchMedia('(min-width: 769px)');
    let clearTimer = null;

    function clearLore() {
        lore.classList.remove('is-visible');
        clearTimeout(clearTimer);
        clearTimer = setTimeout(function() {
            lore.classList.remove('card-desc');
            lore.textContent = '';
        }, 350);
    }

    function showLore(card) {
        clearTimeout(clearTimer);

        const description = card.querySelector('.card-desc');
        if (!description) return;

        lore.classList.add('card-desc');
        lore.innerHTML = description.innerHTML;
        lore.classList.add('is-visible');
    }

    function bindDesktopHover() {
        capacityList.querySelectorAll('.capacity-card').forEach(function(card) {
            card.addEventListener('mouseenter', function() {
                if (desktopQuery.matches) showLore(card);
            });
            card.addEventListener('mouseleave', function() {
                if (desktopQuery.matches) clearLore();
            });
        });
    }

    desktopQuery.addEventListener('change', function(event) {
        if (!event.matches) clearLore();
    });

    bindDesktopHover();
}());