// ==UserScript==
// @name         BP Profile Picture Magic RemoveBG (Upload Only)
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Magic button on photo → remove.bg → white background → upload to server only (no local download)
// @author       Dariz
// @match        https://bp.psc.games/admin/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    const API_KEY = "PHpddfD3BVYWfmt6kcfYYXbE"; // your remove.bg API key

    /* ---------- Styles for magic button ---------- */
    GM_addStyle(`
        .magic-photo-wrapper {
            position: relative;
            display: inline-block;
        }
        .magic-photo-btn {
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ff00cc;
            color: #fff;
            font-family: "Font Awesome 5 Free";
            font-weight: 900;
            font-size: 14px;
            padding: 6px;
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 6px rgba(0,0,0,0.5);
            z-index: 10;
        }
        .magic-photo-btn::before {
            content: "\\f0d0"; /* Font Awesome magic wand */
        }
    `);

    /* ---------- Helpers ---------- */
    function addWhiteBackground(blob) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(resolve, "image/jpeg", 1.0); // save as JPG
            };
            img.src = URL.createObjectURL(blob);
        });
    }

    async function processImage(url) {
        const response = await fetch(url);
        const fileBlob = await response.blob();

        const formData = new FormData();
        formData.append("image_file", fileBlob, "photo.png");
        formData.append("size", "auto");

        const resp = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: { "X-Api-Key": API_KEY },
            body: formData
        });

        if (!resp.ok) {
            alert("Remove.bg error: " + resp.status + " " + resp.statusText);
            return null;
        }

        const blob = await resp.blob();
        return await addWhiteBackground(blob);
    }

    async function saveToServer(blob, athleteId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = function () {
                const base64data = reader.result;
                fetch("bp_change_photo.php", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: new URLSearchParams({ image: base64data, id: athleteId })
                })
                .then(res => res.text())
                .then(resp => {
                    if (resp == "1") {
                        alert("✅ Photo updated with white background!");
                        resolve(true);
                    } else {
                        alert("⚠️ Failed to update photo.");
                        reject(false);
                    }
                })
                .catch(err => {
                    console.error("Save error:", err);
                    reject(false);
                });
            };
        });
    }

    /* ---------- Main ---------- */
    function addMagicButton() {
        const img = document.querySelector("#uploaded_image");
        const athleteIdInput = document.querySelector("input[name='id']");
        if (!img || !athleteIdInput) return;

        if (!img.closest(".magic-photo-wrapper")) {
            const wrapper = document.createElement("div");
            wrapper.className = "magic-photo-wrapper";
            img.parentNode.insertBefore(wrapper, img);
            wrapper.appendChild(img);

            const btn = document.createElement("div");
            btn.className = "magic-photo-btn";
            btn.title = "Magic: Remove background + white bg";
            wrapper.appendChild(btn);

            btn.addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                btn.style.opacity = "0.5";
                const processed = await processImage(img.src);
                if (processed) {
                    const url = URL.createObjectURL(processed);
                    img.src = url;

                    // ✅ Upload only (no download to PC)
                    await saveToServer(processed, athleteIdInput.value);
                }
                btn.style.opacity = "1";
            });
        }
    }

    addMagicButton();
    const observer = new MutationObserver(addMagicButton);
    observer.observe(document.body, { childList: true, subtree: true });

})();
