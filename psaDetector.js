// ==UserScript==
// @name         FILE UPLOAD (CHECKER + SAVE BUTTON)
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Check PSA, Form B, and Delegation files; show status + file type + file size + SAVE button beside file icons
// @author       Dariz Villarba
// @match        https://bp.psc.games/admin/index.php*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/psaDetector.js
// @downloadURL  https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/psaDetector.js
// ==/UserScript==

(function() {
    'use strict';

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

        // Coaches (Form B)
        if (keyName === "FormB") {
            filename = `FORM_B_${sport}_${lgu}${ext}`;
        }
        // Delegates
        else if (keyName === "DelegationList") {
            filename = `DELEGATIONLIST_${lgu}${ext}`;
        } else if (keyName === "DelegationGallery") {
            filename = `DELEGATIONGALLERY_${lgu}${ext}`;
        }
        // Athletes (PSA)
        else if (keyName === "PSA") {
            filename = `${name}_PSA_${lgu}${ext}`;
        }
        // Fallback
        else {
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
            a.download = filename.toUpperCase(); // force uppercase
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        });

        return btn;
    }

    // --- Main checker ---
    function checkFile(fileName, fileLink, keyName) {
        GM_xmlhttpRequest({
            method: "HEAD",
            url: fileLink.href,
            onload: function(response) {
                let statusLabel = document.createElement("span");
                statusLabel.style.fontWeight = "bold";
                statusLabel.style.marginLeft = "8px";

                let fileExt = getFileExtension(fileLink.href);
                let fileSize = formatFileSize(response.responseHeaders.match(/content-length:\s*(\d+)/i)?.[1]);

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
            } else if (fileName === "Delegation Gallery") {
                checkFile(fileName, fileLink, "DelegationGallery");
            }
        }
    });

})();
