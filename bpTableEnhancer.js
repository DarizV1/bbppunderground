// ==UserScript==
// @name         Batang Pinoy Table Enhancer (With Auto-Detected Filters + Buttons)
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Enhances BP admin tables by adding row selectors, auto-detecting cluster/LGU/sport filters, and ensuring correct info display. Improves navigation and usability for admins managing multiple entries.
// @author       Dariz Villarba
// @match        https://bp.psc.games/admin/index.php*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/DarizV1/bbppunderground/main/bpTableEnhancer.js
// @downloadURL  https://raw.githubusercontent.com/DarizV1/bbppunderground/main/bpTableEnhancer.js
// ==/UserScript==

(function() {
    'use strict';

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

            // Re-attach buttons
            table.buttons().container().appendTo('#list_wrapper .col-md-6:eq(0)');

            // 🔹 Find column indexes dynamically by header name
            let headers = $("#list thead th").map(function(){ return $(this).text().trim().toLowerCase(); }).get();

            let clusterCol = headers.indexOf("cluster");
            let lguCol = headers.indexOf("lgu");
            let sportCol = headers.indexOf("sport");

            console.log("Detected columns → Cluster:", clusterCol, "LGU:", lguCol, "Sport:", sportCol);

            // 🔹 Attach filters (allow partial match, reset old bindings)
            $('#clusterFilter').off('change').on('change', function () {
                let val = $(this).val();
                if (clusterCol !== -1) {
                    table.column(clusterCol).search(val ? val : '', false, true).draw();
                }
            });

            $('#lguFilter').off('change').on('change', function () {
                let val = $(this).val();
                if (lguCol !== -1) {
                    table.column(lguCol).search(val ? val : '', false, true).draw();
                }
            });

            $('#sportFilter').off('change').on('change', function () {
                let val = $(this).val();
                if (sportCol !== -1) {
                    table.column(sportCol).search(val ? val : '', false, true).draw();
                }
            });


            console.log("DataTable enhanced: auto-detected filters + buttons OK");
            return true;
        }
        return false;
    }

    let check = setInterval(() => {
        if (fixTable()) clearInterval(check);
    }, 500); // faster checks
})();
