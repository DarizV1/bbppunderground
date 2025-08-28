// ==UserScript==
// @name         Athlete / Coach / Delegate Status Buttons (Dark Theme)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  Adds a sticky, dark-themed navigation bar with status buttons for Athletes, Coaches, and Delegates. Makes it easier to quickly view and switch between statuses like Pending, On-Hold, Validated, Withdrawn, etc.
// @author       Dariz Villarba
// @match        https://bp.psc.games/admin/*
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/statusButtonsDarkTheme.js
// @downloadURL  https://raw.githubusercontent.com/DarizV1/bbppunderground/refs/heads/main/statusButtonsDarkTheme.js
// ==/UserScript==


(function () {
    'use strict';

    // Add dark theme CSS
    GM_addStyle(`
        #statusStickyBar {
            background: #1a1a1a !important;
            border-bottom: 1px solid #333 !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
            padding: 12px 15px !important;
        }

        #statusStickyBar a {
            padding: 8px 16px !important;
            border-radius: 6px !important;
            font-weight: 600 !important;
            text-decoration: none !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
            transition: all 0.2s ease !important;
            border: 1px solid transparent !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 14px !important;
        }

        #statusStickyBar a:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
        }

        #statusStickyBar a:active {
            transform: translateY(0) !important;
        }

        body.dark-mode {
            filter: invert(1) hue-rotate(180deg);
        }
    `);

    // Define groups (Athletes, Coaches, Delegates)
    const groups = {
        athletes: {
            pages: [
                "pending_athletes",
                "on-hold_athletes",
                "validated_athletes",
                "withdrawn_athletes",
                "archived_athletes",
                "disqualified_athletes"
            ],
            buttons: [
                { text: "Pending Athletes", url: "https://bp.psc.games/admin/index.php?page=pending_athletes", color: "#2a4f6b", textColor: "#ffffff" },
                { text: "On-Hold Athletes", url: "https://bp.psc.games/admin/index.php?page=on-hold_athletes", color: "#5c4f1b", textColor: "#ffffff" },
                { text: "Validated Athletes", url: "https://bp.psc.games/admin/index.php?page=validated_athletes", color: "#2c5c34", textColor: "#ffffff" },
                { text: "Withdrawn Athletes", url: "https://bp.psc.games/admin/index.php?page=withdrawn_athletes", color: "#6b2a2a", textColor: "#ffffff" },
                { text: "Archived Athletes", url: "https://bp.psc.games/admin/index.php?page=archived_athletes", color: "#4a4a4a", textColor: "#ffffff" },
                { text: "Disqualified Athletes", url: "https://bp.psc.games/admin/index.php?page=disqualified_athletes", color: "#8b2a2a", textColor: "#ffffff" },
                { text: "Coach Pending", url: "https://bp.psc.games/admin/index.php?page=pending_coaches", color: "#8b2a2a", textColor: "#ff9999" },
                { text: "Delegates Pending", url: "https://bp.psc.games/admin/index.php?page=pending_delegates", color: "#8b2a2a", textColor: "#ff9999" }
            ]
        },
        coaches: {
            pages: [
                "pending_coaches",
                "on-hold_coaches",
                "validated_coaches",
                "withdrawn_coaches",
                "archived_coaches",
                "disqualified_coaches"
            ],
            buttons: [
                { text: "Pending Coaches", url: "https://bp.psc.games/admin/index.php?page=pending_coaches", color: "#2a4f6b", textColor: "#ffffff" },
                { text: "On-Hold Coaches", url: "https://bp.psc.games/admin/index.php?page=on-hold_coaches", color: "#5c4f1b", textColor: "#ffffff" },
                { text: "Validated Coaches", url: "https://bp.psc.games/admin/index.php?page=validated_coaches", color: "#2c5c34", textColor: "#ffffff" },
                { text: "Withdrawn Coaches", url: "https://bp.psc.games/admin/index.php?page=withdrawn_coaches", color: "#6b2a2a", textColor: "#ffffff" },
                { text: "Archived Coaches", url: "https://bp.psc.games/admin/index.php?page=archived_coaches", color: "#4a4a4a", textColor: "#ffffff" },
                { text: "Disqualified Coaches", url: "https://bp.psc.games/admin/index.php?page=disqualified_coaches", color: "#8b2a2a", textColor: "#ffffff" },
                { text: "Athlete Pending", url: "https://bp.psc.games/admin/index.php?page=pending_athletes", color: "#8b2a2a", textColor: "#ff9999" },
                { text: "Delegates Pending", url: "https://bp.psc.games/admin/index.php?page=pending_delegates", color: "#8b2a2a", textColor: "#ff9999" }
            ]
        },
        delegates: {
            pages: [
                "pending_delegates",
                "on-hold_delegates",
                "validated_delegates",
                "withdrawn_delegates",
                "archived_delegates",
                "disqualified_delegates"
            ],
            buttons: [
                { text: "Pending Delegates", url: "https://bp.psc.games/admin/index.php?page=pending_delegates", color: "#2a4f6b", textColor: "#ffffff" },
                { text: "On-Hold Delegates", url: "https://bp.psc.games/admin/index.php?page=on-hold_delegates", color: "#5c4f1b", textColor: "#ffffff" },
                { text: "Validated Delegates", url: "https://bp.psc.games/admin/index.php?page=validated_delegates", color: "#2c5c34", textColor: "#ffffff" },
                { text: "Withdrawn Delegates", url: "https://bp.psc.games/admin/index.php?page=withdrawn_delegates", color: "#6b2a2a", textColor: "#ffffff" },
                { text: "Archived Delegates", url: "https://bp.psc.games/admin/index.php?page=archived_delegates", color: "#4a4a4a", textColor: "#ffffff" },
                { text: "Disqualified Delegates", url: "https://bp.psc.games/admin/index.php?page=disqualified_delegates", color: "#8b2a2a", textColor: "#ffffff" },
                { text: "Athlete Pending", url: "https://bp.psc.games/admin/index.php?page=pending_athletes", color: "#8b2a2a", textColor: "#ff9999" },
                { text: "Coach Pending", url: "https://bp.psc.games/admin/index.php?page=pending_coaches", color: "#8b2a2a", textColor: "#ff9999" }
            ]
        }
    };

    const currentUrl = window.location.href;

    // Find which group we are in
    let activeGroup = null;
    for (const [groupName, groupData] of Object.entries(groups)) {
        if (groupData.pages.some(page => currentUrl.includes(page))) {
            activeGroup = groupData;
            break;
        }
    }

    if (!activeGroup) return; // Exit if not on athlete/coach/delegate page

    function createStickyBar() {
        if (document.getElementById("statusStickyBar")) return;

        const stickyBar = document.createElement("div");
        stickyBar.id = "statusStickyBar";
        stickyBar.style.position = "fixed";
        stickyBar.style.top = "0";
        stickyBar.style.left = "0";
        stickyBar.style.right = "0";
        stickyBar.style.background = "#1a1a1a";
        stickyBar.style.padding = "12px 15px";
        stickyBar.style.zIndex = "9999";
        stickyBar.style.display = "flex";
        stickyBar.style.gap = "10px";
        stickyBar.style.borderBottom = "1px solid #333";
        stickyBar.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.5)";
        stickyBar.style.flexWrap = "wrap";

        activeGroup.buttons.forEach(btn => {
            const a = document.createElement("a");
            a.innerText = btn.text;
            a.href = btn.url;
            a.style.background = btn.color;
            a.style.color = btn.textColor;
            a.style.padding = "8px 16px";
            a.style.borderRadius = "6px";
            a.style.fontWeight = "600";
            a.style.textDecoration = "none";
            a.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
            a.style.transition = "all 0.2s ease";
            a.style.border = "1px solid transparent";
            a.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            a.style.fontSize = "14px";

            // Hover effect
            a.addEventListener('mouseover', function() {
                this.style.transform = "translateY(-2px)";
                this.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
            });
            a.addEventListener('mouseout', function() {
                this.style.transform = "translateY(0)";
                this.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
            });

            if (currentUrl.includes(btn.url.split('?')[1])) {
                a.style.border = "1px solid #fff";
                a.style.boxShadow = "0 0 0 2px rgba(255, 255, 255, 0.3)";
                a.style.fontWeight = "700";
            }

            stickyBar.appendChild(a);
        });

        document.body.style.paddingTop = "60px";
        document.body.prepend(stickyBar);
    }

    // Wait for table
    const observer = new MutationObserver(() => {
        if (document.querySelector("table")) {
            createStickyBar();
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

})();
