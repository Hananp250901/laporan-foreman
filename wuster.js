// =================================================================
// D. LOGIKA HALAMAN WUSTER (wuster.html)
// (MODIFIKASI: PDF tidak menampilkan item list yang bernilai 0)
// =================================================================

// *** FUNGSI HELPER BARU ***
// Untuk mengubah string tanggal "YYYY-MM-DD" menjadi nama hari (cth: "Selasa")
function getDayNameFromDate(dateString) {
    if (!dateString) return "";
    try {
        // Tambahkan 'T12:00:00' untuk menghindari masalah timezone
        // yang membuat tanggal mundur 1 hari
        const date = new Date(dateString + 'T12:00:00');
        return date.toLocaleString('id-ID', { weekday: 'long' });
    } catch (e) {
        console.error("Error parsing date:", e);
        return "";
    }
}

// *** FUNGSI HELPER BARU (TAMBAHAN ANDA) ***
// Untuk mengubah "YYYY-MM-DD" menjadi "DD-MM-YYYY"
function formatDate_DDMMYYYY(dateString) {
    if (!dateString || dateString.length < 10) return dateString; // Fallback
    try {
        const [year, month, day] = dateString.split('-');
        return `${day}-${month}-${year}`;
    } catch (e) {
        return dateString; // Fallback jika format salah
    }
}


