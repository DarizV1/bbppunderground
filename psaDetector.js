// ==UserScript==
// @name         File Status Checker
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Check PSA for athletes, Form B for coaches, and Delegation files; show status beside file icons
// @author       Dariz Villarba
// @match        https://bp.psc.games/admin/index.php*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/psaDetector.js
// @downloadURL  https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/psaDetector.js
// ==/UserScript==

(function() {
    'use strict';

    // Utility function to check a file and append status
    function checkFile(fileName, fileLink, keyName) {
        GM_xmlhttpRequest({
            method: "HEAD",
            url: fileLink.href,
            onload: function(response) {
                let statusLabel = document.createElement("span");
                statusLabel.style.fontWeight = "bold";
                statusLabel.style.marginLeft = "8px";

                if (response.status === 200) {
                    fileLink.style.backgroundColor = "green";
                    statusLabel.textContent = keyName + " DETECTED";
                    statusLabel.style.color = "green";
                } else {
                    fileLink.style.backgroundColor = "red";
                    statusLabel.textContent = keyName + " MISSING";
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
        if (link) checkFile("PSA Birth Certificate", link, "PSA");
    });

    // --- Coaches Table (Form B) ---
    let coachRows = [...document.querySelectorAll("table tbody tr")];

    coachRows.forEach(row => {
        let fileNameCell = row.querySelector("td:first-child");
        let fileLink = row.querySelector("td a.btn-primary");
        if (fileNameCell && fileLink) {
            let fileName = fileNameCell.textContent.trim();
            if (fileName === "Form B") {
                checkFile(fileName, fileLink, "Form B");
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
            if (fileName === "Delegation List" || fileName === "Delegation Gallery") {
                checkFile(fileName, fileLink, fileName);
            }
        }
    });

})();
