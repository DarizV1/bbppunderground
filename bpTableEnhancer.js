// ==UserScript==
// @name         Batang Pinoy Table Enhancer
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Enhances BP admin tables with row coloring (pastel sports colors), filters, borders, and "View" button opening in new tab.
// @author       Dariz Villarba
// @match        https://bp.psc.games/admin/index.php*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/DarizV1/bbppunderground/main/bpTableEnhancer.js
// @downloadURL  https://raw.githubusercontent.com/DarizV1/bbppunderground/main/bpTableEnhancer.js
// ==/UserScript==

(function() {
    'use strict';

    // 🔹 Sport → Softer pastel-style colors
    const sportColors = {
        "Aquatics (Swimming)": "#cce7f5",
        "Archery": "#d9f2d9",
        "Arnis": "#f2e0d9",
        "Athletics": "#ffe0cc",
        "Badminton": "#e0d9f2",
        "Basketball (3x3)": "#ffe6cc",
        "Boxing": "#f2d9d9",
        "Chess": "#e6e6e6",
        "Cycling": "#d9f2f0",
        "Dancesport": "#f9d9f2",
        "Futsal": "#e0f9e0",
        "Gymnastics": "#e6d9f9",
        "Jiu Jitsu": "#d9e9f9",
        "Judo": "#ffd9d9",
        "Karate": "#fff9d9",
        "Kickboxing": "#ffd9ec",
        "Muay Thai": "#f0f9d9",
        "Pencak Silat": "#ffe2d9",
        "Sepak Takraw": "#d9f5f2",
        "Soft Tennis": "#e9d9f9",
        "Table Tennis": "#f9d9f9",
        "Taekwondo": "#d9f9e5",
        "Tennis": "#e0e0e0",
        "Volleyball (Beach)": "#fff0cc",
        "Weightlifting": "#f2cccc",
        "Wrestling": "#cce9f9",
        "Wushu": "#ffdacc"
    };

    // Contrast check for text
    function getContrastYIQ(hexcolor) {
        hexcolor = hexcolor.replace("#", "");
        let r = parseInt(hexcolor.substr(0,2),16);
        let g = parseInt(hexcolor.substr(2,2),16);
        let b = parseInt(hexcolor.substr(4,2),16);
        let yiq = ((r*299)+(g*587)+(b*114))/1000;
        return (yiq >= 128) ? "#000000" : "#ffffff";
    }

    // 🔹 Inject custom CSS for table borders
    function injectTableCSS() {
        const style = document.createElement("style");
        style.innerHTML = `
            #list {
                border-collapse: collapse !important;
                border: 1px solid #999 !important;
            }
            #list th, #list td {
                border: 1px solid #bbb !important;
                padding: 6px !important;
            }
            #list th {
                background-color: #f5f5f5 !important;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }

    function fixTable() {
        if (typeof $ !== "undefined" && $.fn.DataTable && $("#list").length) {
            if ($.fn.DataTable.isDataTable('#list')) {
                $('#list').DataTable().destroy();
            }

            let table = $('#list').DataTable({
                paging: true,
                lengthChange: true,
                lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
                pageLength: 25,
                searching: true,
                ordering: true,
                info: true,
                autoWidth: false,
                responsive: true,
                buttons: ["copy", "csv", "excel", "pdf"]
            });

            table.buttons().container().appendTo('#list_wrapper .col-md-6:eq(0)');

            let headers = $("#list thead th").map(function(){ return $(this).text().trim().toLowerCase(); }).get();
            let clusterCol = headers.indexOf("cluster");
            let lguCol = headers.indexOf("lgu");
            let sportCol = headers.indexOf("sport");

            // Cluster filter
            $('#clusterFilter').off('change').on('change', function () {
                let val = $(this).val();
                if (clusterCol !== -1) table.column(clusterCol).search(val ? val : '', false, true).draw();
            });

            // LGU filter (exact)
            $('#lguFilter').off('change').on('change', function () {
                let val = $(this).val();
                if (lguCol !== -1) {
                    if (val) {
                        table.column(lguCol).search('^' + $.fn.dataTable.util.escapeRegex(val) + '$', true, false).draw();
                    } else {
                        table.column(lguCol).search('', true, false).draw();
                    }
                }
            });

            // Sport filter
            $('#sportFilter').off('change').on('change', function () {
                let val = $(this).val();
                if (sportCol !== -1) table.column(sportCol).search(val ? val : '', false, true).draw();
            });

            // Colorize rows
            table.on('draw', function () {
                table.rows().every(function () {
                    let data = this.data();
                    if (sportCol !== -1 && data[sportCol]) {
                        let sport = data[sportCol].trim();
                        let color = sportColors[sport];
                        if (color) {
                            let textColor = getContrastYIQ(color);
                            $(this.node()).css({
                                "background-color": color,
                                "color": textColor
                            });
                        } else {
                            $(this.node()).css({"background-color": "", "color": ""});
                        }
                    }
                });

                // Force "View" links to open in new tab
                $('#list a').each(function () {
                    if ($(this).text().trim().toLowerCase() === "view") {
                        $(this).attr("target", "_blank");
                    }
                });
            });

            table.draw();
            return true;
        }
        return false;
    }

    injectTableCSS();

    let check = setInterval(() => {
        if (fixTable()) clearInterval(check);
    }, 500);
})();