// Pastikan semua HTML sudah siap sebelum menjalankan kode
document.addEventListener('DOMContentLoaded', () => {

    const wusterForm = document.getElementById('wuster-form');
    // Jika tidak ada form wuster, hentikan script ini
    if (!wusterForm) return; 

    let currentUser = null;
    let currentKaryawan = null;
    let currentlyEditingId = null; // <- STATE BARU UNTUK EDIT/DRAFT

    const historyListEl = document.getElementById('wuster-history-list')?.getElementsByTagName('tbody')[0];
    const draftListEl = document.getElementById('wuster-draft-list')?.getElementsByTagName('tbody')[0]; // <- ELEMEN BARU
    const formMessageEl = document.getElementById('form-message');
    const formTitleEl = document.getElementById('form-title');

    // Tombol Form
    const mainSubmitBtn = document.getElementById('main-submit-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // Variabel State PAGINATION
    const itemsPerPage = 10;
    let currentPage = 1;
    let totalReports = 0;
    const prevButton = document.getElementById('prev-page-btn');
    const nextButton = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');

    // Variabel List Dinamis
    const holderListContainer = document.getElementById('packing-holder-list');
    const addHolderItemBtn = document.getElementById('add-holder-item-btn');
    const defaultHolderItems = ["HOLDER KYEA", "HOLDER BLS", "HOLDER BCM", "HOLDER 21D", "CAP 2DP", "CAP BC11", "CAP K64A RR", "CAP K64 FR"];
    const pasangListContainer = document.getElementById('pasang-holder-list');
    const addPasangItemBtn = document.getElementById('add-pasang-item-btn');
    const defaultPasangItems = ["HOLDER KYEA", "HOLDER BLS", "HOLDER BCM", "HOLDER 21D", "CAP 2DP", "CAP BC11", "CAP K64A RR", "CAP K64 FR"];
    const assyCupListContainer = document.getElementById('assy-cup-list');
    const addAssyCupItemBtn = document.getElementById('add-assy-cup-item-btn');
    const defaultAssyCupItems = ["MC 2DP FR", "MC 2DP RR", "MC K1ZV ABS", "MC K1ZV CBS", "MC K15A", "MC K2SA", "MC K3VA", "MC XD 831"];
    const touchUpListContainer = document.getElementById('touch-up-list');
    const addTouchUpItemBtn = document.getElementById('add-touch-up-item-btn');
    const defaultTouchUpItems = ["CC 1DY 1", "CC 1DY 2", "CAP ENGINE 9307"];
    const bukaCapListContainer = document.getElementById('buka-cap-list');
    const addBukaCapItemBtn = document.getElementById('add-buka-cap-item-btn');
    const defaultBukaCapItems = ["MC 2DP FR", "MC 2DP RR", "MC K1ZV ABS", "MC K1ZV CBS", "MC K15A", "MC K2SA", "MC K3VA", "MC XD 831", "MC K84A FR", "MC BWN"];
    
    // Variabel Total
    const wusterInputs = document.querySelectorAll('.wuster-calc');
    const wusterTotalSpan = document.getElementById('perf_wuster_total');
    const checkInputs = document.querySelectorAll('.check-calc'); // <- Ini tetap mengambil semua 4 input
    const checkTotalSpan = document.getElementById('total_check_total');
    const prodInputs = document.querySelectorAll('.prod-calc');
    const prodTotalSpan = document.getElementById('total_prod_total');
    
    // Variabel Total untuk List Dinamis
    const assyCupTotalSpan = document.getElementById('assy-cup-total');
    const touchUpTotalSpan = document.getElementById('touch-up-total');
    const bukaCapTotalSpan = document.getElementById('buka-cap-total');
    const packingHolderTotalSpan = document.getElementById('packing-holder-total'); 
    const pasangHolderTotalSpan = document.getElementById('pasang-holder-total'); 

   // --- KODE UNTUK AUTO-SUM TOTAL MASUK ---
    const absensiInputIDs = [
        'abs_staff_masuk', 'abs_wuster_masuk', 'abs_repair_masuk', 
        'abs_incoming_masuk', 'abs_chrome_masuk', 'abs_painting_4_masuk',
        'abs_user_cpc_masuk', 'abs_maintenance_masuk'
    ];
    const totalMasukInput = document.getElementById('total_masuk');
    const absensiInputs = absensiInputIDs.map(id => document.getElementById(id));
    function updateMasukTotal() {
        let total = 0;
        absensiInputs.forEach(input => {
            if (input) total += parseInt(input.value) || 0;
        });
        if (totalMasukInput) totalMasukInput.value = total;
    }
    absensiInputs.forEach(input => {
        if (input) input.addEventListener('input', updateMasukTotal);
    });
    // --- AKHIR KODE AUTO-SUM ---

    // --- KODE UNTUK AUTO-SUM TOTAL TIDAK MASUK ---
    const absensiTdkMasukInputIDs = [
        'abs_staff_tdk_masuk_org', 'abs_wuster_tdk_masuk_org', 'abs_repair_tdk_masuk_org',
        'abs_incoming_tdk_masuk_org', 'abs_chrome_tdk_masuk_org', 'abs_painting_4_tdk_masuk_org',
        'abs_user_cpc_tdk_masuk_org', 'abs_maintenance_tdk_masuk_org'
    ];
    const totalTdkMasukInput = document.getElementById('total_tdk_masuk_org');
    const absensiTdkMasukInputs = absensiTdkMasukInputIDs.map(id => document.getElementById(id));
    function updateTdkMasukTotal() {
        let total = 0;
        absensiTdkMasukInputs.forEach(input => {
            if (input) total += parseInt(input.value) || 0;
        });
        if (totalTdkMasukInput) totalTdkMasukInput.value = total;
    }
    absensiTdkMasukInputs.forEach(input => {
        if (input) input.addEventListener('input', updateTdkMasukTotal);
    });
    // --- AKHIR KODE AUTO-SUM ---

    calculateAllTotals(); // Panggil sekali saat load

    /**
     * FUNGSI: Menambahkan baris item ke list dinamis
     */
    function addDynamicRow(container, nameClass, valueClass, itemName = "", itemValue = "") {
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'dynamic-list-row';
        let inputType = "text";
        let inputPlaceholder = "Jumlah/Catatan";
        let inputValue = itemValue;
        if (valueClass === 'assy-cup-item-value' || 
            valueClass === 'touch-up-item-value' || 
            valueClass === 'buka-cap-item-value' ||
            valueClass === 'packing-item-value' || 
            valueClass === 'pasang-item-value') {  
            inputType = "number";
            inputPlaceholder = "Jumlah";
            inputValue = itemValue || ''; 
        }
        row.innerHTML = `
            <input type="text" class="${nameClass}" placeholder="Nama Item" value="${itemName}">
            <input type="${inputType}" class="${valueClass}" placeholder="${inputPlaceholder}" value="${inputValue}">
            <button type="button" class="button-remove">
                <span class="material-icons">remove_circle</span>
            </button>
        `;
        container.appendChild(row);
    }

    /**
     * FUNGSI: Mereset list dinamis ke item default
     */
    function resetDynamicList(container, defaultItems, nameClass, valueClass) {
        if (!container) return;
        container.innerHTML = '';
        defaultItems.forEach(item => addDynamicRow(container, nameClass, valueClass, item));
    }

    /**
     * FUNGSI BARU: Mengurai string dari database kembali menjadi baris input
     */
    function deserializeDynamicList(container, nameClass, valueClass, notesString) {
        container.innerHTML = ''; // Kosongkan list
        if (!notesString || notesString.trim() === '') {
             if (container === holderListContainer) resetDynamicList(container, defaultHolderItems, nameClass, valueClass);
             else if (container === pasangListContainer) resetDynamicList(container, defaultPasangItems, nameClass, valueClass);
             else if (container === assyCupListContainer) resetDynamicList(container, defaultAssyCupItems, nameClass, valueClass);
             else if (container === touchUpListContainer) resetDynamicList(container, defaultTouchUpItems, nameClass, valueClass);
             else if (container === bukaCapListContainer) resetDynamicList(container, defaultBukaCapItems, nameClass, valueClass);
            return;
        }
        const items = notesString.split('\n');
        items.forEach(item => {
            const parts = item.split(': ');
            if (parts.length >= 2) {
                const name = parts[0];
                const value = parts.slice(1).join(': ');
                addDynamicRow(container, nameClass, valueClass, name, value);
            } else if (item.trim() !== '') {
                addDynamicRow(container, nameClass, valueClass, item, "");
            }
        });
    }

    // Event listener untuk tombol "Tambah Item"
    if (addHolderItemBtn) addHolderItemBtn.addEventListener('click', () => addDynamicRow(holderListContainer, 'packing-item-name', 'packing-item-value'));
    if (addPasangItemBtn) addPasangItemBtn.addEventListener('click', () => addDynamicRow(pasangListContainer, 'pasang-item-name', 'pasang-item-value'));
    if (addAssyCupItemBtn) addAssyCupItemBtn.addEventListener('click', () => addDynamicRow(assyCupListContainer, 'assy-cup-item-name', 'assy-cup-item-value'));
    if (addTouchUpItemBtn) addTouchUpItemBtn.addEventListener('click', () => addDynamicRow(touchUpListContainer, 'touch-up-item-name', 'touch-up-item-value'));
    if (addBukaCapItemBtn) addBukaCapItemBtn.addEventListener('click', () => addDynamicRow(bukaCapListContainer, 'buka-cap-item-name', 'buka-cap-item-value'));

    // Event listener untuk tombol "Hapus" (Delegasi)
    wusterForm.addEventListener('click', (e) => {
        if (e.target.closest('.button-remove')) {
            const row = e.target.closest('.dynamic-list-row');
            if (!row) return;
            row.remove(); 
            calculateAllDynamicTotals(); 
        }
    });

    // Event listener untuk perubahan input di list dinamis
    wusterForm.addEventListener('input', (e) => {
        const targetClass = e.target.classList;
        if (targetClass.contains('assy-cup-item-value') ||
            targetClass.contains('touch-up-item-value') ||
            targetClass.contains('buka-cap-item-value') ||
            targetClass.contains('packing-item-value') ||
            targetClass.contains('pasang-item-value')) {
            calculateAllDynamicTotals(); 
        }
    });

    /**
     * FUNGSI: Serialisasi data list dinamis (untuk disimpan ke DB)
     */
    function serializeDynamicList(container, nameClass, valueClass) {
        if (!container) return ""; 
        let resultString = "";
        const rows = container.querySelectorAll('.dynamic-list-row');
        rows.forEach(row => {
            const nameInput = row.querySelector(`.${nameClass}`);
            const valueInput = row.querySelector(`.${valueClass}`);
            if (nameInput && valueInput) {
                const name = nameInput.value;
                const value = valueInput.value;
                 if (name || value) {
                    resultString += `${name || ''}: ${value || ''}\n`; 
                }
            }
        });
        return resultString.trim();
    }

    // FUNGSI KALKULASI TOTAL (Performa, Check, Prod)
    function calculateTotal(inputs, totalSpan) {
        if (!totalSpan) return; 
        let sum = 0;
        inputs.forEach(input => { sum += parseInt(input.value) || 0; });
        totalSpan.textContent = sum;
    }

    /**
     * FUNGSI: Menghitung total untuk list dinamis
     */
    function calculateDynamicListTotal(listContainer, valueClass, totalSpan) {
        if (!listContainer || !totalSpan) return;
        let sum = 0;
        const inputs = listContainer.querySelectorAll(`.${valueClass}`);
        inputs.forEach(input => {
            sum += parseInt(input.value) || 0;
        });
        totalSpan.textContent = sum;
    }
    
    /**
     * FUNGSI BARU: Menghitung total HANYA UNTUK 'Total Check'
     */
    function calculateCheckTotal() {
        if (!checkTotalSpan) return;
        let sum = 0;
        sum += parseInt(document.getElementById('total_check_ok').value) || 0;
        sum += parseInt(document.getElementById('total_check_repair').value) || 0;
        sum += parseInt(document.getElementById('total_check_body').value) || 0;
        checkTotalSpan.textContent = sum;
    }

    /**
     * FUNGSI HELPER BARU: Menjalankan semua kalkulasi total
     */
    function calculateAllTotals() {
        calculateTotal(wusterInputs, wusterTotalSpan);
        calculateCheckTotal(); 
        calculateTotal(prodInputs, prodTotalSpan);
        calculateAllDynamicTotals();
        updateMasukTotal();
        updateTdkMasukTotal(); 
    }
    
    function calculateAllDynamicTotals() {
        calculateDynamicListTotal(assyCupListContainer, 'assy-cup-item-value', assyCupTotalSpan);
        calculateDynamicListTotal(touchUpListContainer, 'touch-up-item-value', touchUpTotalSpan);
        calculateDynamicListTotal(bukaCapListContainer, 'buka-cap-item-value', bukaCapTotalSpan);
        calculateDynamicListTotal(holderListContainer, 'packing-item-value', packingHolderTotalSpan); 
        calculateDynamicListTotal(pasangListContainer, 'pasang-item-value', pasangHolderTotalSpan); 
    }

    // Tambahkan event listener ke setiap input kalkulasi
    wusterInputs.forEach(input => input.addEventListener('input', () => calculateTotal(wusterInputs, wusterTotalSpan)));
    checkInputs.forEach(input => input.addEventListener('input', calculateCheckTotal)); 
    prodInputs.forEach(input => input.addEventListener('input', () => calculateTotal(prodInputs, prodTotalSpan)));

    
    /**
     * FUNGSI PDF (TELAH DIMODIFIKASI)
     */
    async function generatePDF(reportId) {
        alert('Membuat PDF... Mohon tunggu.');
        if (!window.jspdf) {
            alert('Gagal memuat library PDF. Pastikan Anda terhubung ke internet.');
            return;
        }
        const { jsPDF } = window.jspdf;
        try {
            // *** REVISI ***: Ambil juga 'jam_kerja'
            const { data: report, error } = await _supabase.from('laporan_wuster').select('*').eq('id', reportId).single();
            if (error) throw new Error(`Gagal mengambil data laporan: ${error.message}`);
            
            // *** REVISI ***
            // Kalkulasi Performa berdasarkan 'jam_kerja'
            let target = 0;
            if (report.jam_kerja === '7 Jam') {
                target = 1680;
            } else if (report.jam_kerja === '5 Jam') {
                target = 1200;
            }
            // Jika 'Lainnya' atau null, target tetap 0

            const isi = report.perf_wuster_isi || 0;
            const kosong = report.perf_wuster_kosong || 0;
            const total = isi + kosong;
            let performance = 0;
            if (target > 0) {
                performance = (total / target) * 100;
            }

            const doc = new jsPDF({ format: 'legal' }); 
            
            // Tambahkan font (jika font-pdf.js sudah di-load)
            if (typeof PTSans != 'undefined') {
                doc.addFileToVFS('PTSans-Regular-normal.ttf', PTSans.normal);
                doc.addFileToVFS('PTSans-Bold-normal.ttf', PTSans.bold);
                doc.addFont('PTSans-Regular-normal.ttf', 'PTSans', 'normal');
                doc.addFont('PTSans-Bold-normal.ttf', 'PTSans', 'bold');
                doc.setFont('PTSans');
            }
            
            const boldTotalRow = (data) => {
                if (data.row.section === 'body' && data.cell.text[0].toLowerCase().includes('total')) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = '#f5f5f5'; 
                    if (data.column.index === 1) {
                         data.cell.styles.halign = 'center';
                    }
                }
            };

            const tableStyles = {
                theme: 'grid', 
                styles: { 
                    cellWidth: 'wrap', 
                    fontSize: 7.5, 
                    cellPadding: 1,  
                    valign: 'middle',
                    font: 'PTSans',
                    textColor: [0, 0, 0] // Hitam Pekat
                }, 
                headStyles: { 
                    fillColor: [41, 128, 185], 
                    textColor: [255, 255, 255], 
                    fontSize: 8, 
                    fontStyle: 'bold',
                    font: 'PTSans' 
                }
            };

            const colWidth = 92.5; const fullWidth = 190;
            const marginX = (doc.internal.pageSize.width - fullWidth) / 2;
            const col1X = marginX; const col2X = marginX + colWidth + 5;
            const marginYSmall = 1; 

            // --- HEADER ---
            doc.setFont('PTSans', 'bold');
            doc.setFontSize(15); doc.text("LAPORAN AKHIR SHIFT", doc.internal.pageSize.width / 2, 14, { align: 'center' });
            doc.setFont('PTSans', 'normal');
            doc.setFontSize(8); 
            doc.setTextColor(0, 0, 0);
            
            // *** REVISI ***: Gabungkan Hari dan Tanggal (Format DD-MM-YYYY)
            const hari = report.hari || getDayNameFromDate(report.tanggal) || '';
            const tanggalFormatted = formatDate_DDMMYYYY(report.tanggal); // <- PANGGIL FUNGSI BARU
            doc.text("TANGGAL", col1X, 22); doc.text(`: ${hari}, ${tanggalFormatted}`, col1X + 30, 22);
            // Hapus baris 'HARI', geser semua ke atas
            doc.text("SHIFT", col1X, 26); doc.text(`: ${report.shift || ''}`, col1X + 30, 26);
            doc.text("TOTAL MASUK", col1X, 30); doc.text(`: ${report.total_masuk || 0} Orang`, col1X + 30, 30);
            doc.text("TOTAL TDK MASUK", col1X, 34); doc.text(`: ${report.total_tdk_masuk_org || 0} Orang`, col1X + 30, 34);
            
            // --- BLOK PERFORMA (Geser ke atas) ---
            const labelOffset = col2X + 30; 
            doc.setFont('PTSans', 'normal');
            doc.text("Target Total", col2X, 22); doc.text(`: ${target.toLocaleString('id-ID')} hanger`, labelOffset, 22);
            doc.text("Act. Isi", col2X, 26); doc.text(`: ${isi.toLocaleString('id-ID')} hanger`, labelOffset, 26);
            doc.text("Kosong", col2X, 30); doc.text(`: ${kosong.toLocaleString('id-ID')} hanger`, labelOffset, 30);
            doc.text("Total", col2X, 34); doc.text(`: ${total.toLocaleString('id-ID')} hanger`, labelOffset, 34);
            doc.setFont('PTSans', 'bold');
            doc.text("Performance", col2X, 38); doc.text(`: ${performance.toFixed(1)} %`, labelOffset, 38);
            doc.setFont('PTSans', 'normal');

            // --- TABEL ABSENSI (Geser Y ke atas) ---
            doc.autoTable({
                startY: 41, // Tetap 41 (karena TDK MASUK butuh space)
                head: [['ABSENSI', 'Masuk (org)', 'Tidak Masuk (Nama)']],
                body: [
                    ['STAFF', report.abs_staff_masuk || 0, report.abs_staff_tdk_masuk || ''], 
                    ['WUSTER', report.abs_wuster_masuk || 0, report.abs_wuster_tdk_masuk || ''], 
                    ['REPAIR & TOUCH UP', report.abs_repair_masuk || 0, report.abs_repair_tdk_masuk || ''], 
                    ['INCOMING, STEP ASSY, BUKA CAP', report.abs_incoming_masuk || 0, report.abs_incoming_tdk_masuk || ''], 
                    ['CHROM, VERIFIKASI, AEROX, REMOVER', report.abs_chrome_masuk || 0, report.abs_chrome_tdk_masuk || ''], 
                    ['PAINTING 4', report.abs_painting_4_masuk || 0, report.abs_painting_4_tdk_masuk || ''], 
                    ['USER & CPC', report.abs_user_cpc_masuk || 0, report.abs_user_cpc_tdk_masuk || ''], 
                    ['MAINTENANCE', report.abs_maintenance_masuk || 0, report.abs_maintenance_tdk_masuk || '']
                ],
                ...tableStyles, 
                didParseCell: boldTotalRow, 
                margin: { left: marginX }, 
                tableWidth: fullWidth, 
                columnStyles: { 
                    0: { cellWidth: 60 }, 
                    1: { cellWidth: 25, halign: 'center' }, 
                    2: { cellWidth: 105 } 
                }
            });
            let startY2Col = doc.autoTable.previous.finalY + marginYSmall;

            function drawSingleTable(title, note, startY, startX, width = colWidth) {
                doc.autoTable({ ...tableStyles, startY: startY, head: [[title]], body: [[note || '']], margin: { left: startX }, tableWidth: width, columnStyles: { 0: { cellWidth: width - 2 } } }); 
                return doc.autoTable.previous.finalY; 
            }
            function drawCalcTable(options) { 
                doc.autoTable({ ...tableStyles, ...options, didParseCell: boldTotalRow }); 
                return doc.autoTable.previous.finalY; 
            }
            
            // ================== MODIFIKASI PDF DI SINI ==================
            function drawDynamicListTable(title, notesString, startY, startX, width = colWidth) {
                // 1. Ambil semua item
                const allItems = (notesString || '').split('\n').filter(item => item.trim() !== '').map(item => { 
                    const parts = item.split(': '); 
                    const name = parts[0] || ''; 
                    const qty = parts.length > 1 ? (parts.slice(1).join(': ') || '0') : '0'; 
                    return [name, qty.trim()]; 
                });

                // 2. Filter item yang nilainya 0
                const filteredItems = allItems.filter(item => {
                    const quantity = parseInt(item[1]) || 0;
                    return quantity > 0; // Hanya simpan jika quantity > 0
                });

                // 3. Hitung total dari item yang sudah difilter
                let total = 0;
                filteredItems.forEach(item => { total += parseInt(item[1]) || 0; });
                
                // 4. Tambahkan baris Total
                filteredItems.push(['Total', total.toString()]); 
                
                const nameWidth = width - 26.5; 
                doc.autoTable({ 
                    ...tableStyles, 
                    startY: startY, 
                    head: [[title, 'QTY']], 
                    body: filteredItems, // 5. Gunakan filteredItems sebagai body
                    margin: { left: startX }, 
                    tableWidth: width, 
                    columnStyles: { 
                        0: { cellWidth: nameWidth }, 
                        1: { cellWidth: 26, halign: 'center' } 
                    }, 
                    didParseCell: boldTotalRow 
                });
                return doc.autoTable.previous.finalY;
            }
            // ================ AKHIR MODIFIKASI PDF ================

            // --- BAGIAN MENGGAMBAR TABEL (KIRI) ---
            let leftY = startY2Col;
            leftY = drawDynamicListTable('Packing Holder', report.packing_holder_notes || '', leftY, col1X);
            leftY = drawDynamicListTable('Pasang Holder', report.pasang_holder_notes || '', leftY + marginYSmall, col1X);
            leftY = drawSingleTable('Problem / Quality', report.problem_quality_notes || '', leftY + marginYSmall, col1X);
            leftY = drawSingleTable('Suplay Material', report.suplay_material_notes || '', leftY + marginYSmall, col1X);
            leftY = drawSingleTable('Packing Box / Lory', report.packing_box_notes || '', leftY + marginYSmall, col1X);
            leftY = drawSingleTable('Trouble Mesin', report.trouble_mesin_notes || '', leftY + marginYSmall, col1X);

            const prodTotal = (report.total_prod_fresh || 0) + (report.total_prod_repair || 0) + (report.total_prod_ng || 0);
            leftY = drawCalcTable({ startY: leftY + marginYSmall, head: [['TOTAL PRODUKSI', 'Jumlah']], body: [['Fresh', report.total_prod_fresh || 0], ['Repair', report.total_prod_repair || 0], ['NG', report.total_prod_ng || 0], ['Total', prodTotal]], margin: { left: col1X }, tableWidth: colWidth, columnStyles: { 0: { cellWidth: 54.5, fontStyle: 'bold' }, 1: { cellWidth: 38, halign: 'center' } } }); 

            const checkTotal = (report.total_check_ok || 0) + (report.total_check_repair || 0) + (report.total_check_body || 0);
            leftY = drawCalcTable({ startY: leftY + marginYSmall, head: [['TOTAL CHECK', 'Jumlah']], body: [['OK', report.total_check_ok || 0], ['NG', report.total_check_ng || 0], ['Repair', report.total_check_repair || 0], ['Body', report.total_check_body || 0], ['Total', checkTotal]], margin: { left: col1X }, tableWidth: colWidth, columnStyles: { 0: { cellWidth: 54.5, fontStyle: 'bold' }, 1: { cellWidth: 38, halign: 'center' } } }); 
            
            // --- BAGIAN MENGGAMBAR TABEL (KANAN) ---
            let rightY = startY2Col; 
            rightY = drawDynamicListTable('Hasil Assy Cup', report.hasil_assy_cup_notes || '', rightY, col2X);
            rightY = drawDynamicListTable('Hasil Touch Up', report.hasil_touch_up_notes || '', rightY + marginYSmall, col2X);
            rightY = drawDynamicListTable('Hasil Buka Cap', report.hasil_buka_cap_notes || '', rightY + marginYSmall, col2X);
            
            const wusterTotal = (report.perf_wuster_isi || 0) + (report.perf_wuster_kosong || 0);
            rightY = drawCalcTable({ startY: rightY + marginYSmall, head: [['PERFORMA WUSTER', 'Jumlah']], body: [['Hanger Isi', report.perf_wuster_isi || 0], ['Hanger Kosong', report.perf_wuster_kosong || 0], ['Total', wusterTotal]], margin: { left: col2X }, tableWidth: colWidth, columnStyles: { 0: { cellWidth: 54.5, fontStyle: 'bold' }, 1: { cellWidth: 38, halign: 'center' } } }); 
            
            doc.autoTable({ 
                startY: rightY + marginYSmall, 
                head: [['LAIN-LAIN', 'Catatan']], 
                body: [['Lost Time', report.lost_time_notes || ''], ['Hanger', report.hanger_notes || '']], 
                ...tableStyles, 
                didParseCell: boldTotalRow,
                margin: { left: col2X }, 
                tableWidth: colWidth, 
                columnStyles: { 0: { cellWidth: 54.5, fontStyle: 'bold' }, 1: { cellWidth: 38, halign: 'center' } } 
            });
            rightY = doc.autoTable.previous.finalY; 
            
            // --- BAGIAN FOOTER (TANDA TANGAN) ---
            let currentY = Math.max(leftY || 0, rightY || 0) + marginYSmall;
            if (isNaN(currentY)) { currentY = 300; } 
            let finalY = currentY + 6; 
            
            // === AWAL MODIFIKASI ===
            const preparerNameRaw = (currentKaryawan && currentKaryawan.nama_lengkap) || (currentUser && currentUser.email) || 'N/A';
            const preparerJabatanRaw = (currentKaryawan && currentKaryawan.jabatan) || '( Jabatan )'; // <- BARIS BARU
            const chiefNameRaw = report.chief_name || '( .......................... )';
            const preparerName = String(preparerNameRaw || 'N/A');
            const preparerJabatan = String(preparerJabatanRaw || '( Jabatan )'); // <- BARIS BARU
            const chiefName = String(chiefNameRaw || '( .......................... )');
            // === AKHIR MODIFIKASI ===

            doc.setFont('PTSans', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0); 
            doc.text("Dibuat,", col1X, finalY); 
            doc.text(preparerName, col1X, finalY + 10); 
            doc.text(preparerJabatan, col1X, finalY + 14); // <- INI YANG DIGANTI
            doc.text("Disetujui,", doc.internal.pageSize.width / 2, finalY, { align: 'center' }); 
            doc.text(chiefName, doc.internal.pageSize.width / 2, finalY + 10, { align: 'center' }); 
            doc.text("Chief", doc.internal.pageSize.width / 2, finalY + 14, { align: 'center' }); 
            doc.text("Mengetahui,", doc.internal.pageSize.width - marginX, finalY, { align: 'right' }); 
            doc.text("SINGGIH E W", doc.internal.pageSize.width - marginX, finalY + 10, { align: 'right' }); 
            doc.text("Dept Head", doc.internal.pageSize.width - marginX, finalY + 14, { align: 'right' }); 


            // *** TAMBAHAN BINGKAI ***
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const margin = 8; // Margin 8mm
            
            doc.setLineWidth(0.5); // Ketebalan garis 0.5mm
            doc.setDrawColor(0, 0, 0); // Warna hitam
            doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
            // *** AKHIR TAMBAHAN BINGKAI ***


            doc.save(`Laporan_Wuster_${report.tanggal}_Shift${report.shift}.pdf`);
        } catch (error) {
            alert(`Gagal membuat PDF: ${error.message}`);
            console.error('PDF Generation Error:', error);
        }
    }
    /**
     * FUNGSI BARU: Memuat draft laporan
     */
    async function loadWusterDrafts() {
        if (!draftListEl) return;
        draftListEl.innerHTML = '<tr><td colspan="4">Memuat draft...</td></tr>';
        
        const { data, error } = await _supabase
            .from('laporan_wuster')
            .select('id, tanggal, shift, created_at')
            .eq('status', 'draft') 
            .eq('user_id', currentUser.id) 
            .order('created_at', { ascending: false });

        if (error) {
            draftListEl.innerHTML = `<tr><td colspan="4" style="color: red;">Error: ${error.message}</td></tr>`; return;
        }
        if (data.length === 0) {
            draftListEl.innerHTML = '<tr><td colspan="4">Tidak ada draft tersimpan.</td></tr>';
        } else {
            draftListEl.innerHTML = '';
            data.forEach(laporan => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${laporan.tanggal || 'N/A'}</td>
                    <td>${laporan.shift || 'N/A'}</td>
                    <td>${new Date(laporan.created_at).toLocaleString('id-ID')}</td>
                    <td class="history-actions">
                        <button class="button-edit" data-id="${laporan.id}"><span class="material-icons">edit</span> Lanjutkan</button>
                        <button class="button-danger button-delete-draft" data-id="${laporan.id}"><span class="material-icons">delete</span> Hapus</button>
                    </td>
                `;
                draftListEl.appendChild(row);
                
                row.querySelector('.button-edit').addEventListener('click', (e) => {
                    loadReportForEditing(e.currentTarget.getAttribute('data-id'));
                });
                row.querySelector('.button-delete-draft').addEventListener('click', async (e) => {
                    const idToDelete = e.currentTarget.getAttribute('data-id');
                    if (confirm('Anda yakin ingin menghapus draft ini?')) {
                        const { error } = await _supabase
                            .from('laporan_wuster')
                            .delete()
                            .eq('id', idToDelete);
                        if (error) {
                            alert('Gagal menghapus draft: ' + error.message);
                        } else {
                            await loadWusterDrafts(); 
                        }
                    }
                });
            });
        }
    }

    /**
     * Fungsi: Memuat riwayat laporan
     */
    async function loadWusterHistory() {
        if (!historyListEl) return;
        historyListEl.innerHTML = '<tr><td colspan="5">Memuat riwayat...</td></tr>';
        
        const { count, error: countError } = await _supabase
            .from('laporan_wuster')
            .select('*', { count: 'exact', head: true })
            .or('status.eq.published,status.is.null'); 
            
        if (countError) {
            historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${countError.message}</td></tr>`; return;
        }
        
        totalReports = count;
        const totalPages = Math.ceil(totalReports / itemsPerPage) || 1;
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error } = await _supabase.from('laporan_wuster')
            .select('id, tanggal, shift, total_masuk, created_at')
            .or('status.eq.published,status.is.null') 
            .order('created_at', { ascending: false }).range(from, to);
            
        if (error) {
            historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${error.message}</td></tr>`; return;
        }
        if (data.length === 0) {
            historyListEl.innerHTML = '<tr><td colspan="5">Belum ada riwayat.</td></tr>';
        } else {
            historyListEl.innerHTML = '';
            data.forEach(laporan => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${laporan.tanggal}</td>
                    <td>${laporan.shift}</td>
                    <td>${laporan.total_masuk}</td>
                    <td>${new Date(laporan.created_at).toLocaleString('id-ID')}</td>
                    <td class="history-actions">
                        <button class="button-edit" data-id="${laporan.id}"><span class="material-icons">edit</span> Edit</button>
                        <button class="button-pdf" data-id="${laporan.id}"><span class="material-icons">picture_as_pdf</span> PDF</button>
                    </td>
                `;
                historyListEl.appendChild(row);
                
                row.querySelector('.button-edit').addEventListener('click', (e) => {
                    loadReportForEditing(e.currentTarget.getAttribute('data-id'));
                });
                row.querySelector('.button-pdf').addEventListener('click', (e) => generatePDF(e.currentTarget.getAttribute('data-id')));
            });
        }
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevButton.disabled = (currentPage === 1);
        nextButton.disabled = (currentPage === totalPages) || (totalReports === 0);
    }

    /**
     * FUNGSI BARU: Memuat data laporan ke form untuk diedit
     */
    async function loadReportForEditing(reportId) {
        formMessageEl.textContent = 'Memuat data laporan...';
        const { data: report, error } = await _supabase
            .from('laporan_wuster')
            .select('*')
            .eq('id', reportId)
            .single();

        if (error) {
            alert('Gagal memuat data laporan: ' + error.message);
            formMessageEl.textContent = '';
            return;
        }

        // Isi semua field
        // *** REVISI ***: 'hari' tidak di-load, 'jam_kerja' di-load
        // document.getElementById('hari').value = report.hari; // <- HAPUS
        document.getElementById('tanggal').value = report.tanggal;
        document.getElementById('shift').value = report.shift;
        document.getElementById('chief_name').value = report.chief_name;
        document.getElementById('jam_kerja').value = report.jam_kerja; // <- TAMBAH
        document.getElementById('total_masuk').value = report.total_masuk;
        document.getElementById('total_tdk_masuk_org').value = report.total_tdk_masuk_org; 
        document.getElementById('abs_staff_masuk').value = report.abs_staff_masuk;
        document.getElementById('abs_staff_tdk_masuk_org').value = report.abs_staff_tdk_masuk_org; 
        document.getElementById('abs_staff_tdk_masuk').value = report.abs_staff_tdk_masuk;
        document.getElementById('abs_wuster_masuk').value = report.abs_wuster_masuk;
        document.getElementById('abs_wuster_tdk_masuk_org').value = report.abs_wuster_tdk_masuk_org; 
        document.getElementById('abs_wuster_tdk_masuk').value = report.abs_wuster_tdk_masuk;
        document.getElementById('abs_repair_masuk').value = report.abs_repair_masuk;
        document.getElementById('abs_repair_tdk_masuk_org').value = report.abs_repair_tdk_masuk_org; 
        document.getElementById('abs_repair_tdk_masuk').value = report.abs_repair_tdk_masuk;
        document.getElementById('abs_incoming_masuk').value = report.abs_incoming_masuk;
        document.getElementById('abs_incoming_tdk_masuk_org').value = report.abs_incoming_tdk_masuk_org; 
        document.getElementById('abs_incoming_tdk_masuk').value = report.abs_incoming_tdk_masuk;
        document.getElementById('abs_chrome_masuk').value = report.abs_chrome_masuk;
        document.getElementById('abs_chrome_tdk_masuk_org').value = report.abs_chrome_tdk_masuk_org; 
        document.getElementById('abs_chrome_tdk_masuk').value = report.abs_chrome_tdk_masuk;
        document.getElementById('abs_painting_4_masuk').value = report.abs_painting_4_masuk;
        document.getElementById('abs_painting_4_tdk_masuk_org').value = report.abs_painting_4_tdk_masuk_org; 
        document.getElementById('abs_painting_4_tdk_masuk').value = report.abs_painting_4_tdk_masuk;
        document.getElementById('abs_user_cpc_masuk').value = report.abs_user_cpc_masuk;
        document.getElementById('abs_user_cpc_tdk_masuk_org').value = report.abs_user_cpc_tdk_masuk_org; 
        document.getElementById('abs_user_cpc_tdk_masuk').value = report.abs_user_cpc_tdk_masuk;
        document.getElementById('abs_maintenance_masuk').value = report.abs_maintenance_masuk;
        document.getElementById('abs_maintenance_tdk_masuk_org').value = report.abs_maintenance_tdk_masuk_org; 
        document.getElementById('abs_maintenance_tdk_masuk').value = report.abs_maintenance_tdk_masuk;
        document.getElementById('problem_quality_notes').value = report.problem_quality_notes;
        document.getElementById('suplay_material_notes').value = report.suplay_material_notes;
        document.getElementById('packing_box_notes').value = report.packing_box_notes;
        document.getElementById('trouble_mesin_notes').value = report.trouble_mesin_notes;
        document.getElementById('perf_wuster_isi').value = report.perf_wuster_isi;
        document.getElementById('perf_wuster_kosong').value = report.perf_wuster_kosong;
        document.getElementById('total_check_ok').value = report.total_check_ok;
        document.getElementById('total_check_ng').value = report.total_check_ng;
        document.getElementById('total_check_repair').value = report.total_check_repair;
        document.getElementById('total_check_body').value = report.total_check_body;
        document.getElementById('total_prod_fresh').value = report.total_prod_fresh;
        document.getElementById('total_prod_repair').value = report.total_prod_repair;
        document.getElementById('total_prod_ng').value = report.total_prod_ng;
        document.getElementById('lost_time_notes').value = report.lost_time_notes;
        document.getElementById('hanger_notes').value = report.hanger_notes;

        // Isi dynamic lists
        deserializeDynamicList(holderListContainer, 'packing-item-name', 'packing-item-value', report.packing_holder_notes);
        deserializeDynamicList(pasangListContainer, 'pasang-item-name', 'pasang-item-value', report.pasang_holder_notes);
        deserializeDynamicList(assyCupListContainer, 'assy-cup-item-name', 'assy-cup-item-value', report.hasil_assy_cup_notes);
        deserializeDynamicList(touchUpListContainer, 'touch-up-item-name', 'touch-up-item-value', report.hasil_touch_up_notes);
        deserializeDynamicList(bukaCapListContainer, 'buka-cap-item-name', 'buka-cap-item-value', report.hasil_buka_cap_notes);

        // Hitung ulang semua total
        calculateAllTotals();
        
        // Atur state form
        currentlyEditingId = reportId; 
        formTitleEl.textContent = `Mengedit Laporan (Tanggal: ${report.tanggal}, Shift: ${report.shift})`;
        mainSubmitBtn.textContent = 'Update Laporan Final';
        saveDraftBtn.textContent = 'Update Draft';
        cancelEditBtn.style.display = 'inline-block'; 
        formMessageEl.textContent = 'Data berhasil dimuat. Silakan edit.';
        wusterForm.scrollIntoView({ behavior: 'smooth' }); 
    }

    /**
     * FUNGSI BARU: Mengosongkan form dan mereset state
     */
   function resetFormAndState() {
    wusterForm.reset(); 
    currentlyEditingId = null; 

    // Reset semua list dinamis ke default
    resetDynamicList(holderListContainer, defaultHolderItems, 'packing-item-name', 'packing-item-value');
    resetDynamicList(pasangListContainer, defaultPasangItems, 'pasang-item-name', 'pasang-item-value');
    resetDynamicList(assyCupListContainer, defaultAssyCupItems, 'assy-cup-item-name', 'assy-cup-item-value');
    resetDynamicList(touchUpListContainer, defaultTouchUpItems, 'touch-up-item-name', 'touch-up-item-value');
    resetDynamicList(bukaCapListContainer, defaultBukaCapItems, 'buka-cap-item-name', 'buka-cap-item-value');

    // Hitung ulang semua total (jadi 0)
    calculateAllTotals();
        
    // *** REVISI ***
    // 'jam_kerja' direset, 'hari' tidak ada
    document.getElementById('jam_kerja').value = ""; // <- TAMBAH
        
    // Kembalikan teks tombol dan judul
    formTitleEl.textContent = 'Buat Laporan Baru';
    mainSubmitBtn.textContent = 'Simpan Laporan Final';
    saveDraftBtn.textContent = 'Simpan Draft';
    cancelEditBtn.style.display = 'none'; 
    formMessageEl.textContent = '';
    }

    // Event listener untuk tombol "Batal Edit"
    cancelEditBtn.addEventListener('click', resetFormAndState);


    /**
     * FUNGSI BARU: Mengumpulkan semua data form ke 1 objek
     */
    function getFormData() {
        // *** REVISI ***: Ambil tanggal, hitung hari, ambil jam_kerja
        const tanggalValue = document.getElementById('tanggal').value;
        const hariValue = getDayNameFromDate(tanggalValue); // <- Otomatis hitung hari
        const jamKerjaValue = document.getElementById('jam_kerja').value; // <- Ambil jam kerja
        
        return {
            user_id: currentUser.id,
            hari: hariValue, // <- Simpan hari yang dihitung
            tanggal: tanggalValue,
            jam_kerja: jamKerjaValue, // <- Simpan jam kerja
            shift: parseInt(document.getElementById('shift').value),
            chief_name: document.getElementById('chief_name').value,
            total_masuk: parseInt(document.getElementById('total_masuk').value),
            total_tdk_masuk_org: parseInt(document.getElementById('total_tdk_masuk_org').value) || 0, 
            abs_staff_masuk: parseInt(document.getElementById('abs_staff_masuk').value) || 0,
            abs_staff_tdk_masuk_org: parseInt(document.getElementById('abs_staff_tdk_masuk_org').value) || 0, 
            abs_staff_tdk_masuk: document.getElementById('abs_staff_tdk_masuk').value,
            abs_wuster_masuk: parseInt(document.getElementById('abs_wuster_masuk').value) || 0,
            abs_wuster_tdk_masuk_org: parseInt(document.getElementById('abs_wuster_tdk_masuk_org').value) || 0, 
            abs_wuster_tdk_masuk: document.getElementById('abs_wuster_tdk_masuk').value,
            abs_repair_masuk: parseInt(document.getElementById('abs_repair_masuk').value) || 0,
            abs_repair_tdk_masuk_org: parseInt(document.getElementById('abs_repair_tdk_masuk_org').value) || 0, 
            abs_repair_tdk_masuk: document.getElementById('abs_repair_tdk_masuk').value,
            abs_incoming_masuk: parseInt(document.getElementById('abs_incoming_masuk').value) || 0,
            abs_incoming_tdk_masuk_org: parseInt(document.getElementById('abs_incoming_tdk_masuk_org').value) || 0, 
            abs_incoming_tdk_masuk: document.getElementById('abs_incoming_tdk_masuk').value,
            abs_chrome_masuk: parseInt(document.getElementById('abs_chrome_masuk').value) || 0,
            abs_chrome_tdk_masuk_org: parseInt(document.getElementById('abs_chrome_tdk_masuk_org').value) || 0, 
            abs_chrome_tdk_masuk: document.getElementById('abs_chrome_tdk_masuk').value,
            abs_painting_4_masuk: parseInt(document.getElementById('abs_painting_4_masuk').value) || 0,
            abs_painting_4_tdk_masuk_org: parseInt(document.getElementById('abs_painting_4_tdk_masuk_org').value) || 0, 
            abs_painting_4_tdk_masuk: document.getElementById('abs_painting_4_tdk_masuk').value,
            abs_user_cpc_masuk: parseInt(document.getElementById('abs_user_cpc_masuk').value) || 0,
            abs_user_cpc_tdk_masuk_org: parseInt(document.getElementById('abs_user_cpc_tdk_masuk_org').value) || 0, 
            abs_user_cpc_tdk_masuk: document.getElementById('abs_user_cpc_tdk_masuk').value,
            abs_maintenance_masuk: parseInt(document.getElementById('abs_maintenance_masuk').value) || 0,
            abs_maintenance_tdk_masuk_org: parseInt(document.getElementById('abs_maintenance_tdk_masuk_org').value) || 0, 
            abs_maintenance_tdk_masuk: document.getElementById('abs_maintenance_tdk_masuk').value,
            packing_holder_notes: serializeDynamicList(holderListContainer, 'packing-item-name', 'packing-item-value'),
            pasang_holder_notes: serializeDynamicList(pasangListContainer, 'pasang-item-name', 'pasang-item-value'),
            problem_quality_notes: document.getElementById('problem_quality_notes').value,
            suplay_material_notes: document.getElementById('suplay_material_notes').value,
            packing_box_notes: document.getElementById('packing_box_notes').value,
            trouble_mesin_notes: document.getElementById('trouble_mesin_notes').value,
            hasil_assy_cup_notes: serializeDynamicList(assyCupListContainer, 'assy-cup-item-name', 'assy-cup-item-value'),
            hasil_touch_up_notes: serializeDynamicList(touchUpListContainer, 'touch-up-item-name', 'touch-up-item-value'),
            hasil_buka_cap_notes: serializeDynamicList(bukaCapListContainer, 'buka-cap-item-name', 'buka-cap-item-value'),
            perf_wuster_isi: parseInt(document.getElementById('perf_wuster_isi').value) || 0,
            perf_wuster_kosong: parseInt(document.getElementById('perf_wuster_kosong').value) || 0,
            total_check_ok: parseInt(document.getElementById('total_check_ok').value) || 0,
            total_check_ng: parseInt(document.getElementById('total_check_ng').value) || 0,
            total_check_repair: parseInt(document.getElementById('total_check_repair').value) || 0,
            total_check_body: parseInt(document.getElementById('total_check_body').value) || 0,
            total_prod_fresh: parseInt(document.getElementById('total_prod_fresh').value) || 0,
            total_prod_repair: parseInt(document.getElementById('total_prod_repair').value) || 0,
            total_prod_ng: parseInt(document.getElementById('total_prod_ng').value) || 0,
            lost_time_notes: document.getElementById('lost_time_notes').value,
            hanger_notes: document.getElementById('hanger_notes').value
        };
    }

    /**
     * FUNGSI BARU: Logika submit yang di-refactor
     */
    async function handleFormSubmit(isDraft = false) {
        if (!currentUser) {
            formMessageEl.textContent = 'Error: Sesi tidak ditemukan. Harap refresh.'; return;
        }
        formMessageEl.textContent = 'Menyimpan...';

        const laporanData = getFormData();
        
        // Validasi
        if (!laporanData.tanggal || !laporanData.shift || !laporanData.jam_kerja) {
            formMessageEl.textContent = 'Error: Tanggal, Shift, dan Jam Kerja wajib diisi.';
            return;
        }
        
        laporanData.status = isDraft ? 'draft' : 'published'; 

        let error;
        if (currentlyEditingId) {
            // MODE UPDATE 
            const { error: updateError } = await _supabase
                .from('laporan_wuster')
                .update(laporanData)
                .eq('id', currentlyEditingId);
            error = updateError;
        } else {
            // MODE INSERT 
            const { error: insertError } = await _supabase
                .from('laporan_wuster')
                .insert(laporanData);
            error = insertError;
        }

        if (error) {
            formMessageEl.textContent = `Error: ${error.message}`;
            console.error('Submit Error:', error);
        } else {
            formMessageEl.textContent = `Laporan berhasil disimpan sebagai ${isDraft ? 'Draft' : 'Final'}!`;
            resetFormAndState(); 
            
            await loadWusterDrafts(); 
            currentPage = 1; 
            await loadWusterHistory(); 
            
            setTimeout(() => { formMessageEl.textContent = ''; }, 3000);
        }
    }

    // Event listener "Simpan Laporan Final" (submit utama)
    wusterForm.onsubmit = async (event) => {
        event.preventDefault();
        await handleFormSubmit(false); 
    };

    // Event listener "Simpan Draft"
    saveDraftBtn.addEventListener('click', async () => {
        await handleFormSubmit(true); 
    });


    // (Event listener pagination tidak berubah)
    prevButton.addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadWusterHistory(); } });
    nextButton.addEventListener('click', () => { const totalPages = Math.ceil(totalReports / itemsPerPage); if (currentPage < totalPages) { currentPage++; loadWWusterHistory(); } });

    /**
     * Fungsi Inisialisasi Halaman
     * (Dibungkus DOMContentLoaded)
     */
    (async () => {
        // Cek sesi dan data user
        let session;
        try {
            session = await getActiveUserSession(); 
            if (!session) {
                alert('Anda harus login terlebih dahulu!');
                window.location.href = 'index.html';
                return;
            }
            currentUser = session.user;
            currentKaryawan = await loadSharedDashboardData(currentUser); 
        } catch (error) {
            console.error("Error saat inisialisasi user:", error);
            alert('Gagal memuat data user. Cek koneksi dan coba lagi.');
            return; 
        }

        // Jalankan reset form untuk set nilai default
        resetFormAndState();
        
        // Muat riwayat & draft
        try {
            await loadWusterDrafts();
            await loadWusterHistory();
        } catch (error) {
            console.error("Gagal memuat data:", error);
            if (historyListEl) historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Gagal memuat riwayat.</td></tr>`;
            if (draftListEl) draftListEl.innerHTML = `<tr><td colspan="4" style="color: red;">Gagal memuat draft.</td></tr>`;
        }
    })();

}); // Akhir dari DOMContentLoaded