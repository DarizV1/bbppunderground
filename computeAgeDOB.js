// ==UserScript==
// @name         Compute Age by Birth Year (BP Admin) + Formatted DOB (Custom Display) — Fixed
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Formats DOB as "January 05, 2010 | 01 / 05 / 2010" and Age as "15 | Age by Birth Year : 15" with improved performance, stability, and better display for BP Admin. Highlights key data in bold and color for clarity.
// @author       Dariz Villarba
// @match        https://bp.psc.games/admin/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/DarizV1/bbppunderground/main/computeAgeDOB.js
// @downloadURL  https://raw.githubusercontent.com/DarizV1/bbppunderground/main/computeAgeDOB.js
// ==/UserScript==
(function() {
    'use strict';

    function pad(n){ return n < 10 ? '0' + n : '' + n; }
    const monthNames = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ];

    function parseDateFromString(s) {
        if (!s) return null;
        s = s.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
        if (!s) return null;

        let m = s.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

        const monthMap = {
            jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
            jul:6, aug:7, sep:8, sept:8, oct:9, nov:10, dec:11
        };
        m = s.match(/(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[\.,]?\s+(\d{1,2})(?:,)?\s+(\d{4})/i);
        if (m) {
            const mm = monthMap[m[1].slice(0,3).toLowerCase()];
            return new Date(+m[3], mm, +m[2]);
        }

        m = s.match(/(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?,?\s+(\d{4})/i);
        if (m) {
            const mm = monthMap[m[2].slice(0,3).toLowerCase()];
            return new Date(+m[3], mm, +m[1]);
        }

        m = s.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
        if (m) {
            const a = +m[1], b = +m[2], y = +m[3];
            if (a > 12) return new Date(y, b - 1, a);
            return new Date(y, a - 1, b);
        }

        const parsed = Date.parse(s);
        if (!isNaN(parsed)) return new Date(parsed);

        return null;
    }

    function injectStyles() {
        if (document.getElementById('tm-dob-age-styles')) return;
        const style = document.createElement('style');
        style.id = 'tm-dob-age-styles';
        style.textContent = `
            .dob-long { margin-right: 6px; }
            .dob-sep, .age-sep { margin: 0 6px; color: #888; }
            .dob-numeric { font-weight: 700; color: blue; }
            .age-by-year { font-weight: 700; color: red; }
            .age-original { font-weight: 600; }
        `;
        document.head.appendChild(style);
    }

    // Helper to get a cell's original textual content (and cache it)
    function getCellOriginalText(valCell) {
        // If there is an input/select inside, prefer its value (don't overwrite interactive cells)
        const interactive = valCell.querySelector('input, textarea, select, button, a');
        if (interactive) {
            // return live value if available, but do not cache to avoid stale content
            const input = valCell.querySelector('input, textarea, select');
            return input ? (input.value || '').trim() : valCell.textContent.trim();
        }

        if (valCell.dataset.original !== undefined) return valCell.dataset.original;
        const txt = valCell.textContent.trim();
        valCell.dataset.original = txt;
        return txt;
    }

    let observer = null;
    let updateTimer = null;
    const DEBOUNCE_MS = 180;

    function updateRows() {
        // disconnect while updating to avoid observer loops
        if (observer) observer.disconnect();

        try {
            injectStyles();

            const rows = document.querySelectorAll('#custom-tabs-one-profile table tbody tr');
            if (!rows || rows.length === 0) return;

            let dobRow = null;
            let ageRow = null;
            rows.forEach(row => {
                const labelCell = row.querySelector('td:first-child');
                if (!labelCell) return;
                const labelText = labelCell.textContent.replace(/\s+/g,' ').trim();
                if (/Date of Birth/i.test(labelText)) dobRow = row;
                if (/^Age\b/i.test(labelText) || /\bAge\b/i.test(labelText)) ageRow = row;
            });

            // Process DOB row
            let parsedDate = null;
            if (dobRow) {
                const valCell = dobRow.querySelector('td:last-child');
                if (valCell) {
                    // Skip if interactive elements present (to avoid breaking inputs/buttons)
                    if (valCell.querySelector('input, textarea, select, button, a')) {
                        // keep live value & continue (do not overwrite)
                        const live = getCellOriginalText(valCell);
                        // try parsing from live value but do not mutate DOM
                        parsedDate = parseDateFromString(live);
                    } else {
                        const raw = getCellOriginalText(valCell);
                        parsedDate = parseDateFromString(raw);

                        // Avoid re-rendering if nothing changed
                        const lastRaw = valCell.dataset.lastRenderedRaw || '';
                        if (parsedDate) {
                            // compute formats
                            const mm = parsedDate.getMonth();
                            const dd = parsedDate.getDate();
                            const yy = parsedDate.getFullYear();
                            const longFmt = `${monthNames[mm]} ${pad(dd)}, ${yy}`;
                            const numericFmt = `${pad(mm + 1)} / ${pad(dd)} / ${yy}`;
                            const composed = longFmt + ' | ' + numericFmt;

                            if (lastRaw !== composed) {
                                valCell.innerHTML = '';
                                const spanLong = document.createElement('span');
                                spanLong.className = 'dob-long';
                                spanLong.textContent = longFmt;

                                const sep = document.createElement('span');
                                sep.className = 'dob-sep';
                                sep.textContent = ' | ';

                                const spanNumeric = document.createElement('span');
                                spanNumeric.className = 'dob-numeric';
                                spanNumeric.textContent = numericFmt;

                                valCell.appendChild(spanLong);
                                valCell.appendChild(sep);
                                valCell.appendChild(spanNumeric);

                                valCell.dataset.lastRenderedRaw = composed;
                                valCell.dataset.original = raw; // keep original cached for future diffing
                                valCell.dataset.birthyear = yy;
                            }
                        } else {
                            // if we can't parse, don't overwrite original content; but keep dataset.original
                            valCell.dataset.original = raw;
                        }
                    }
                }
            }

            // Process Age row
            if (ageRow) {
                const valCell = ageRow.querySelector('td:last-child');
                if (valCell) {
                    // If interactive, skip DOM overwrite (but compute age-by-year if possible)
                    const interactive = !!valCell.querySelector('input, textarea, select, button, a');
                    const raw = getCellOriginalText(valCell);

                    // Extract original age number
                    const ageMatch = raw.match(/\b(\d{1,3})\b/);
                    const originalAge = ageMatch ? ageMatch[1] : raw;

                    // Determine birth year: prefer explicit stored birthyear from DOB cell
                    let birthYear = null;
                    if (dobRow) {
                        const dobValCell = dobRow.querySelector('td:last-child');
                        if (dobValCell && dobValCell.dataset.birthyear) birthYear = parseInt(dobValCell.dataset.birthyear, 10);
                        else {
                            // fallback: try to find year in the raw DOB text
                            const m = raw.match(/\b(19|20)\d{2}\b/);
                            if (m) birthYear = parseInt(m[0], 10);
                        }
                    }

                    let ageByYearText = null;
                    if (birthYear) {
                        const currentYear = new Date().getFullYear();
                        const ageByYear = currentYear - birthYear;
                        ageByYearText = `Age by Birth Year : ${ageByYear}`;
                    } else {
                        // fallback to any existing "Age by Birth Year" mention in the raw
                        const m = raw.match(/Age by Birth Year\s*[:\-]?\s*(\d{1,3})/i);
                        if (m) ageByYearText = `Age by Birth Year : ${m[1]}`;
                    }

                    if (!interactive) {
                        // Avoid re-rendering if nothing changed
                        const lastRendered = valCell.dataset.lastRenderedAge || '';
                        const composedAge = originalAge + (ageByYearText ? ' | ' + ageByYearText : '');
                        if (lastRendered !== composedAge) {
                            valCell.innerHTML = '';

                            const spanOrig = document.createElement('span');
                            spanOrig.className = 'age-original';
                            spanOrig.textContent = originalAge;
                            valCell.appendChild(spanOrig);

                            if (ageByYearText) {
                                const sep = document.createElement('span');
                                sep.className = 'age-sep';
                                sep.textContent = ' | ';
                                const spanBY = document.createElement('span');
                                spanBY.className = 'age-by-year';
                                spanBY.textContent = ageByYearText;
                                valCell.appendChild(sep);
                                valCell.appendChild(spanBY);
                            }

                            valCell.dataset.lastRenderedAge = composedAge;
                            valCell.dataset.original = raw;
                        }
                    } else {
                        // interactive — just update dataset so next non-interactive render can use it
                        valCell.dataset.original = raw;
                        if (ageByYearText) valCell.dataset.lastRenderedAge = originalAge + ' | ' + ageByYearText;
                    }
                }
            }
        } catch (err) {
            console.error('TM DOB/Age updater error:', err);
        } finally {
            // re-attach observer to the right container
            attachObserver();
        }
    }

    function scheduleUpdate() {
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = setTimeout(updateRows, DEBOUNCE_MS);
    }

    function attachObserver() {
        // ensure there is only one observer
        if (observer) observer.disconnect();

        const container = document.querySelector('#custom-tabs-one-profile') || document.body;
        observer = new MutationObserver((mutations) => {
            // schedule a debounced update for any added/changed nodes
            for (const m of mutations) {
                if (m.type === 'childList' && m.addedNodes && m.addedNodes.length > 0) {
                    scheduleUpdate();
                    return;
                }
                if (m.type === 'characterData' || m.type === 'subtree' || m.type === 'attributes') {
                    scheduleUpdate();
                    return;
                }
            }
        });

        observer.observe(container, { childList: true, subtree: true, characterData: true, attributes: false });
    }

    // wait for table to exist, but don't loop forever
    function waitForTable(timeout = 5000) {
        const start = Date.now();
        const check = () => {
            const table = document.querySelector('#custom-tabs-one-profile table tbody tr');
            if (table) {
                scheduleUpdate();
                attachObserver();
            } else if (Date.now() - start < timeout) {
                setTimeout(check, 300);
            } else {
                // if table never shows up quickly, still attach observer to container to catch it later
                attachObserver();
            }
        };
        check();
    }

    waitForTable();

})();
