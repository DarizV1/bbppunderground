// ==UserScript==
// @name         DROPDOWN - Counter
// @namespace    http://tampermonkey.net/
// @version      2.4
// @description  LGU counts + color coding, Excel-ready copy, and Sport dropdown counts that switch between GLOBAL (LGU=All) and FILTERED (LGU=specific). Robust to DataTable re-inits.
// @author       Dariz Villarba
// @match        https://bp.psc.games/admin/index.php*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/counter.js
// @downloadURL  https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/counter.js
// ==/UserScript==

(function () {
  'use strict';

  const TABLE_SEL = '#list';
  let dt = null;
  let tableElem = null;
  let lguIdx = -1, sportIdx = -1;
  let baselineCounts = {};
  let hooksAttached = false;

  const normalize = (text) =>
    (text || '')
      .replace(/\(\d+\)/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

  function textContentFromHtml(html) {
    if (html == null) return '';
    if (typeof html !== 'string') return String(html).trim();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  function findColumnIndexByHeaderText(tableElem, headerName) {
    const ths = tableElem.querySelectorAll('thead th');
    for (let i = 0; i < ths.length; i++) {
      const t = ths[i].textContent.replace(/\s+/g, ' ').trim().toLowerCase();
      if (t === headerName.toLowerCase()) return i;
    }
    return -1;
  }

  function getColorForCount(count) {
    if (count === 0) return '#d32f2f';
    if (count <= 50) return '#ef6c00';
    if (count <= 100) return '#1565c0';
    return '#2e7d32';
  }

  function updateDropdownWithCounts(counts) {
    const select = document.querySelector('#lguFilter');
    if (!select) return;

    Array.from(select.options).forEach((opt) => {
      const base = (opt.dataset.baseText ||
        opt.textContent ||
        opt.value ||
        '').replace(/\(\d+\)/g, '').trim();

      opt.dataset.baseText = base;

      if (normalize(base) === 'all' || base === '') {
        opt.textContent = 'All';
        opt.style.color = '';
        return;
      }

      const key = normalize(base);
      const count = counts[key] || 0;
      opt.textContent = `${base} (${count})`;
      opt.style.color = getColorForCount(count);
    });
  }

  function computeBaselineCounts(dt, tableElem, lguIdx) {
    const counts = {};
    if (!dt || !tableElem || lguIdx === -1) return counts;

    let values = [];
    try {
      values = dt.column(lguIdx, { search: 'none', order: 'index' }).data().toArray();
    } catch (_) { values = []; }

    if (!values || values.length === 0) {
      try {
        const rows = dt.rows().data().toArray();
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          let cellVal = '';
          if (Array.isArray(row)) {
            cellVal = textContentFromHtml(row[lguIdx]);
          } else if (typeof row === 'object' && row !== null) {
            const col = dt.settings()[0].aoColumns[lguIdx];
            const prop = col && col.mData;
            cellVal = textContentFromHtml(prop ? row[prop] : '');
          } else if (typeof row === 'string') {
            const tmp = document.createElement('tbody');
            tmp.innerHTML = row;
            const td = tmp.querySelector(`td:nth-child(${lguIdx + 1})`);
            cellVal = td ? td.textContent.trim() : '';
          }
          values.push(cellVal);
        }
      } catch (_) {}
    }

    if (!values || values.length === 0) {
      const trs = tableElem.querySelectorAll('tbody tr');
      trs.forEach((tr) => {
        const td = tr.querySelector(`td:nth-child(${lguIdx + 1})`);
        if (td) values.push(td.textContent.trim());
      });
    }

    for (let i = 0; i < values.length; i++) {
      const k = normalize(textContentFromHtml(values[i]));
      if (!k) continue;
      counts[k] = (counts[k] || 0) + 1;
    }

    return counts;
  }

  // Excel-ready copy (LGU, Count)
  function addCopyButton() {
    const select = document.querySelector('#lguFilter');
    if (!select) return;
    if (document.querySelector('#copyLguBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'copyLguBtn';
    btn.textContent = 'Copy LGUs';
    btn.className = 'btn btn-sm btn-outline-secondary ml-2';

    btn.addEventListener('click', () => {
      const rows = [["LGU","Total Athletes"]];
      Array.from(select.options).forEach((opt) => {
        const txt = opt.dataset.baseText || opt.textContent.trim();
        if (normalize(txt) !== 'all' && txt !== '') {
          const count = (opt.textContent.match(/\((\d+)\)/)?.[1]) || "0";
          rows.push([txt.replace(/\s*\(\d+\)$/,''), count]);
        }
      });
      const out = rows.map(r => r.join("\t")).join("\n");
      navigator.clipboard.writeText(out).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy LGUs', 1500);
      });
    });

    select.parentNode.insertBefore(btn, select.nextSibling);
  }

  // Sport dropdown counts: GLOBAL when LGU=All, FILTERED when LGU=specific
  function updateSportDropdownCounts(dt, sportIdx) {
    const sportSel = document.querySelector('#sportFilter');
    const lguSel = document.querySelector('#lguFilter');
    if (!sportSel || sportIdx === -1 || !dt) return;

    // reset labels to base text
    Array.from(sportSel.options).forEach(opt => {
      if (!opt.dataset.baseText) {
        opt.dataset.baseText = opt.textContent.replace(/\(\d+\)/g, '').trim();
      }
      opt.textContent = opt.dataset.baseText;
    });

    // figure out if LGU is All
    const lguValRaw = lguSel
      ? (lguSel.value || (lguSel.options[lguSel.selectedIndex]?.text || ''))
      : '';
    const lguNorm = normalize(lguValRaw);
    const isAll = (lguNorm === '' || lguNorm === 'all');
    const rowScope = { search: isAll ? 'none' : 'applied' }; // GLOBAL vs FILTERED

    // count sports
    const sportCounts = {};
    dt.rows(rowScope).every(function () {
      const row = this.data();
      const sport = textContentFromHtml(Array.isArray(row) ? row[sportIdx] : row?.[sportIdx] ?? row);
      if (!sport) return;
      const key = normalize(sport);
      sportCounts[key] = (sportCounts[key] || 0) + 1;
    });

    // update dropdown labels
    Array.from(sportSel.options).forEach(opt => {
      const base = opt.dataset.baseText;
      if (normalize(base) === 'all' || base === '') {
        opt.textContent = 'All';
        return;
      }
      const count = sportCounts[normalize(base)] || 0;
      opt.textContent = `${base} (${count})`;
    });
  }

  // attach filter hooks once (re-used across re-inits)
  function attachFilterHooksOnce() {
    if (hooksAttached) return;
    hooksAttached = true;
    ['#clusterFilter', '#lguFilter', '#sportFilter', '#exFilter'].forEach((id) => {
      const sel = document.querySelector(id);
      if (sel) {
        sel.addEventListener('change', () => {
          if (!dt) return;
          updateDropdownWithCounts(baselineCounts);
          updateSportDropdownCounts(dt, sportIdx);
        });
      }
    });
  }

  function onInit(api) {
    dt = api;
    tableElem = document.querySelector(TABLE_SEL);
    lguIdx = findColumnIndexByHeaderText(tableElem, 'lgu');
    sportIdx = findColumnIndexByHeaderText(tableElem, 'sport');

    baselineCounts = computeBaselineCounts(dt, tableElem, lguIdx);
    updateDropdownWithCounts(baselineCounts);
    addCopyButton();
    updateSportDropdownCounts(dt, sportIdx);
    attachFilterHooksOnce();
  }

  function attachDataTableDelegates() {
    // re-init safe: bind to table element, not a specific instance
    $(document).on('init.dt', TABLE_SEL, function (e, settings) {
      const api = new $.fn.dataTable.Api(settings);
      onInit(api);
    });

    $(document).on('xhr.dt', TABLE_SEL, function () {
      if (!dt) return;
      baselineCounts = computeBaselineCounts(dt, tableElem, lguIdx);
      updateDropdownWithCounts(baselineCounts);
      updateSportDropdownCounts(dt, sportIdx);
    });

    $(document).on('draw.dt', TABLE_SEL, function () {
      if (!dt) return;
      updateDropdownWithCounts(baselineCounts);
      updateSportDropdownCounts(dt, sportIdx);
    });
  }

  function bootstrap() {
    if (!(window.jQuery && $.fn && $.fn.dataTable)) return;
    attachDataTableDelegates();

    // If table is already initialized, run once now
    if ($.fn.dataTable.isDataTable(TABLE_SEL)) {
      const api = new $.fn.dataTable.Api($(TABLE_SEL).DataTable().settings()[0]);
      onInit(api);
    }
  }

  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (window.jQuery && $.fn && $.fn.dataTable) {
      clearInterval(t);
      bootstrap();
    }
    if (tries >= 40) clearInterval(t);
  }, 250);
})();
