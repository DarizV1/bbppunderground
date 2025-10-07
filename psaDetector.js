// ==UserScript==
// @name         FILE UPLOAD (CHECKER + SAVE BUTTON) - fixed DnD
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Check PSA, Form B, and Delegation files; show status + file type + file size + SAVE button beside file icons. Fixed drag/drop from Explorer. Opens compress.google.com when >2MB.
// @author       Dariz Villarba (modified)
// @match        https://bp.psc.games/admin/index.php*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/psaDetector.js
// @downloadURL  https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/psaDetector.js
// ==/UserScript==

(function() {
    'use strict';

    // --- Global: prevent default browser file open on file drops (safe)
    // NOTE: do NOT stopPropagation here, or it blocks drop zones.
    ['dragenter','dragover','dragleave','drop'].forEach(function(eventName){
        window.addEventListener(eventName, function(e){
            try {
                var dt = e.dataTransfer;
                // robust check for 'Files' in dt.types (some browsers vary)
                var isFile = dt && Array.prototype.slice.call(dt.types || []).some(t => String(t).toLowerCase().includes('file'));
                var isEditable = e.target && (e.target.closest && e.target.closest('input, textarea, [contenteditable="true"]'));
                if (isFile && !isEditable) {
                    // prevent browser from navigating to dropped file, but allow propagation
                    e.preventDefault();
                    // DO NOT call e.stopPropagation() here!
                }
            } catch (err) {
                // safe fallback
                try { e.preventDefault(); } catch(e) {}
            }
        }, true);
    });

    // --- Utility: get file extension ---
    function getFileExtension(url) {
        try {
            let cleanUrl = url.split("?")[0].split("#")[0];
            let parts = cleanUrl.split(".");
            return parts.length > 1 ? "." + parts.pop().toLowerCase() : "Unknown";
        } catch (e) {
            return "Unknown";
        }
    }

    // --- Utility: format file size ---
    function formatFileSize(bytes) {
        if (!bytes || isNaN(bytes)) return "Unknown size";
        const sizes = ["B", "KB", "MB", "GB"];
        let i = Math.floor(Math.log(bytes) / Math.log(1024));
        if (i < 0) i = 0;
        if (i >= sizes.length) i = sizes.length - 1;
        let size = (bytes / Math.pow(1024, i)).toFixed(1);
        return `${size} ${sizes[i]}`;
    }

    // --- Get LGU, Sport, and Name info ---
    function getContextInfo() {
        let lguEl = [...document.querySelectorAll("li.list-group-item b")]
            .find(el => el.textContent.includes("LGU"));
        let sportEl = [...document.querySelectorAll("li.list-group-item b")]
            .find(el => el.textContent.includes("Sport"));
        let nameEl = document.querySelector(".profile-username");

        let lgu = lguEl ? lguEl.parentElement.querySelector("span").textContent.trim().replace(/\s+/g, "_") : "UnknownLGU";
        let sport = sportEl ? sportEl.parentElement.querySelector("span").textContent.trim().replace(/\s+/g, "_") : null;
        let name = nameEl ? nameEl.textContent.trim().replace(/\s+/g, "_") : "UnknownName";

        return { lgu, sport, name };
    }

    // --- Create Save button ---
    function createSaveButton(url, keyName, ext) {
        let { lgu, sport, name } = getContextInfo();
        let filename;

        if (keyName === "FormB") {
            const sportPart = sport ? sport + "_" : "";
            filename = `FORM_B_${sportPart}${lgu}${ext}`;
        } else if (keyName === "DelegationList") {
            filename = `DELEGATIONLIST_${lgu}${ext}`;
        } else if (keyName === "DelegationGallery") {
            filename = `DELEGATIONGALLERY_${lgu}${ext}`;
        } else if (keyName === "PSA") {
            filename = `${name}_PSA_${lgu}${ext}`;
        } else {
            filename = `${keyName}_${lgu}${ext}`;
        }

        let btn = document.createElement("button");
        btn.textContent = "💾 Save";
        btn.style.marginLeft = "6px";
        btn.style.padding = "2px 6px";
        btn.style.fontSize = "13px";
        btn.style.cursor = "pointer";
        btn.style.border = "1px solid #333";
        btn.style.borderRadius = "4px";
        btn.style.background = "#f0f0f0";

        btn.addEventListener("click", () => {
            let a = document.createElement("a");
            a.href = url;
            a.download = filename.toUpperCase();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });

        return btn;
    }

    // --- Utility: wait for an element to appear ---
    function waitForElement(selector, timeoutMs = 10000, intervalMs = 100) {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const timer = setInterval(() => {
                const el = document.querySelector(selector);
                if (el) {
                    clearInterval(timer);
                    resolve(el);
                } else if (Date.now() - start > timeoutMs) {
                    clearInterval(timer);
                    reject(new Error('Element not found: ' + selector));
                }
            }, intervalMs);
        });
    }

    // --- Utility: validate PDF file ---
    function isPdfFile(file) {
        if (!file) return false;
        const nameLooksPdf = /\.pdf$/i.test(file.name || '');
        const typeLooksPdf = (file.type || '').toLowerCase() === 'application/pdf';
        return nameLooksPdf || typeLooksPdf;
    }

    // --- Upload through existing modal flow ---
    async function uploadViaModal(editButton, droppedFile) {
        try {
            if (!editButton || !droppedFile) return;

            if (!isPdfFile(droppedFile)) {
                (window.alert_toast || window.alert || console.log)("Only PDF files are accepted.");
                return;
            }

            // Open existing edit modal
            editButton.click();

            // Wait for file input inside modal
            const fileInput = await waitForElement('#uni_modal input[type="file"]');

            // Hint accept to PDF
            try { fileInput.setAttribute('accept', '.pdf,application/pdf'); } catch(e) {}

            // Populate file input with dropped file
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(droppedFile);
            fileInput.files = dataTransfer.files;
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));

            // Submit the form via existing Save button or form submit
            const saveBtn = document.querySelector('#uni_modal #submit');
            if (saveBtn) {
                saveBtn.click();
            } else {
                const form = fileInput.closest('form');
                form && form.submit();
            }
        } catch (err) {
            console.error('Drag&Drop upload failed:', err);
            alert('Drag & Drop upload failed. Please use the Edit button instead.');
        }
    }

    // --- Create drag-and-drop zone beside a file row ---
    function createDropZone(row, keyName) {
        try {
            const dz = document.createElement('span');
            dz.textContent = ' ⬇ Drop PDF to upload';
            dz.style.display = 'inline-block';
            dz.style.marginLeft = '6px';
            dz.style.padding = '2px 6px';
            dz.style.border = '1px dashed #666';
            dz.style.borderRadius = '4px';
            dz.style.fontSize = '12px';
            dz.style.color = '#333';
            dz.style.background = '#fafafa';
            dz.style.cursor = 'copy';

            // Pre-resolve the edit button inside this row
            let editBtn = null;
            if (keyName === 'DelegationGallery') {
                editBtn = row.querySelector('.edit_file_new');
            }
            if (!editBtn) {
                editBtn = row.querySelector('.edit_file');
            }

            function setActive(active) {
                dz.style.background = active ? '#e6f4ff' : '#fafafa';
                dz.style.borderColor = active ? '#1890ff' : '#666';
            }

            function setBusy(busy) {
                dz.textContent = busy ? ' ⏳ Uploading...' : ' ⬇ Drop PDF to upload';
                dz.style.pointerEvents = busy ? 'none' : 'auto';
                dz.style.opacity = busy ? '0.7' : '1';
            }

            // Ensure the drop zone prevents default on dragover and drop
            dz.addEventListener('dragenter', (e) => { e.preventDefault(); e.dataTransfer && (e.dataTransfer.dropEffect = 'copy'); setActive(true); });
            dz.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer && (e.dataTransfer.dropEffect = 'copy'); setActive(true); });
            dz.addEventListener('dragleave', (e) => { setActive(false); });
            dz.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation && e.stopPropagation(); // safe to stop here so it doesn't bubble further
                setActive(false);
                const files = e.dataTransfer && e.dataTransfer.files;
                if (!files || !files.length) return;
                const file = files[0];

                // size check: if > 2MB, open compress site in new tab and stop
                const MAX = 2 * 1024 * 1024; // 2MB
                if (file.size > MAX) {
                    // open compress site (per user request)
                    try {
                        window.open('https://compress.google.com', '_blank');
                    } catch (err) {
                        console.warn('Could not open compress site:', err);
                    }
                    dz.style.borderColor = '#d32f2f';
                    dz.style.background = '#fff4e6';
                    dz.textContent = ' ⚠ File > 2MB — opened compressor';
                    setTimeout(() => { dz.textContent = ' ⬇ Drop PDF to upload'; dz.style.background = '#fafafa'; dz.style.borderColor = '#666'; }, 3000);
                    return;
                }

                if (!isPdfFile(file)) {
                    dz.style.borderColor = '#d32f2f';
                    dz.style.background = '#fdecea';
                    (window.alert_toast || window.alert || console.log)("Only PDF files are accepted.");
                    setTimeout(() => setActive(false), 1200);
                    return;
                }

                if (!editBtn) {
                    alert('Edit button not found for ' + keyName);
                    return;
                }
                setBusy(true);
                uploadViaModal(editBtn, file).finally(function(){ setBusy(false); });
            });

            // Click-to-upload support (uses existing modal flow)
            const picker = document.createElement('input');
            picker.type = 'file';
            picker.accept = '.pdf,application/pdf';
            picker.style.display = 'none';
            row.appendChild(picker);

            dz.addEventListener('click', function() {
                picker.click();
            });

            picker.addEventListener('change', function() {
                const file = picker.files && picker.files[0];
                if (!file) return;

                const MAX = 2 * 1024 * 1024; // 2MB
                if (file.size > MAX) {
                    try { window.open('https://www.ilovepdf.com/compress_pdf', '_blank'); } catch(e){ }
                    dz.style.borderColor = '#d32f2f';
                    dz.style.background = '#fff4e6';
                    dz.textContent = ' ⚠ File > 2MB — opened compressor';
                    picker.value = '';
                    setTimeout(() => { dz.textContent = ' ⬇ Drop PDF to upload'; dz.style.background = '#fafafa'; dz.style.borderColor = '#666'; }, 3000);
                    return;
                }

                if (!isPdfFile(file)) {
                    dz.style.borderColor = '#d32f2f';
                    dz.style.background = '#fdecea';
                    (window.alert_toast || window.alert || console.log)("Only PDF files are accepted.");
                    picker.value = '';
                    return;
                }
                if (!editBtn) {
                    alert('Edit button not found for ' + keyName);
                    picker.value = '';
                    return;
                }
                setBusy(true);
                uploadViaModal(editBtn, file)
                    .finally(function(){ setBusy(false); picker.value = ''; });
            });

            // Append after the primary file link/button group
            const cell = row.querySelector('td.text-right, td:last-child, td');
            (cell || row).appendChild(dz);
        } catch (e) {
            console.warn('Failed to create drop zone for', keyName, e);
        }
    }

    // --- Main checker (unchanged) ---
    function checkFile(fileName, fileLink, keyName) {
        GM_xmlhttpRequest({
            method: "HEAD",
            url: fileLink.href,
            onload: function(response) {
                let statusLabel = document.createElement("span");
                statusLabel.style.fontWeight = "bold";
                statusLabel.style.marginLeft = "8px";

                let fileExt = getFileExtension(fileLink.href);
                let sizeMatch = (response.responseHeaders || '').match(/content-length:\s*(\d+)/i);
                let fileSize = formatFileSize(sizeMatch ? Number(sizeMatch[1]) : NaN);

                if (response.status === 200) {
                    fileLink.style.backgroundColor = "green";
                    statusLabel.textContent = `${keyName} DETECTED (${fileExt}, ${fileSize})`;
                    statusLabel.style.color = "green";

                    // Add Save button with dynamic filename
                    let saveBtn = createSaveButton(fileLink.href, keyName, fileExt);
                    fileLink.parentElement.appendChild(saveBtn);

                } else {
                    fileLink.style.backgroundColor = "red";
                    statusLabel.textContent = `${keyName} MISSING`;
                    statusLabel.style.color = "red";
                }

                fileLink.parentElement.appendChild(statusLabel);
            },
            onerror: function() {
                fileLink.style.backgroundColor = "orange";
                let errorLabel = document.createElement("span");
                errorLabel.textContent = keyName + " CHECK ERROR";
                errorLabel.style.color = "orange";
                errorLabel.style.fontWeight = "bold";
                errorLabel.style.marginLeft = "8px";
                fileLink.parentElement.appendChild(errorLabel);
            }
        });
    }

    // --- Athletes Table (PSA) ---
    let athleteRows = [...document.querySelectorAll("td")]
        .filter(td => td.textContent.includes("PSA Birth Certificate"))
        .map(td => td.parentElement);

    athleteRows.forEach(row => {
        let link = row.querySelector("a");
        if (link) checkFile("PSA", link, "PSA");
        createDropZone(row, "PSA");
    });

    // --- Coaches Table (Form B) ---
    let coachRows = [...document.querySelectorAll("table tbody tr")];
    coachRows.forEach(row => {
        let fileNameCell = row.querySelector("td:first-child");
        let fileLink = row.querySelector("td a.btn-primary");
        if (fileNameCell && fileLink) {
            let fileName = fileNameCell.textContent.trim();
            if (fileName === "Form B") {
                checkFile(fileName, fileLink, "FormB");
                createDropZone(row, "FormB");
            }
        }
    });

    // --- Delegation Table (List & Gallery) ---
    let delegationRows = [...document.querySelectorAll("table tbody tr")];
    delegationRows.forEach(row => {
        let fileNameCell = row.querySelector("td:first-child");
        let fileLink = row.querySelector("td a.btn-primary");
        if (fileNameCell && fileLink) {
            let fileName = fileNameCell.textContent.trim();
            if (fileName === "Delegation List") {
                checkFile(fileName, fileLink, "DelegationList");
                createDropZone(row, "DelegationList");
            } else if (fileName === "Delegation Gallery") {
                checkFile(fileName, fileLink, "DelegationGallery");
                createDropZone(row, "DelegationGallery");
            }
        }
    });

})();
