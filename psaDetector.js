// ==UserScript==
// @name         PSA Birth Certificate Status Checker
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Show PSA DETECTED, PSA MISSING, or PSA CHECK ERROR beside the file manager icon
// @author       You
// @match        https://bp.psc.games/admin/index.php*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Find PSA Birth Certificate row
    let psaRow = [...document.querySelectorAll("td")]
        .find(td => td.textContent.includes("PSA Birth Certificate"))
        ?.parentElement;

    if (psaRow) {
        let psaLink = psaRow.querySelector("a");
        if (psaLink) {
            let fileUrl = psaLink.href;

            GM_xmlhttpRequest({
                method: "HEAD",
                url: fileUrl,
                onload: function(response) {
                    let statusLabel = document.createElement("span");
                    statusLabel.style.fontWeight = "bold";
                    statusLabel.style.marginLeft = "8px";

                    if (response.status === 200) {
                        console.log("✅ PSA DETECTED:", fileUrl);
                        psaLink.style.backgroundColor = "green";
                        statusLabel.textContent = "PSA DETECTED";
                        statusLabel.style.color = "green";
                    } else {
                        console.warn("❌ PSA MISSING (status:", response.status, ")");
                        psaLink.style.backgroundColor = "red";
                        statusLabel.textContent = "PSA MISSING";
                        statusLabel.style.color = "red";
                    }

                    psaLink.parentElement.appendChild(statusLabel);
                },
                onerror: function() {
                    console.error("⚠️ PSA CHECK ERROR");
                    psaLink.style.backgroundColor = "orange";

                    let errorLabel = document.createElement("span");
                    errorLabel.textContent = "PSA CHECK ERROR";
                    errorLabel.style.color = "orange";
                    errorLabel.style.fontWeight = "bold";
                    errorLabel.style.marginLeft = "8px";
                    psaLink.parentElement.appendChild(errorLabel);
                }
            });
        }
    } else {
        console.warn("⚠️ No PSA Birth Certificate row found on this page.");
    }
})();
