// ==UserScript==
// @name         Athlete Photo Local Downloader & DragDrop Upload
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Download athlete photo with a proper filename and allow drag-and-drop to replace the photo.
// @author       Dariz VIllarba
// @match        https://bp.psc.games/admin/index.php?page=*
// @grant        GM_download
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/local_download_remove_bg.js
// @downloadURL  https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/local_download_remove_bg.js
// ==/UserScript==

(function() {
    'use strict';

    function addSaveButton() {
        const img = document.querySelector('#uploaded_image');
        if (!img || document.querySelector('#save-photo-btn')) return; // Prevent duplicates

        // --- Save Button ---
        const btn = document.createElement('button');
        btn.type = 'button'; // ✅ prevents form submission (no page refresh)
        btn.innerText = '💾';
        btn.id = 'save-photo-btn';
        Object.assign(btn.style, {
            position: 'absolute',
            top: '5px',
            left: '5px',
            zIndex: '9999',
            padding: '6px 12px',
            background: '#0000FF',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '13px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        });

        img.parentElement.style.position = 'relative';
        img.parentElement.appendChild(btn);

        btn.addEventListener('click', () => {
            const photoUrl = img.src;

            let fullname = document.querySelector('.profile-username')?.innerText.trim() || "Unknown";
            fullname = fullname.replace(/\./g, '').replace(/\s+/g, '_');

            let sport = document.querySelector("li.list-group-item:nth-child(2) span.float-right")?.innerText.trim() || "Sport";
            sport = sport.replace(/\s+/g, '_');

            let lgu = document.querySelector("li.list-group-item:nth-child(1) span.float-right")?.innerText.trim() || "LGU";
            lgu = lgu.replace(/\s+/g, '_');

            const filename = `${fullname}_${sport}_${lgu}.jpg`;

            GM_download({
                url: photoUrl,
                name: filename,
                saveAs: true,
                ontimeout: () => console.error("Download timeout"),
                onerror: (err) => console.error("Download error:", err)
            });
        });

        // --- Drag & Drop Upload ---
        img.addEventListener("dragover", (e) => {
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = "copy";
            }
            img.style.border = "3px dashed #28a745"; // visual hint
        });

        img.addEventListener("dragleave", () => {
            img.style.border = "";
        });

        img.addEventListener("drop", async (e) => {
            e.preventDefault();
            img.style.border = "";

            const input = document.querySelector("#upload_image"); // hidden file input
            if (!input) {
                console.error("File input #upload_image not found");
                return;
            }

            let file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];

            if (!file && e.dataTransfer) {
                const droppedUrl = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
                if (droppedUrl) {
                    try {
                        const response = await fetch(droppedUrl, { mode: "cors" });
                        const blob = await response.blob();
                        const inferredName = (droppedUrl.split("/").pop() || "dropped-image").split("?")[0] || "dropped-image";
                        const fileName = inferredName || "dropped-image.png";
                        file = new File([blob], fileName, { type: blob.type || "image/png" });
                    } catch (err) {
                        console.error("Failed to fetch dropped URL:", err);
                    }
                }
            }

            if (!file) return;

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            input.files = dataTransfer.files;

            // Trigger change event so site’s own upload script runs
            input.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }

    // Observe DOM changes to add the button if the image loads dynamically
    const observer = new MutationObserver(addSaveButton);
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial attempt to add the button on page load
    addSaveButton();
})();
