// ==UserScript==
// @name         DROPDOWN - Counter
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Stable LGU counts with color coding (red=0, orange=1-50, blue=51-100, green=101+) and copy-to-clipboard button.
// @match        https://bp.psc.games/admin/index.php*
// @author       Dariz Villarba
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/counter.js
// @downloadURL  https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/counter.js
// ==/UserScript==

(function () {
  'use strict';

  const normalize = (text) =>
    (text || '').replace(/\(\d+\)/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

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
    if (count === 0) return '#d32f2f';     // red
    if (count >= 1 && count <= 50) return '#ef6c00';  // dark orange
    if (count >= 51 && count <= 100) return '#1565c0'; // navy blue
    return '#2e7d32'; // dark green
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

  function computeBaselineCounts(dt, tableElem) {
    const counts = {};
    if (!dt || !tableElem) return counts;

    const lguIdx = findColumnIndexByHeaderText(tableElem, 'lgu');
    if (lguIdx === -1) return counts;

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

  // Add button for copy-paste to Excel
  function addCopyButton(counts) {
    const select = document.querySelector('#lguFilter');
    if (!select) return;

    if (document.querySelector('#copyLguBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'copyLguBtn';
    btn.textContent = 'Copy LGUs';
    btn.style.marginLeft = '8px';
    btn.style.padding = '4px 8px';
    btn.style.border = '1px solid #444';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.style.background = '#f5f5f5';

    btn.addEventListener('click', () => {
      let rows = [];
      Array.from(select.options).forEach((opt) => {
        const txt = opt.textContent.trim();
        if (txt.toLowerCase() !== 'all') {
          rows.push(txt.replace(/\s*\(\d+\)$/, '') + "\t" + (txt.match(/\((\d+)\)/)?.[1] || '0'));
        }
      });
      const out = rows.join("\n");
      navigator.clipboard.writeText(out).then(() => {
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy LGUs', 1500);
      });
    });

    select.parentNode.insertBefore(btn, select.nextSibling);
  }

  let dt = null;
  let baselineCounts = {};
  const TABLE_SEL = '#list';

  function init() {
    if (!(window.jQuery && $.fn && $.fn.dataTable)) return;
    if (!$.fn.dataTable.isDataTable(TABLE_SEL)) return;

    const tableElem = document.querySelector(TABLE_SEL);
    if (!tableElem) return;

    dt = $(TABLE_SEL).DataTable();

    baselineCounts = computeBaselineCounts(dt, tableElem);
    updateDropdownWithCounts(baselineCounts);
    addCopyButton(baselineCounts);

    dt.on('xhr.dt', () => {
      baselineCounts = computeBaselineCounts(dt, tableElem);
      updateDropdownWithCounts(baselineCounts);
    });

    dt.on('draw.dt', () => {
      updateDropdownWithCounts(baselineCounts);
    });

    ['#clusterFilter', '#lguFilter', '#sportFilter', '#exFilter'].forEach((id) => {
      const sel = document.querySelector(id);
      if (sel) {
        sel.addEventListener('change', () => updateDropdownWithCounts(baselineCounts));
      }
    });
  }

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    if (window.jQuery && $.fn && $.fn.dataTable && $.fn.dataTable.isDataTable(TABLE_SEL)) {
      clearInterval(timer);
      init();
      return;
    }
    if (tries >= 20) clearInterval(timer);
  }, 400);
})();
