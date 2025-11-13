// =================================================================
// E. LOGIKA HALAMAN REPAIR (repair.html)
// (MODIFIKASI: Font PDF diperkecil, item list 0 QTY disembunyikan)
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    const repairForm = document.getElementById('repair-form');
    // Jika tidak ada form, hentikan script ini
    if (!repairForm) return; 

    let currentUser = null;
    let currentKaryawan = null;
    let currentlyEditingId = null;

    const historyListEl = document.getElementById('repair-history-list')?.getElementsByTagName('tbody')[0];
    const draftListEl = document.getElementById('repair-draft-list')?.getElementsByTagName('tbody')[0];
    const formMessageEl = document.getElementById('form-message');
    const formTitleEl = document.getElementById('form-title');

    // Tombol Form
    const mainSubmitBtn = document.getElementById('main-submit-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // State PAGINATION
    const itemsPerPage = 10;
    let currentPage = 1;
    let totalReports = 0;
    const prevButton = document.getElementById('prev-page-btn');
    const nextButton = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');

    // Variabel List Dinamis (Hasil Touch Up)
    const touchUpListContainer = document.getElementById('touch-up-list');
    const addTouchUpItemBtn = document.getElementById('add-touch-up-item-btn');
    const defaultTouchUpItems = ["C/C 1DY 1", "C/C 1DY 2", "C/C 5WX", "C/E 9307 FRESH", "C/E 9307 A/MCH"];
    const touchUpTotalSpan = document.getElementById('touch-up-total');

    // === TAMBAHAN BARU: Variabel List Dinamis (Hasil Assy Cup) ===
    const assyCupListContainer = document.getElementById('assy-cup-list');
    const addAssyCupItemBtn = document.getElementById('add-assy-cup-item-btn');
    const defaultAssyCupItems = ["MC 2DP FR", "MC 2DP RR", "MC K1ZV ABS", "MC K1ZV CBS", "MC K15A", "MC K2SA", "MC K3VA", "MC XD 831"];
    const assyCupTotalSpan = document.getElementById('assy-cup-total');
    // === AKHIR TAMBAHAN ===
    
    // Variabel Total (Main Power)
    const mpInputs = document.querySelectorAll('.mp-calc'); 
    const mpTotalInput = document.getElementById('mp_total');


    /**
     * FUNGSI: Menghitung total Main Power
     */
    function updateMainPowerTotal() {
        if (!mpTotalInput) return;
        let total = 0;
        mpInputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });
        mpTotalInput.value = total;
    }
    // Tambahkan event listener ke setiap input Main Power
    mpInputs.forEach(input => input.addEventListener('input', updateMainPowerTotal));


    // ===== AWAL FUNGSI AUTO-SUM ACTIVITY (GAMBAR 2) =====
    /**
     * FUNGSI: Menghitung total untuk satu baris di grid Activity
     * @param {string} rowSuffix - (cth: 'in_repair', 'hasil_repair')
     */
    function updateActivityRowTotal(rowSuffix) {
        const totalInput = document.getElementById(`act_${rowSuffix}_total`);
        if (!totalInput) return;

        let total = 0;
        const rowInputs = document.querySelectorAll(`.act-calc-${rowSuffix}`);
        rowInputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });
        totalInput.value = total;
    }

    /**
     * FUNGSI: Menambahkan event listener ke semua 54 input di grid Activity
     */
    function addActivityListeners() {
        const rowSuffixes = ['in_repair', 'hasil_repair', 'out_repair', 'in_remover', 'hasil_remover', 'out_remover'];
        
        rowSuffixes.forEach(suffix => {
            const inputs = document.querySelectorAll(`.act-calc-${suffix}`);
            inputs.forEach(input => {
                // Saat input diubah, panggil fungsi kalkulasi untuk baris itu
                input.addEventListener('input', () => updateActivityRowTotal(suffix));
            });
        });
    }
    // Panggil fungsi ini sekali untuk memasang listener
    addActivityListeners();
    // ===== AKHIR FUNGSI AUTO-SUM ACTIVITY =====


    /**
     * FUNGSI: Menambahkan baris item ke list dinamis
     */
    function addDynamicRow(container, nameClass, valueClass, itemName = "", itemValue = "") {
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'dynamic-list-row';

        row.innerHTML = `
            <input type="text" class="${nameClass}" placeholder="Nama Part" value="${itemName}">
            <input type="number" class="${valueClass}" placeholder="QTY" value="${itemValue || ''}">
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
     * FUNGSI: Mengurai string dari database kembali menjadi baris input
     */
    function deserializeDynamicList(container, nameClass, valueClass, notesString, defaultItems) { // Terima defaultItems
        container.innerHTML = ''; // Kosongkan list
        if (!notesString || notesString.trim() === '') {
            // Jika tidak ada notes, reset ke default
            // === MODIFIKASI: Gunakan defaultItems yang dikirim ===
            if (defaultItems) {
                resetDynamicList(container, defaultItems, nameClass, valueClass);
            }
            // === AKHIR MODIFIKASI ===
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
    if (addTouchUpItemBtn) addTouchUpItemBtn.addEventListener('click', () => addDynamicRow(touchUpListContainer, 'touchup-item-name', 'touchup-item-value'));
    // === TAMBAHAN BARU ===
    if (addAssyCupItemBtn) addAssyCupItemBtn.addEventListener('click', () => addDynamicRow(assyCupListContainer, 'assy-cup-item-name', 'assy-cup-item-value'));
    // === AKHIR TAMBAHAN ===

    // Event listener untuk tombol "Hapus" (Delegasi)
    repairForm.addEventListener('click', (e) => {
        if (e.target.closest('.button-remove')) {
            const row = e.target.closest('.dynamic-list-row');
            if (!row) return;
            row.remove(); // Hapus baris
            calculateAllTotals(); // Hitung ulang total
        }
    });

    // Event listener untuk perubahan input di list dinamis
    repairForm.addEventListener('input', (e) => {
        // === MODIFIKASI: Tambah pengecekan untuk assy-cup-item-value ===
        if (e.target.classList.contains('touchup-item-value') || 
            e.target.classList.contains('assy-cup-item-value')) {
            calculateAllTotals(); // Hitung ulang total
        }
        // === AKHIR MODIFIKASI ===
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
     * FUNGSI HELPER: Menjalankan semua kalkulasi total
     */
    function calculateAllTotals() {
        updateMainPowerTotal();
        calculateDynamicListTotal(touchUpListContainer, 'touchup-item-value', touchUpTotalSpan);
        // === TAMBAHAN BARU ===
        calculateDynamicListTotal(assyCupListContainer, 'assy-cup-item-name', assyCupTotalSpan);
        // === AKHIR TAMBAHAN ===
        
        // Hitung ulang total untuk semua baris Activity
        const rowSuffixes = ['in_repair', 'hasil_repair', 'out_repair', 'in_remover', 'hasil_remover', 'out_remover'];
        rowSuffixes.forEach(suffix => updateActivityRowTotal(suffix));
    }
    

    /**
     * FUNGSI PDF (Diperbarui dengan Border Pinggir)
     */
    async function generatePDF(reportId) {
        alert('Membuat PDF... Mohon tunggu.');
        if (!window.jspdf) {
            alert('Gagal memuat library PDF. Pastikan Anda terhubung ke internet.');
            return;
        }
        const { jsPDF } = window.jspdf;
        try {
            const { data: report, error } = await _supabase.from('laporan_repair').select('*').eq('id', reportId).single();
            if (error) throw new Error(`Gagal mengambil data laporan: ${error.message}`);
            
            const doc = new jsPDF({ format: 'a4' }); // Ukuran A4
            
            // === TAMBAHAN BARU: Border Hitam Pinggir (A4) ===
            const pageWidth = doc.internal.pageSize.getWidth(); // A4 width
            const pageHeight = doc.internal.pageSize.getHeight(); // A4 height
            const margin = 10; // Margin 10mm
            doc.setDrawColor(0, 0, 0); // Warna border hitam
            doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2)); // Gambar kotak
            // === AKHIR TAMBAHAN ===

            // ================== MODIFIKASI FONT & PADDING ==================
            const tableStyles = {
                theme: 'grid', 
                styles: { 
                    cellWidth: 'wrap', 
                    fontSize: 7,       // <-- Diperkecil dari 8
                    cellPadding: 0.8   // <-- Dirapatkan dari 1
                }, 
                headStyles: { 
                    fillColor: [22, 160, 133], 
                    textColor: [255, 255, 255], 
                    fontSize: 8,       // <-- Diperkecil dari 9
                    fontStyle: 'bold',
                    lineColor: [0, 0, 0], 
                    lineWidth: 0.1,
                    cellPadding: 0.8   // <-- Dirapatkan dari 1
                } 
            };
            // ================== AKHIR MODIFIKASI FONT ==================

            const marginX = 15; // Margin konten (biar ada jarak dari border)
            const fullWidth = doc.internal.pageSize.width - (marginX * 2);
            let currentY = 15;

            doc.setFontSize(16); doc.text("LAPORAN INTERNAL PAINTING", doc.internal.pageSize.width / 2, currentY, { align: 'center' });
            currentY += 5;
            doc.setFontSize(12); doc.text("LINE REPAIR AND TOUCHUP", doc.internal.pageSize.width / 2, currentY, { align: 'center' });
            currentY += 10;
            
            doc.setFontSize(9); 
            doc.text("HARI", marginX, currentY); doc.text(`: ${report.hari || ''}`, marginX + 30, currentY);
            currentY += 5; 
            doc.text("TANGGAL", marginX, currentY); doc.text(`: ${report.tanggal || ''}`, marginX + 30, currentY);
            currentY += 5; 
            doc.text("SHIFT", marginX, currentY); doc.text(`: ${report.shift || ''}`, marginX + 30, currentY);
            currentY += 8; 

            // ================== AWAL MODIFIKASI PDF LAYOUT ==================
            
            const topSectionY = currentY; // Simpan Y awal
            const leftColX = marginX;
            const leftColWidth = 80; // Lebar tabel Main Power
            const rightColX = marginX + leftColWidth + 5; // Posisi X kolom kanan
            const rightColWidth = fullWidth - leftColWidth - 5; // Lebar sisa untuk kolom kanan

            // --- Tabel Main Power (KIRI) ---
            doc.autoTable({
                startY: topSectionY,
                head: [['MAIN POWER', 'Jumlah / Nama']],
                body: [
                    ['Masuk: REPAIR', report.mp_masuk_repair],
                    ['Masuk: TOUCH UP', report.mp_masuk_touchup],
                    ['Ijin', report.mp_ijin || ''], 
                    ['Off', report.mp_off || ''], 
                    ['Sakit', report.mp_sakit || ''], 
                    ['Total (Masuk)', report.mp_total], 
                ],
                ...tableStyles,
                margin: { left: leftColX },
                tableWidth: leftColWidth, 
                didParseCell: (data) => {
                    if (data.row.index === 5) { data.cell.styles.fontStyle = 'bold'; } 
                    if (data.column.index === 0) { data.cell.styles.fontStyle = 'bold'; } 
                }
            });
            const mainPowerFinalY = doc.autoTable.previous.finalY; // Simpan Y akhir kolom kiri

            // --- Kolom Kanan: Catatan ---
            let catatanY = topSectionY; // Mulai dari Y yang sama dengan Main Power
            doc.autoTable({
                startY: catatanY,
                head: [['PROBLEM QUALITY']],
                body: [[report.problem_quality_notes || '']],
                ...tableStyles, margin: { left: rightColX }, tableWidth: rightColWidth
            });
            catatanY = doc.autoTable.previous.finalY + 2;
            
            doc.autoTable({
                startY: catatanY,
                head: [['EQUIPMENT']],
                body: [[report.equipment_notes || '']],
                ...tableStyles, margin: { left: rightColX }, tableWidth: rightColWidth
            });
            catatanY = doc.autoTable.previous.finalY + 2;
            
            doc.autoTable({
                startY: catatanY,
                head: [['BOX / LORRY']],
                body: [[report.lorry_notes || '']],
                ...tableStyles, margin: { left: rightColX }, tableWidth: rightColWidth
            });
            catatanY = doc.autoTable.previous.finalY + 2;
            
            doc.autoTable({
                startY: catatanY,
                head: [['PEMAKAIAN AMPLAS SANDERS']],
                body: [[report.amplas_notes || '']],
                ...tableStyles, margin: { left: rightColX }, tableWidth: rightColWidth
            });
            catatanY = doc.autoTable.previous.finalY + 2; 
            
            // Verifikasi (Kanan)
            doc.autoTable({
                startY: mainPowerFinalY,
                head: [['VERIFIKASI']],
                body: [[report.verifikasi_notes || '']],
                ...tableStyles, margin: { left: leftColX }, tableWidth: leftColWidth
            });
            const catatanFinalY = doc.autoTable.previous.finalY; // Simpan Y akhir kolom kanan

            // Tentukan Y berikutnya berdasarkan kolom tertinggi
            currentY = Math.max(mainPowerFinalY, catatanFinalY) + 8;
            
            // ================== AKHIR MODIFIKASI PDF LAYOUT ==================

            // --- Tabel Activity ---
            doc.setFontSize(12);
            doc.text("ACTIVITY", marginX, currentY);
            currentY += 4;
            
            const activityHeaders = [
                [
                    { content: 'KETERANGAN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, 
                    { content: 'TOTAL', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },      
                    { content: 'MUSTHOLIH', colSpan: 3, styles: { halign: 'center' } },   
                    { content: 'NUR AHMAD', colSpan: 3, styles: { halign: 'center' } },   
                    { content: 'SUNARNO', colSpan: 3, styles: { halign: 'center' } }    
                ],
                [
                    ...['FRESH', 'R1', 'R2', 'FRESH', 'R1', 'R2', 'FRESH', 'R1', 'R2'].map(text => ({
                        content: text,
                        styles: { halign: 'center' } 
                    }))
                ]
            ];
            
            const activityBody = [
                ['IN REPAIR', report.act_in_repair_total, report.act_in_repair_wahyu_fresh, report.act_in_repair_wahyu_r1, report.act_in_repair_wahyu_r2, report.act_in_repair_khasanul_fresh, report.act_in_repair_khasanul_r1, report.act_in_repair_khasanul_r2, report.act_in_repair_sunarno_fresh, report.act_in_repair_sunarno_r1, report.act_in_repair_sunarno_r2],
                ['HASIL REPAIR', report.act_hasil_repair_total, report.act_hasil_repair_wahyu_fresh, report.act_hasil_repair_wahyu_r1, report.act_hasil_repair_wahyu_r2, report.act_hasil_repair_khasanul_fresh, report.act_hasil_repair_khasanul_r1, report.act_hasil_repair_khasanul_r2, report.act_hasil_repair_sunarno_fresh, report.act_hasil_repair_sunarno_r1, report.act_hasil_repair_sunarno_r2],
                ['OUT REPAIR', report.act_out_repair_total, report.act_out_repair_wahyu_fresh, report.act_out_repair_wahyu_r1, report.act_out_repair_wahyu_r2, report.act_out_repair_khasanul_fresh, report.act_out_repair_khasanul_r1, report.act_out_repair_khasanul_r2, report.act_out_repair_sunarno_fresh, report.act_out_repair_sunarno_r1, report.act_out_repair_sunarno_r2],
                ['IN REMOVER', report.act_in_remover_total, report.act_in_remover_wahyu_fresh, report.act_in_remover_wahyu_r1, report.act_in_remover_wahyu_r2, report.act_in_remover_khasanul_fresh, report.act_in_remover_khasanul_r1, report.act_in_remover_khasanul_r2, report.act_in_remover_sunarno_fresh, report.act_in_remover_sunarno_r1, report.act_in_remover_sunarno_r2],
                ['HASIL REMOVER', report.act_hasil_remover_total, report.act_hasil_remover_wahyu_fresh, report.act_hasil_remover_wahyu_r1, report.act_hasil_remover_wahyu_r2, report.act_hasil_remover_khasanul_fresh, report.act_hasil_remover_khasanul_r1, report.act_hasil_remover_khasanul_r2, report.act_hasil_remover_sunarno_fresh, report.act_hasil_remover_sunarno_r1, report.act_hasil_remover_sunarno_r2],
                ['OUT REMOVER', report.act_out_remover_total, report.act_out_remover_wahyu_fresh, report.act_out_remover_wahyu_r1, report.act_out_remover_wahyu_r2, report.act_out_remover_khasanul_fresh, report.act_out_remover_khasanul_r1, report.act_out_remover_khasanul_r2, report.act_out_remover_sunarno_fresh, report.act_out_remover_sunarno_r1, report.act_out_remover_sunarno_r2],
            ];
            
            doc.autoTable({
                startY: currentY,
                head: activityHeaders,
                body: activityBody,
                ...tableStyles,
                margin: { left: marginX },
                tableWidth: fullWidth,
                columnStyles: { 
                    0: { cellWidth: 35, fontStyle: 'bold' }, 
                    1: { cellWidth: 15, halign: 'center' }, 
                    2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' },
                    5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' },
                    8: { halign: 'center' }, 9: { halign: 'center' }, 10: { halign: 'center' } 
                }
            });
            currentY = doc.autoTable.previous.finalY + 8;

            // --- Area Hasil Touch Up & Assy Cup (Side-by-side) ---
            const bottomleftColX = marginX;
            const bottomrightColX = marginX + (fullWidth / 2) + 5;
            const bottomcolWidth = (fullWidth / 2) - 5;
            
            let leftY = currentY;
            let rightY = currentY;

            // ================== MODIFIKASI FILTER PDF ==================
            
            // --- Kolom Kiri: Hasil Touch Up ---
            // 1. Parse semua item
            const touchUpItemsParsed = (report.hasil_touch_up_notes || '').split('\n')
                .filter(item => item.trim() !== '')
                .map(item => {
                    const parts = item.split(': ');
                    const name = parts[0] || '';
                    const qty = parts[1] || '0';
                    return { name: name, qty: qty, qtyNum: parseInt(qty) || 0 };
                });
            
            // 2. Filter untuk display (hanya yang > 0)
            const touchUpItems = touchUpItemsParsed
                .filter(item => item.qtyNum > 0)
                .map(item => [item.name, item.qty]); // Konversi balik ke array [nama, qty_string]

            // 3. Hitung total dari SEMUA item (yang 0 dan > 0)
            let touchUpTotal = 0;
            touchUpItemsParsed.forEach(item => { touchUpTotal += item.qtyNum; });
            touchUpItems.push(['TOTAL', touchUpTotal.toString()]); // Tambah baris total

            doc.autoTable({
                startY: leftY,
                head: [['HASIL TOUCH UP', 'QTY']],
                body: touchUpItems, // Gunakan data yang sudah difilter
                ...tableStyles,
                margin: { left: bottomleftColX }, 
                tableWidth: bottomcolWidth,
                didParseCell: (data) => {
                    if (data.row.index === (touchUpItems.length - 1)) { 
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });
            leftY = doc.autoTable.previous.finalY; // Simpan Y terakhir kolom kiri

            // --- Kolom Kanan: Bantuan Operator ---
            // 1. Parse semua item
            const assyCupItemsParsed = (report.hasil_assy_cup_notes || '').split('\n')
                .filter(item => item.trim() !== '')
                .map(item => {
                    const parts = item.split(': ');
                    const name = parts[0] || '';
                    const qty = parts[1] || '0';
                    return { name: name, qty: qty, qtyNum: parseInt(qty) || 0 };
                });

            // 2. Filter untuk display (hanya yang > 0)
            const assyCupItems = assyCupItemsParsed
                .filter(item => item.qtyNum > 0)
                .map(item => [item.name, item.qty]);

            // 3. Hitung total dari SEMUA item
            let assyCupTotal = 0;
            assyCupItemsParsed.forEach(item => { assyCupTotal += item.qtyNum; });
            assyCupItems.push(['TOTAL', assyCupTotal.toString()]);

            doc.autoTable({
                startY: rightY, 
                head: [['BANTUAN OPERATOR REPAIR', 'QTY']],
                body: assyCupItems, // Gunakan data yang sudah difilter
                ...tableStyles,
                margin: { left: bottomrightColX }, 
                tableWidth: bottomcolWidth,
                didParseCell: (data) => {
                    if (data.row.index === (assyCupItems.length - 1)) { 
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });
            rightY = doc.autoTable.previous.finalY;
            
            // ================== AKHIR MODIFIKASI FILTER PDF ==================


            // ===== FOOTER PDF =====
            // Gunakan margin 15mm dari pinggir border, bukan pinggir kertas
            const footerMarginX = 15; 
            currentY = Math.max(leftY, rightY) + 20; // Y baru dari 2 tabel terbawah
            
            // Cek jika footer keluar halaman
            if (currentY > pageHeight - 40) { // Cek 40mm dari bawah
                 doc.addPage();
                 // Gambar border lagi di halaman baru
                 doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
                 currentY = 30; // Mulai Y baru di halaman baru
            }
            
            const preparerName = currentKaryawan ? currentKaryawan.nama_lengkap : (currentUser ? currentUser.email : 'N/A');
            const preparerJabatan = (currentKaryawan && currentKaryawan.jabatan) || '( Jabatan )'; 
            const chiefName = report.chief_name || '( .......................... )'; 
            
            doc.setFontSize(9);
            doc.text("Dibuat,", footerMarginX, currentY); 
            doc.text(preparerName, footerMarginX, currentY + 15); 
            doc.text(preparerJabatan, footerMarginX, currentY + 20); 
            
            doc.text("Disetujui,", doc.internal.pageSize.width / 2, currentY, { align: 'center' }); 
            doc.text(chiefName, doc.internal.pageSize.width / 2, currentY + 15, { align: 'center' }); 
            doc.text("Chief", doc.internal.pageSize.width / 2, currentY + 20, { align: 'center' });
            
            doc.text("Mengetahui,", doc.internal.pageSize.width - footerMarginX, currentY, { align: 'right' }); 
            doc.text("SINGGIH E W", doc.internal.pageSize.width - footerMarginX, currentY + 15, { align: 'right' }); 
            doc.text("Dept Head", doc.internal.pageSize.width - footerMarginX, currentY + 20, { align: 'right' });
            // ===== AKHIR FOOTER PDF =====

            doc.save(`Laporan_Repair_${report.tanggal}.pdf`);
        } catch (error) {
            alert(`Gagal membuat PDF: ${error.message}`);
            console.error('PDF Generation Error:', error);
        }
    }


    /**
     * FUNGSI: Memuat draft laporan
     */
    async function loadRepairDrafts() {
        if (!draftListEl) return;
        draftListEl.innerHTML = '<tr><td colspan="4">Memuat draft...</td></tr>';
        
        const { data, error } = await _supabase
            .from('laporan_repair')
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
                        const { error } = await _supabase.from('laporan_repair').delete().eq('id', idToDelete);
                        if (error) {
                            alert('Gagal menghapus draft: ' + error.message);
                        } else {
                            await loadRepairDrafts(); 
                        }
                    }
                });
            });
        }
    }

    /**
     * Fungsi: Memuat riwayat laporan
     */
    async function loadRepairHistory() {
        if (!historyListEl) return;
        historyListEl.innerHTML = '<tr><td colspan="5">Memuat riwayat...</td></tr>';
        
        const { count, error: countError } = await _supabase
            .from('laporan_repair')
            .select('*', { count: 'exact', head: true })
            .or('status.eq.published,status.is.null');
            
        if (countError) {
            historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${countError.message}</td></tr>`; return;
        }
        
        totalReports = count;
        const totalPages = Math.ceil(totalReports / itemsPerPage) || 1;
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error } = await _supabase.from('laporan_repair')
            .select('id, tanggal, shift, mp_total, created_at') 
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
                    <td>${laporan.shift || 'N/A'}</td>
                    <td>${laporan.mp_total}</td>
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
     * FUNGSI: Memuat data laporan ke form untuk diedit
     */
    async function loadReportForEditing(reportId) {
        formMessageEl.textContent = 'Memuat data laporan...';
        const { data: report, error } = await _supabase
            .from('laporan_repair')
            .select('*')
            .eq('id', reportId)
            .single();

        if (error) {
            alert('Gagal memuat data laporan: ' + error.message);
            formMessageEl.textContent = '';
            return;
        }

        // Isi Header
        document.getElementById('hari').value = report.hari;
        document.getElementById('tanggal').value = report.tanggal;
        document.getElementById('shift').value = report.shift;
        document.getElementById('chief_name').value = report.chief_name;

        // Isi Main Power
        document.getElementById('mp_masuk_repair').value = report.mp_masuk_repair;
        document.getElementById('mp_masuk_touchup').value = report.mp_masuk_touchup;
        document.getElementById('mp_ijin').value = report.mp_ijin;
        document.getElementById('mp_off').value = report.mp_off;
        document.getElementById('mp_sakit').value = report.mp_sakit;

        // Isi Activity Grid (Row 1: IN REPAIR)
        document.getElementById('act_in_repair_total').value = report.act_in_repair_total;
        document.getElementById('act_in_repair_wahyu_fresh').value = report.act_in_repair_wahyu_fresh;
        document.getElementById('act_in_repair_wahyu_r1').value = report.act_in_repair_wahyu_r1;
        document.getElementById('act_in_repair_wahyu_r2').value = report.act_in_repair_wahyu_r2;
        document.getElementById('act_in_repair_khasanul_fresh').value = report.act_in_repair_khasanul_fresh;
        document.getElementById('act_in_repair_khasanul_r1').value = report.act_in_repair_khasanul_r1;
        document.getElementById('act_in_repair_khasanul_r2').value = report.act_in_repair_khasanul_r2;
        document.getElementById('act_in_repair_sunarno_fresh').value = report.act_in_repair_sunarno_fresh;
        document.getElementById('act_in_repair_sunarno_r1').value = report.act_in_repair_sunarno_r1;
        document.getElementById('act_in_repair_sunarno_r2').value = report.act_in_repair_sunarno_r2;

        // (Row 2: HASIL REPAIR)
        document.getElementById('act_hasil_repair_total').value = report.act_hasil_repair_total;
        document.getElementById('act_hasil_repair_wahyu_fresh').value = report.act_hasil_repair_wahyu_fresh;
        document.getElementById('act_hasil_repair_wahyu_r1').value = report.act_hasil_repair_wahyu_r1;
        document.getElementById('act_hasil_repair_wahyu_r2').value = report.act_hasil_repair_wahyu_r2;
        document.getElementById('act_hasil_repair_khasanul_fresh').value = report.act_hasil_repair_khasanul_fresh;
        document.getElementById('act_hasil_repair_khasanul_r1').value = report.act_hasil_repair_khasanul_r1;
        document.getElementById('act_hasil_repair_khasanul_r2').value = report.act_hasil_repair_khasanul_r2;
        document.getElementById('act_hasil_repair_sunarno_fresh').value = report.act_hasil_repair_sunarno_fresh;
        document.getElementById('act_hasil_repair_sunarno_r1').value = report.act_hasil_repair_sunarno_r1;
        document.getElementById('act_hasil_repair_sunarno_r2').value = report.act_hasil_repair_sunarno_r2;
        
        // (Row 3: OUT REPAIR)
        document.getElementById('act_out_repair_total').value = report.act_out_repair_total;
        document.getElementById('act_out_repair_wahyu_fresh').value = report.act_out_repair_wahyu_fresh;
        document.getElementById('act_out_repair_wahyu_r1').value = report.act_out_repair_wahyu_r1;
        document.getElementById('act_out_repair_wahyu_r2').value = report.act_out_repair_wahyu_r2;
        document.getElementById('act_out_repair_khasanul_fresh').value = report.act_out_repair_khasanul_fresh;
        document.getElementById('act_out_repair_khasanul_r1').value = report.act_out_repair_khasanul_r1;
        document.getElementById('act_out_repair_khasanul_r2').value = report.act_out_repair_khasanul_r2;
        document.getElementById('act_out_repair_sunarno_fresh').value = report.act_out_repair_sunarno_fresh;
        document.getElementById('act_out_repair_sunarno_r1').value = report.act_out_repair_sunarno_r1;
        document.getElementById('act_out_repair_sunarno_r2').value = report.act_out_repair_sunarno_r2;

        // (Row 4: IN REMOVER)
        document.getElementById('act_in_remover_total').value = report.act_in_remover_total;
        document.getElementById('act_in_remover_wahyu_fresh').value = report.act_in_remover_wahyu_fresh;
        document.getElementById('act_in_remover_wahyu_r1').value = report.act_in_remover_wahyu_r1;
        document.getElementById('act_in_remover_wahyu_r2').value = report.act_in_remover_wahyu_r2;
        document.getElementById('act_in_remover_khasanul_fresh').value = report.act_in_remover_khasanul_fresh;
        document.getElementById('act_in_remover_khasanul_r1').value = report.act_in_remover_khasanul_r1;
        document.getElementById('act_in_remover_khasanul_r2').value = report.act_in_remover_khasanul_r2;
        document.getElementById('act_in_remover_sunarno_fresh').value = report.act_in_remover_sunarno_fresh;
        document.getElementById('act_in_remover_sunarno_r1').value = report.act_in_remover_sunarno_r1;
        document.getElementById('act_in_remover_sunarno_r2').value = report.act_in_remover_sunarno_r2;

        // (Row 5: HASIL REMOVER)
        document.getElementById('act_hasil_remover_total').value = report.act_hasil_remover_total;
        document.getElementById('act_hasil_remover_wahyu_fresh').value = report.act_hasil_remover_wahyu_fresh;
        document.getElementById('act_hasil_remover_wahyu_r1').value = report.act_hasil_remover_wahyu_r1;
        document.getElementById('act_hasil_remover_wahyu_r2').value = report.act_hasil_remover_wahyu_r2;
        document.getElementById('act_hasil_remover_khasanul_fresh').value = report.act_hasil_remover_khasanul_fresh;
        document.getElementById('act_hasil_remover_khasanul_r1').value = report.act_hasil_remover_khasanul_r1;
        document.getElementById('act_hasil_remover_khasanul_r2').value = report.act_hasil_remover_khasanul_r2;
        document.getElementById('act_hasil_remover_sunarno_fresh').value = report.act_hasil_remover_sunarno_fresh;
        document.getElementById('act_hasil_remover_sunarno_r1').value = report.act_hasil_remover_sunarno_r1;
        document.getElementById('act_hasil_remover_sunarno_r2').value = report.act_hasil_remover_sunarno_r2;

        // (Row 6: OUT REMOVER)
        document.getElementById('act_out_remover_total').value = report.act_out_remover_total;
        document.getElementById('act_out_remover_wahyu_fresh').value = report.act_out_remover_wahyu_fresh;
        document.getElementById('act_out_remover_wahyu_r1').value = report.act_out_remover_wahyu_r1;
        document.getElementById('act_out_remover_wahyu_r2').value = report.act_out_remover_wahyu_r2;
        document.getElementById('act_out_remover_khasanul_fresh').value = report.act_out_remover_khasanul_fresh;
        document.getElementById('act_out_remover_khasanul_r1').value = report.act_out_remover_khasanul_r1;
        document.getElementById('act_out_remover_khasanul_r2').value = report.act_out_remover_khasanul_r2;
        document.getElementById('act_out_remover_sunarno_fresh').value = report.act_out_remover_sunarno_fresh;
        document.getElementById('act_out_remover_sunarno_r1').value = report.act_out_remover_sunarno_r1;
        document.getElementById('act_out_remover_sunarno_r2').value = report.act_out_remover_sunarno_r2;


        // Isi Catatan
        document.getElementById('problem_quality_notes').value = report.problem_quality_notes;
        document.getElementById('equipment_notes').value = report.equipment_notes;
        document.getElementById('lorry_notes').value = report.lorry_notes;
        document.getElementById('amplas_notes').value = report.amplas_notes;
        document.getElementById('verifikasi_notes').value = report.verifikasi_notes; // <-- BARIS BARU

        // Isi dynamic list
        deserializeDynamicList(touchUpListContainer, 'touchup-item-name', 'touchup-item-value', report.hasil_touch_up_notes, defaultTouchUpItems);
        deserializeDynamicList(assyCupListContainer, 'assy-cup-item-name', 'assy-cup-item-value', report.hasil_assy_cup_notes, defaultAssyCupItems);

        // Hitung ulang semua total
        calculateAllTotals();
        
        // Atur state form
        currentlyEditingId = reportId;
        formTitleEl.textContent = `Mengedit Laporan (Tanggal: ${report.tanggal})`;
        mainSubmitBtn.textContent = 'Update Laporan Final';
        saveDraftBtn.textContent = 'Update Draft';
        cancelEditBtn.style.display = 'inline-block';
        
        formMessageEl.textContent = 'Data berhasil dimuat. Silakan edit.';
        repairForm.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * FUNGSI: Mengosongkan form dan mereset state
     */
   function resetFormAndState() {
        repairForm.reset(); 
        currentlyEditingId = null; 

        // Reset list dinamis ke default
        resetDynamicList(touchUpListContainer, defaultTouchUpItems, 'touchup-item-name', 'touchup-item-value');
        resetDynamicList(assyCupListContainer, defaultAssyCupItems, 'assy-cup-item-name', 'assy-cup-item-value');

        // Hitung ulang semua total (jadi 0)
        calculateAllTotals();

        // Kembalikan teks tombol dan judul
        formTitleEl.textContent = 'Buat Laporan Baru';
        mainSubmitBtn.textContent = 'Simpan Laporan Final';
        saveDraftBtn.textContent = 'Simpan Draft';
        cancelEditBtn.style.display = 'none';
        formMessageEl.textContent = '';
    }

    // Event listener untuk tombol "Batal Edit"
    cancelEditBtn.addEventListener('click', resetFormAndState);

    // Helper function to get INT value from input
    const getIntVal = (id) => parseInt(document.getElementById(id).value) || 0;

    /**
     * FUNGSI: Mengumpulkan semua data form ke 1 objek
     */
    function getFormData() {
        return {
            user_id: currentUser.id,
            hari: document.getElementById('hari').value,
            tanggal: document.getElementById('tanggal').value,
            shift: document.getElementById('shift').value,
            chief_name: document.getElementById('chief_name').value,

            // Main Power
            mp_masuk_repair: getIntVal('mp_masuk_repair'),
            mp_masuk_touchup: getIntVal('mp_masuk_touchup'),
            mp_ijin: document.getElementById('mp_ijin').value, 
            mp_off: document.getElementById('mp_off').value, 
            mp_sakit: document.getElementById('mp_sakit').value, 
            mp_total: getIntVal('mp_total'), 

            // Activity: IN REPAIR
            act_in_repair_total: getIntVal('act_in_repair_total'),
            act_in_repair_wahyu_fresh: getIntVal('act_in_repair_wahyu_fresh'),
            act_in_repair_wahyu_r1: getIntVal('act_in_repair_wahyu_r1'),
            act_in_repair_wahyu_r2: getIntVal('act_in_repair_wahyu_r2'),
            act_in_repair_khasanul_fresh: getIntVal('act_in_repair_khasanul_fresh'),
            act_in_repair_khasanul_r1: getIntVal('act_in_repair_khasanul_r1'),
            act_in_repair_khasanul_r2: getIntVal('act_in_repair_khasanul_r2'),
            act_in_repair_sunarno_fresh: getIntVal('act_in_repair_sunarno_fresh'),
            act_in_repair_sunarno_r1: getIntVal('act_in_repair_sunarno_r1'),
            act_in_repair_sunarno_r2: getIntVal('act_in_repair_sunarno_r2'),

            // Activity: HASIL REPAIR
            act_hasil_repair_total: getIntVal('act_hasil_repair_total'),
            act_hasil_repair_wahyu_fresh: getIntVal('act_hasil_repair_wahyu_fresh'),
            act_hasil_repair_wahyu_r1: getIntVal('act_hasil_repair_wahyu_r1'),
            act_hasil_repair_wahyu_r2: getIntVal('act_hasil_repair_wahyu_r2'),
            act_hasil_repair_khasanul_fresh: getIntVal('act_hasil_repair_khasanul_fresh'),
            act_hasil_repair_khasanul_r1: getIntVal('act_hasil_repair_khasanul_r1'),
            act_hasil_repair_khasanul_r2: getIntVal('act_hasil_repair_khasanul_r2'),
            act_hasil_repair_sunarno_fresh: getIntVal('act_hasil_repair_sunarno_fresh'),
            act_hasil_repair_sunarno_r1: getIntVal('act_hasil_repair_sunarno_r1'),
            act_hasil_repair_sunarno_r2: getIntVal('act_hasil_repair_sunarno_r2'),
            
            // Activity: OUT REPAIR
            act_out_repair_total: getIntVal('act_out_repair_total'),
            act_out_repair_wahyu_fresh: getIntVal('act_out_repair_wahyu_fresh'),
            act_out_repair_wahyu_r1: getIntVal('act_out_repair_wahyu_r1'),
            act_out_repair_wahyu_r2: getIntVal('act_out_repair_wahyu_r2'),
            act_out_repair_khasanul_fresh: getIntVal('act_out_repair_khasanul_fresh'),
            act_out_repair_khasanul_r1: getIntVal('act_out_repair_khasanul_r1'),
            act_out_repair_khasanul_r2: getIntVal('act_out_repair_khasanul_r2'),
            act_out_repair_sunarno_fresh: getIntVal('act_out_repair_sunarno_fresh'),
            act_out_repair_sunarno_r1: getIntVal('act_out_repair_sunarno_r1'),
            act_out_repair_sunarno_r2: getIntVal('act_out_repair_sunarno_r2'),
            
            // Activity: IN REMOVER
            act_in_remover_total: getIntVal('act_in_remover_total'),
            act_in_remover_wahyu_fresh: getIntVal('act_in_remover_wahyu_fresh'),
            act_in_remover_wahyu_r1: getIntVal('act_in_remover_wahyu_r1'),
            act_in_remover_wahyu_r2: getIntVal('act_in_remover_wahyu_r2'),
            act_in_remover_khasanul_fresh: getIntVal('act_in_remover_khasanul_fresh'),
            act_in_remover_khasanul_r1: getIntVal('act_in_remover_khasanul_r1'),
            act_in_remover_khasanul_r2: getIntVal('act_in_remover_khasanul_r2'),
            act_in_remover_sunarno_fresh: getIntVal('act_in_remover_sunarno_fresh'),
            act_in_remover_sunarno_r1: getIntVal('act_in_remover_sunarno_r1'),
            act_in_remover_sunarno_r2: getIntVal('act_in_remover_sunarno_r2'),

            // Activity: HASIL REMOVER
            act_hasil_remover_total: getIntVal('act_hasil_remover_total'),
            act_hasil_remover_wahyu_fresh: getIntVal('act_hasil_remover_wahyu_fresh'),
            act_hasil_remover_wahyu_r1: getIntVal('act_hasil_remover_wahyu_r1'),
            act_hasil_remover_wahyu_r2: getIntVal('act_hasil_remover_wahyu_r2'),
            act_hasil_remover_khasanul_fresh: getIntVal('act_hasil_remover_khasanul_fresh'),
            act_hasil_remover_khasanul_r1: getIntVal('act_hasil_remover_khasanul_r1'),
            act_hasil_remover_khasanul_r2: getIntVal('act_hasil_remover_khasanul_r2'),
            act_hasil_remover_sunarno_fresh: getIntVal('act_hasil_remover_sunarno_fresh'),
            act_hasil_remover_sunarno_r1: getIntVal('act_hasil_remover_sunarno_r1'),
            act_hasil_remover_sunarno_r2: getIntVal('act_hasil_remover_sunarno_r2'),

            // Activity: OUT REMOVER
            act_out_remover_total: getIntVal('act_out_remover_total'),
            act_out_remover_wahyu_fresh: getIntVal('act_out_remover_wahyu_fresh'),
            act_out_remover_wahyu_r1: getIntVal('act_out_remover_wahyu_r1'),
            act_out_remover_wahyu_r2: getIntVal('act_out_remover_wahyu_r2'),
            act_out_remover_khasanul_fresh: getIntVal('act_out_remover_khasanul_fresh'),
            act_out_remover_khasanul_r1: getIntVal('act_out_remover_khasanul_r1'),
            act_out_remover_khasanul_r2: getIntVal('act_out_remover_khasanul_r2'),
            act_out_remover_sunarno_fresh: getIntVal('act_out_remover_sunarno_fresh'),
            act_out_remover_sunarno_r1: getIntVal('act_out_remover_sunarno_r1'),
            act_out_remover_sunarno_r2: getIntVal('act_out_remover_sunarno_r2'),

            // Catatan
            problem_quality_notes: document.getElementById('problem_quality_notes').value,
            equipment_notes: document.getElementById('equipment_notes').value,
            lorry_notes: document.getElementById('lorry_notes').value,
            amplas_notes: document.getElementById('amplas_notes').value,
            verifikasi_notes: document.getElementById('verifikasi_notes').value, // <-- BARIS BARU

            // Hasil Touch Up
            hasil_touch_up_notes: serializeDynamicList(touchUpListContainer, 'touchup-item-name', 'touchup-item-value'),
            // Hasil Assy Cup
            hasil_assy_cup_notes: serializeDynamicList(assyCupListContainer, 'assy-cup-item-name', 'assy-cup-item-value')
        };
    }

    /**
     * FUNGSI: Logika submit
     */
    async function handleFormSubmit(isDraft = false) {
        if (!currentUser) {
            formMessageEl.textContent = 'Error: Sesi tidak ditemukan. Harap refresh.'; return;
        }
        formMessageEl.textContent = 'Menyimpan...';

        const laporanData = getFormData();
        laporanData.status = isDraft ? 'draft' : 'published';

        let error;
        if (currentlyEditingId) {
            // MODE UPDATE
            const { error: updateError } = await _supabase
                .from('laporan_repair')
                .update(laporanData)
                .eq('id', currentlyEditingId);
            error = updateError;
        } else {
            // MODE INSERT
            const { error: insertError } = await _supabase
                .from('laporan_repair')
                .insert(laporanData);
            error = insertError;
        }

        if (error) {
            formMessageEl.textContent = `Error: ${error.message}`;
            console.error('Submit Error:', error);
        } else {
            formMessageEl.textContent = `Laporan berhasil disimpan sebagai ${isDraft ? 'Draft' : 'Final'}!`;
            resetFormAndState();
            await loadRepairDrafts(); 
            currentPage = 1; 
            await loadRepairHistory(); 
            setTimeout(() => { formMessageEl.textContent = ''; }, 3000);
        }
    }

    // Event listener "Simpan Laporan Final"
    repairForm.onsubmit = async (event) => {
        event.preventDefault();
        await handleFormSubmit(false); 
    };

    // Event listener "Simpan Draft"
    saveDraftBtn.addEventListener('click', async () => {
        await handleFormSubmit(true); 
    });


    // Event listener pagination
    prevButton.addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadRepairHistory(); } });
    nextButton.addEventListener('click', () => { const totalPages = Math.ceil(totalReports / itemsPerPage); if (currentPage < totalPages) { currentPage++; loadRepairHistory(); } });

    /**
     * Fungsi Inisialisasi Halaman
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

        resetFormAndState();
        
        try {
            await loadRepairDrafts();
            await loadRepairHistory();
        } catch (error) {
            console.error("Gagal memuat data:", error);
            if (historyListEl) historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Gagal memuat riwayat.</td></tr>`;
            if (draftListEl) draftListEl.innerHTML = `<tr><td colspan="4" style="color: red;">Gagal memuat draft.</td></tr>`;
        }
    })();

}); // Akhir dari DOMContentLoaded