// ==UserScript==
// @name         BP Remarks Tab Select All
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds a larger Select All checkbox in the Remarks tab table header
// @author       Dariz Villarba
// @match        https://bp.psc.games/admin/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/DarizV1/bbppunderground/main/selectAllFunction.js
// @downloadURL  https://raw.githubusercontent.com/DarizV1/bbppunderground/main/selectAllFunction.js
// ==/UserScript==

(function() {
    'use strict';

    const tabSelector = '#custom-tabs-one-remarks';

    function addSelectAllCheckbox() {
        const tab = document.querySelector(tabSelector);
        if (!tab) return;

        const table = tab.querySelector('table');
        if (!table) return;

        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        if (!thead || !tbody) return;

        const receivedHeader = thead.querySelectorAll('th')[2]; // 3rd column
        if (!receivedHeader || receivedHeader.querySelector('#select-all-checkbox')) return;

        // Create a larger Select All checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'select-all-checkbox';
        checkbox.title = 'Select/Unselect all';
        checkbox.style.transform = 'scale(1.5)'; // Makes it bigger
        checkbox.style.marginLeft = '8px';
        checkbox.style.cursor = 'pointer';

        // Add label and checkbox
        receivedHeader.textContent = 'Received ';
        receivedHeader.appendChild(checkbox);

        checkbox.addEventListener('change', () => {
            const rowCheckboxes = tbody.querySelectorAll('input[name="document"]');
            rowCheckboxes.forEach(cb => cb.checked = checkbox.checked);
        });
    }

    // Check periodically until the tab is loaded
    const interval = setInterval(() => {
        const tab = document.querySelector(tabSelector);
        if (tab) {
            addSelectAllCheckbox();
            clearInterval(interval);
        }
    }, 500);

})();
