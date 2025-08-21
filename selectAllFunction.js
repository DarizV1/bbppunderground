// ==UserScript==
// @name         BP Remarks Tab Select All
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a Select All checkbox in the Remarks tab table header
// @match        https://bp.psc.games/admin/*
// @grant        none
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

        const headerCells = thead.querySelectorAll('th');
        if (headerCells.length < 3) return;

        const receivedHeader = headerCells[2]; // 3rd column
        if (receivedHeader.querySelector('#select-all-checkbox')) return; // Already added

        // Create Select All checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'select-all-checkbox';
        checkbox.style.marginLeft = '5px';
        checkbox.title = 'Select/Unselect all';

        // Put checkbox inside header
        receivedHeader.textContent = 'Received ';
        receivedHeader.appendChild(checkbox);

        checkbox.addEventListener('change', () => {
            const rowCheckboxes = tbody.querySelectorAll('input[name="document"]');
            rowCheckboxes.forEach(cb => cb.checked = checkbox.checked);
        });
    }

    // Wait for the tab to load
    function waitForTab() {
        const tab = document.querySelector(tabSelector);
        if (tab) {
            addSelectAllCheckbox();
        } else {
            setTimeout(waitForTab, 500);
        }
    }

    waitForTab();

})();
