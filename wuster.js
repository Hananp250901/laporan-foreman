// =================================================================
// D. LOGIKA HALAMAN WUSTER (wuster.html)
// =================================================================

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
    const checkInputs = document.querySelectorAll('.check-calc');
    const checkTotalSpan = document.getElementById('total_check_total');
    const prodInputs = document.querySelectorAll('.prod-calc');
    const prodTotalSpan = document.getElementById('total_prod_total');
    
    // Variabel Total untuk List Dinamis
    const assyCupTotalSpan = document.getElementById('assy-cup-total');
    const touchUpTotalSpan = document.getElementById('touch-up-total');
    const bukaCapTotalSpan = document.getElementById('buka-cap-total');
    const packingHolderTotalSpan = document.getElementById('packing-holder-total'); 
    const pasangHolderTotalSpan = document.getElementById('pasang-holder-total'); 

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
            inputValue = itemValue || 0; 
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
            // Jika tidak ada notes, reset ke default
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
                const value = parts.slice(1).join(': '); // Gabungkan kembali jika valuenya mengandung ':'
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
            const container = row.parentElement;
            row.remove(); // Hapus baris
            // Hitung ulang total
            calculateAllDynamicTotals(); // Panggil fungsi helper
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
            calculateAllDynamicTotals(); // Panggil fungsi helper
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
                 if (name || value) { // Simpan walau hanya salah satu terisi (untuk draft)
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
     * FUNGSI HELPER BARU: Menjalankan semua kalkulasi total
     */
    function calculateAllTotals() {
        calculateTotal(wusterInputs, wusterTotalSpan);
        calculateTotal(checkInputs, checkTotalSpan);
        calculateTotal(prodInputs, prodTotalSpan);
        calculateAllDynamicTotals();
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
    checkInputs.forEach(input => input.addEventListener('input', () => calculateTotal(checkInputs, checkTotalSpan)));
    prodInputs.forEach(input => input.addEventListener('input', () => calculateTotal(prodInputs, prodTotalSpan)));

    
    /**
     * FUNGSI HELPER PDF BARU: Menghitung total dari string notes
     */
    function addTotalToNotes(notesString) {
        if (!notesString || notesString.trim() === '') return '(Kosong)';
        let sum = 0;
        const lines = notesString.split('\n');
        
        lines.forEach(line => {
            const parts = line.split(': ');
            if (parts.length >= 2) {
                // Ambil bagian terakhir (angkanya) dan ubah jadi integer
                sum += parseInt(parts[parts.length - 1]) || 0;
            }
        });
        
        // Kembalikan string asli DITAMBAH baris TOTAL
        return `${notesString}\n\nTOTAL: ${sum}`;
    }


    /**
     * FUNGSI PDF (DIMODIFIKASI)
     */
    async function generatePDF(reportId) {
        alert('Membuat PDF... Mohon tunggu.');
        if (!window.jspdf) {
            alert('Gagal memuat library PDF. Pastikan Anda terhubung ke internet.');
            return;
        }
        const { jsPDF } = window.jspdf;
        try {
            const { data: report, error } = await _supabase.from('laporan_wuster').select('*').eq('id', reportId).single();
            if (error) throw new Error(`Gagal mengambil data laporan: ${error.message}`);
            
            const doc = new jsPDF({ format: 'legal' });
            const tableStyles = {
                theme: 'grid', styles: { cellWidth: 'wrap', fontSize: 8, cellPadding: 1 }, 
                headStyles: { fillColor: [22, 160, 133], textColor: [255, 255, 255], fontSize: 9 } 
            };
            const colWidth = 90; const fullWidth = 190;
            const marginX = (doc.internal.pageSize.width - fullWidth) / 2;
            const col1X = marginX; const col2X = marginX + colWidth + 5;
            const marginYSmall = 2; 

            doc.setFontSize(16); doc.text("LAPORAN AKHIR SHIFT", doc.internal.pageSize.width / 2, 15, { align: 'center' });
            doc.setFontSize(9); 
            doc.text("HARI", col1X, 25); doc.text(`: ${report.hari}`, col1X + 30, 25);
            doc.text("TANGGAL", col1X, 29); doc.text(`: ${report.tanggal}`, col1X + 30, 29);
            doc.text("SHIFT", col1X, 33); doc.text(`: ${report.shift}`, col1X + 30, 33);
            doc.text("TOTAL MASUK", col1X, 37); doc.text(`: ${report.total_masuk} Orang`, col1X + 30, 37);

            doc.autoTable({
                startY: 45, head: [['ABSENSI', 'Masuk (org)', 'Tidak Masuk (Nama)']],
                body: [['STAFF', report.abs_staff_masuk, report.abs_staff_tdk_masuk || ''], ['WUSTER', report.abs_wuster_masuk, report.abs_wuster_tdk_masuk || ''], ['REPAIR & TOUCH UP', report.abs_repair_masuk, report.abs_repair_tdk_masuk || ''], ['INCOMING, STEP ASSY, BUKA CAP', report.abs_incoming_masuk, report.abs_incoming_tdk_masuk || ''], ['CHROM, VERIFIKASI, AEROX, REMOVER', report.abs_chrome_masuk, report.abs_chrome_tdk_masuk || ''], ['PAINTING 4', report.abs_painting_4_masuk, report.abs_painting_4_tdk_masuk || ''], ['USER & CPC', report.abs_user_cpc_masuk, report.abs_user_cpc_tdk_masuk || ''], ['MAINTENANCE', report.abs_maintenance_masuk, report.abs_maintenance_tdk_masuk || ''],],
                ...tableStyles, margin: { left: marginX }, tableWidth: fullWidth, columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 25 }, 2: { cellWidth: 105 } }
            });
            let startY2Col = doc.autoTable.previous.finalY + marginYSmall;

            function drawSingleTable(title, note, startY, startX, width = colWidth) { doc.autoTable({ startY: startY, head: [[title]], body: [[note || '']], ...tableStyles, margin: { left: startX }, tableWidth: width, columnStyles: { 0: { cellWidth: width - 2 } } }); return doc.autoTable.previous.finalY; }
            function drawCalcTable(options) { let localTableStyles = JSON.parse(JSON.stringify(tableStyles)); doc.autoTable({ ...options, ...localTableStyles }); return doc.autoTable.previous.finalY; }

            // --- Gambar Kolom Kiri Dulu ---
            let leftY = startY2Col;
            // === PERUBAHAN DI SINI ===
            leftY = drawSingleTable('Packing Holder', addTotalToNotes(report.packing_holder_notes), leftY, col1X);
            leftY = drawSingleTable('Pasang Holder', addTotalToNotes(report.pasang_holder_notes), leftY + marginYSmall, col1X);
            // === AKHIR PERUBAHAN ===
            leftY = drawSingleTable('Problem / Quality', report.problem_quality_notes, leftY + marginYSmall, col1X);
            leftY = drawSingleTable('Suplay Material', report.suplay_material_notes, leftY + marginYSmall, col1X);
            leftY = drawSingleTable('Packing Box / Lory', report.packing_box_notes, leftY + marginYSmall, col1X);
            leftY = drawSingleTable('Trouble Mesin', report.trouble_mesin_notes, leftY + marginYSmall, col1X);

            const prodTotal = (report.total_prod_fresh || 0) + (report.total_prod_repair || 0) + (report.total_prod_ng || 0);
            leftY = drawCalcTable({ startY: leftY + marginYSmall, head: [['TOTAL PRODUKSI', 'Jumlah']], body: [['Fresh', report.total_prod_fresh || 0], ['Repair', report.total_prod_repair || 0], ['NG', report.total_prod_ng || 0], ['Total', prodTotal]], margin: { left: col1X }, tableWidth: colWidth, columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 38 } }, didParseCell: (data) => { if (data.row.index === 3) { data.cell.styles.fontStyle = 'bold'; } } });

            // --- Gambar Kolom Kanan ---
            let rightY = startY2Col; 
            // === PERUBAHAN DI SINI ===
            rightY = drawSingleTable('Hasil Assy Cup', addTotalToNotes(report.hasil_assy_cup_notes), rightY, col2X);
            rightY = drawSingleTable('Hasil Touch Up', addTotalToNotes(report.hasil_touch_up_notes), rightY + marginYSmall, col2X);
            rightY = drawSingleTable('Hasil Buka Cap', addTotalToNotes(report.hasil_buka_cap_notes), rightY + marginYSmall, col2X);
            // === AKHIR PERUBAHAN ===

            const wusterTotal = (report.perf_wuster_isi || 0) + (report.perf_wuster_kosong || 0);
            rightY = drawCalcTable({ startY: rightY + marginYSmall, head: [['PERFORMA WUSTER', 'Jumlah']], body: [['Hanger Isi', report.perf_wuster_isi || 0], ['Hanger Kosong', report.perf_wuster_kosong || 0], ['Total', wusterTotal]], margin: { left: col2X }, tableWidth: colWidth, columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 38 } }, didParseCell: (data) => { if (data.row.index === 2) { data.cell.styles.fontStyle = 'bold'; } } });

            const checkTotal = (report.total_check_ok || 0) + (report.total_check_ng || 0) + (report.total_check_repair || 0) + (report.total_check_body || 0);
            rightY = drawCalcTable({ startY: rightY + marginYSmall, head: [['TOTAL CHECK', 'Jumlah']], body: [['OK', report.total_check_ok || 0], ['NG', report.total_check_ng || 0], ['Repair', report.total_check_repair || 0], ['Body', report.total_check_body || 0], ['Total', checkTotal]], margin: { left: col2X }, tableWidth: colWidth, columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 38 } }, didParseCell: (data) => { if (data.row.index === 4) { data.cell.styles.fontStyle = 'bold'; } } });

            let currentY = Math.max(leftY, rightY) + marginYSmall;
            doc.autoTable({ startY: currentY, head: [['LAIN-LAIN', 'Catatan']], body: [['Lost Time', report.lost_time_notes || ''], ['Hanger', report.hanger_notes || '']], ...tableStyles, margin: { left: marginX }, tableWidth: fullWidth, columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 140 } } });

            // Footer
            let finalY = doc.autoTable.previous.finalY + 10;
            const preparerName = currentKaryawan ? currentKaryawan.nama_lengkap : (currentUser ? currentUser.email : 'N/A');
            doc.setFontSize(9);
            doc.text("Dibuat,", col1X, finalY); doc.text(preparerName, col1X, finalY + 15); doc.text("Foreman", col1X, finalY + 20);
            doc.text("Disetujui,", doc.internal.pageSize.width / 2, finalY, { align: 'center' }); const chiefName = report.chief_name || '( .......................... )'; doc.text(chiefName, doc.internal.pageSize.width / 2, finalY + 15, { align: 'center' }); doc.text("Chief", doc.internal.pageSize.width / 2, finalY + 20, { align: 'center' });
            doc.text("Mengetahui,", doc.internal.pageSize.width - marginX, finalY, { align: 'right' }); doc.text("SINGGIH E W", doc.internal.pageSize.width - marginX, finalY + 15, { align: 'right' }); doc.text("Dept Head", doc.internal.pageSize.width - marginX, finalY + 20, { align: 'right' });

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
            .eq('status', 'draft') // <- HANYA AMBIL DRAFT
            .eq('user_id', currentUser.id) // <- HANYA DRAFT MILIK USER INI
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
                
                // Event listener untuk tombol "Lanjutkan" (Edit)
                row.querySelector('.button-edit').addEventListener('click', (e) => {
                    loadReportForEditing(e.currentTarget.getAttribute('data-id'));
                });

                // Event listener untuk tombol "Hapus"
                row.querySelector('.button-delete-draft').addEventListener('click', async (e) => {
                    const idToDelete = e.currentTarget.getAttribute('data-id');
                    if (confirm('Anda yakin ingin menghapus draft ini?')) {
                        
                        // Tambahkan error handling
                        const { error } = await _supabase
                            .from('laporan_wuster')
                            .delete()
                            .eq('id', idToDelete);

                        if (error) {
                            // Jika error, tampilkan pesan
                            alert('Gagal menghapus draft: ' + error.message);
                            console.error('Delete error:', error);
                        } else {
                            // Jika berhasil, baru muat ulang
                            await loadWusterDrafts(); 
                        }
                    }
                });
            });
        }
    }

    /**
     * Fungsi: Memuat riwayat laporan (DIMODIFIKASI)
     */
    async function loadWusterHistory() {
        if (!historyListEl) return;
        historyListEl.innerHTML = '<tr><td colspan="5">Memuat riwayat...</td></tr>';
        
        // Filter HANYA untuk yang 'published' atau yang lama (NULL)
        const { count, error: countError } = await _supabase
            .from('laporan_wuster')
            .select('*', { count: 'exact', head: true })
            .or('status.eq.published,status.is.null') // <- FILTER BARU
            
        if (countError) {
            historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${countError.message}</td></tr>`; return;
        }
        
        totalReports = count;
        const totalPages = Math.ceil(totalReports / itemsPerPage) || 1;
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error } = await _supabase.from('laporan_wuster')
            .select('id, tanggal, shift, total_masuk, created_at')
            .or('status.eq.published,status.is.null') // <- FILTER BARU
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
                
                // Event listener untuk tombol "Edit" BARU
                row.querySelector('.button-edit').addEventListener('click', (e) => {
                    loadReportForEditing(e.currentTarget.getAttribute('data-id'));
                });
                // Event listener untuk tombol "PDF"
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
        document.getElementById('hari').value = report.hari;
        document.getElementById('tanggal').value = report.tanggal;
        document.getElementById('shift').value = report.shift;
        document.getElementById('chief_name').value = report.chief_name;
        document.getElementById('total_masuk').value = report.total_masuk;

        document.getElementById('abs_staff_masuk').value = report.abs_staff_masuk;
        document.getElementById('abs_staff_tdk_masuk').value = report.abs_staff_tdk_masuk;
        document.getElementById('abs_wuster_masuk').value = report.abs_wuster_masuk;
        document.getElementById('abs_wuster_tdk_masuk').value = report.abs_wuster_tdk_masuk;
        document.getElementById('abs_repair_masuk').value = report.abs_repair_masuk;
        document.getElementById('abs_repair_tdk_masuk').value = report.abs_repair_tdk_masuk;
        document.getElementById('abs_incoming_masuk').value = report.abs_incoming_masuk;
        document.getElementById('abs_incoming_tdk_masuk').value = report.abs_incoming_tdk_masuk;
        document.getElementById('abs_chrome_masuk').value = report.abs_chrome_masuk;
        document.getElementById('abs_chrome_tdk_masuk').value = report.abs_chrome_tdk_masuk;
        document.getElementById('abs_painting_4_masuk').value = report.abs_painting_4_masuk;
        document.getElementById('abs_painting_4_tdk_masuk').value = report.abs_painting_4_tdk_masuk;
        document.getElementById('abs_user_cpc_masuk').value = report.abs_user_cpc_masuk;
        document.getElementById('abs_user_cpc_tdk_masuk').value = report.abs_user_cpc_tdk_masuk;
        document.getElementById('abs_maintenance_masuk').value = report.abs_maintenance_masuk;
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
        currentlyEditingId = reportId; // SET ID YANG SEDANG DIEDIT
        formTitleEl.textContent = `Mengedit Laporan (Tanggal: ${report.tanggal}, Shift: ${report.shift})`;
        mainSubmitBtn.textContent = 'Update Laporan Final';
        saveDraftBtn.textContent = 'Update Draft';
        cancelEditBtn.style.display = 'inline-block'; // Tampilkan tombol Batal
        
        formMessageEl.textContent = 'Data berhasil dimuat. Silakan edit.';
        wusterForm.scrollIntoView({ behavior: 'smooth' }); // Scroll ke form
    }

    /**
     * FUNGSI BARU: Mengosongkan form dan mereset state
     */
    function resetFormAndState() {
        wusterForm.reset(); // Reset semua input
        currentlyEditingId = null; // Hapus ID edit

        // Reset semua list dinamis ke default
        resetDynamicList(holderListContainer, defaultHolderItems, 'packing-item-name', 'packing-item-value');
        resetDynamicList(pasangListContainer, defaultPasangItems, 'pasang-item-name', 'pasang-item-value');
        resetDynamicList(assyCupListContainer, defaultAssyCupItems, 'assy-cup-item-name', 'assy-cup-item-value');
        resetDynamicList(touchUpListContainer, defaultTouchUpItems, 'touch-up-item-name', 'touch-up-item-value');
        resetDynamicList(bukaCapListContainer, defaultBukaCapItems, 'buka-cap-item-name', 'buka-cap-item-value');
        
        // Reset nilai default untuk Lain-lain
        document.getElementById('lost_time_notes').value = "0 MENIT";
        document.getElementById('hanger_notes').value = "0 HANGER";

        // Hitung ulang semua total (jadi 0)
        calculateAllTotals();
        
        // Kembalikan teks tombol dan judul
        formTitleEl.textContent = 'Buat Laporan Baru';
        mainSubmitBtn.textContent = 'Simpan Laporan Final';
        saveDraftBtn.textContent = 'Simpan Draft';
        cancelEditBtn.style.display = 'none'; // Sembunyikan tombol Batal
        formMessageEl.textContent = '';
    }

    // Event listener untuk tombol "Batal Edit"
    cancelEditBtn.addEventListener('click', resetFormAndState);


    /**
     * FUNGSI BARU: Mengumpulkan semua data form ke 1 objek
     */
    function getFormData() {
        return {
            user_id: currentUser.id,
            hari: document.getElementById('hari').value,
            tanggal: document.getElementById('tanggal').value,
            shift: parseInt(document.getElementById('shift').value),
            chief_name: document.getElementById('chief_name').value,
            total_masuk: parseInt(document.getElementById('total_masuk').value),

            abs_staff_masuk: parseInt(document.getElementById('abs_staff_masuk').value) || 0,
            abs_staff_tdk_masuk: document.getElementById('abs_staff_tdk_masuk').value,
            abs_wuster_masuk: parseInt(document.getElementById('abs_wuster_masuk').value) || 0,
            abs_wuster_tdk_masuk: document.getElementById('abs_wuster_tdk_masuk').value,
            abs_repair_masuk: parseInt(document.getElementById('abs_repair_masuk').value) || 0,
            abs_repair_tdk_masuk: document.getElementById('abs_repair_tdk_masuk').value,
            abs_incoming_masuk: parseInt(document.getElementById('abs_incoming_masuk').value) || 0,
            abs_incoming_tdk_masuk: document.getElementById('abs_incoming_tdk_masuk').value,
            abs_chrome_masuk: parseInt(document.getElementById('abs_chrome_masuk').value) || 0,
            abs_chrome_tdk_masuk: document.getElementById('abs_chrome_tdk_masuk').value,
            abs_painting_4_masuk: parseInt(document.getElementById('abs_painting_4_masuk').value) || 0,
            abs_painting_4_tdk_masuk: document.getElementById('abs_painting_4_tdk_masuk').value,
            abs_user_cpc_masuk: parseInt(document.getElementById('abs_user_cpc_masuk').value) || 0,
            abs_user_cpc_tdk_masuk: document.getElementById('abs_user_cpc_tdk_masuk').value,
            abs_maintenance_masuk: parseInt(document.getElementById('abs_maintenance_masuk').value) || 0,
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
            // status akan ditambahkan oleh fungsi submit
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
        laporanData.status = isDraft ? 'draft' : 'published'; // SET STATUS

        let error;
        if (currentlyEditingId) {
            // MODE UPDATE (memperbarui draft atau laporan yg ada)
            const { error: updateError } = await _supabase
                .from('laporan_wuster')
                .update(laporanData)
                .eq('id', currentlyEditingId);
            error = updateError;
        } else {
            // MODE INSERT (membuat draft atau laporan baru)
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
            resetFormAndState(); // Reset form
            
            // Muat ulang kedua tabel
            await loadWusterDrafts(); 
            currentPage = 1; // Reset paginasi riwayat
            await loadWusterHistory(); 
            
            setTimeout(() => { formMessageEl.textContent = ''; }, 3000);
        }
    }

    // Event listener "Simpan Laporan Final" (submit utama)
    wusterForm.onsubmit = async (event) => {
        event.preventDefault();
        await handleFormSubmit(false); // false = bukan draft
    };

    // Event listener "Simpan Draft"
    saveDraftBtn.addEventListener('click', async () => {
        await handleFormSubmit(true); // true = draft
    });


    // (Event listener pagination tidak berubah)
    prevButton.addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadWusterHistory(); } });
    nextButton.addEventListener('click', () => { const totalPages = Math.ceil(totalReports / itemsPerPage); if (currentPage < totalPages) { currentPage++; loadWusterHistory(); } });

    /**
     * Fungsi Inisialisasi Halaman
     * (Dibungkus DOMContentLoaded)
     */
    setTimeout(() => {
        (async () => {
            // Cek sesi dan data user
            let session;
            try {
                session = await getActiveUserSession(); // getActiveUserSession ada di app.js
                if (!session) {
                    alert('Anda harus login terlebih dahulu!');
                    window.location.href = 'index.html'; // Arahkan ke login
                    return;
                }
                currentUser = session.user;
                currentKaryawan = await loadSharedDashboardData(currentUser); // loadSharedDashboardData ada di app.js
            } catch (error) {
                console.error("Error saat inisialisasi user:", error);
                alert('Gagal memuat data user. Cek koneksi dan coba lagi.');
                return; // Hentikan eksekusi jika user gagal dimuat
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
    }, 150);

}); // Akhir dari DOMContentLoaded