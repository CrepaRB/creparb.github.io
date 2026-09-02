(function() {
    'use strict';

    const desktopQuery = window.matchMedia('(min-width: 769px)');
    const capacityLists = document.querySelectorAll('.capacity-list');

    capacityLists.forEach(function(capacityList) {
        const lore = capacityList.nextElementSibling?.classList.contains('capacity-lore-for-pc')
            ? capacityList.nextElementSibling
            : null;
        const capacityCard = capacityList.parentElement;

        if (!lore || !capacityCard) return;

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

        capacityList.querySelectorAll('.capacity-card').forEach(function(card) {
            card.addEventListener('mouseenter', function() {
                if (desktopQuery.matches) showLore(card);
            });
        });

        capacityCard.addEventListener('mouseleave', function() {
            if (desktopQuery.matches) clearLore();
        });

        desktopQuery.addEventListener('change', function(event) {
            if (!event.matches) clearLore();
        });
    });
}());
