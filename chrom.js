// =================================================================
// F. LOGIKA HALAMAN CHROM (chrom.html)
// (DIBUAT SEPERTI incoming.js)
// VERSI 2 - DENGAN TAMBAHAN PART REMOVER
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    const chromForm = document.getElementById('chrom-form');
    // Jika tidak ada form, hentikan script
    if (!chromForm) return; 

    let currentUser = null;
    let currentKaryawan = null;
    let currentlyEditingId = null;

    const historyListEl = document.getElementById('chrom-history-list')?.getElementsByTagName('tbody')[0];
    const draftListEl = document.getElementById('chrom-draft-list')?.getElementsByTagName('tbody')[0];
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

    // Variabel List Dinamis (B. Line Remover)
    const removerListContainer = document.getElementById('prod-remover-list');
    const addRemoverItemBtn = document.getElementById('add-remover-item-btn');
    const defaultRemoverItems = ["C/H BXD", "C/C 1DY 2", "HOLDER KYEA"]; // Sesuai file Anda
    const removerTotalSpan = document.getElementById('prod-remover-total');
    
    // Variabel List Dinamis (C. Line Touch Up Aerox)
    const touchUpAeroxListContainer = document.getElementById('prod-touch-up-aerox-list');
    const addTouchUpAeroxItemBtn = document.getElementById('add-touch-up-aerox-item-btn');
    const defaultTouchUpAeroxItems = ["M/C K1ZV ABS", "M/C FR K1SA", "M/C 2DP LH", "M/C 2DP FR"]; // Sesuai file Anda
    const touchUpAeroxTotalSpan = document.getElementById('prod-touch-up-aerox-total');
    
    // Variabel Total (Prod. Chrom) - TAMBAHAN
    // Ini otomatis mendeteksi semua input dgn class 'prod-chrom-calc'
    const prodChromInputs = document.querySelectorAll('.prod-chrom-calc');
    const prodChromTotalInput = document.getElementById('prod_chrom_total');

    /**
     * FUNGSI (TAMBAHAN): Menghitung total Produksi Chrom (A)
     */
    function updateProdChromTotal() {
        if (!prodChromTotalInput) return;
        let total = 0;
        // Tidak perlu diubah, .prod-chrom-calc sudah (3) input
        prodChromInputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });
        prodChromTotalInput.value = total;
    }
    // Tambahkan event listener ke setiap input Prod Chrom
    prodChromInputs.forEach(input => input.addEventListener('input', updateProdChromTotal));


    /**
     * FUNGSI: Menambahkan baris item ke list dinamis
     */
    function addDynamicRow(container, nameClass, valueClass, itemName = "", itemValue = "") {
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'dynamic-list-row';

        // --- PERBAIKAN DI SINI ---
        // Pastikan nilainya adalah angka 0 jika kosong, bukan string kosong
        const finalValue = parseInt(itemValue) || "";
        // --- AKHIR PERBAIKAN ---

        row.innerHTML = `
            <input type="text" class="${nameClass}" placeholder="Nama Item" value="${itemName}">
            <input type="number" class="${valueClass}" placeholder="Jumlah" value="${finalValue}">
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
    function deserializeDynamicList(container, nameClass, valueClass, notesString, defaultItems) {
        container.innerHTML = ''; // Kosongkan list
        if (!notesString || notesString.trim() === '') {
            resetDynamicList(container, defaultItems, nameClass, valueClass);
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
    if (addRemoverItemBtn) addRemoverItemBtn.addEventListener('click', () => addDynamicRow(removerListContainer, 'remover-item-name', 'remover-item-value'));
    if (addTouchUpAeroxItemBtn) addTouchUpAeroxItemBtn.addEventListener('click', () => addDynamicRow(touchUpAeroxListContainer, 'touchup-aerox-item-name', 'touchup-aerox-item-value'));

    // Event listener untuk tombol "Hapus" (Delegasi)
    chromForm.addEventListener('click', (e) => {
        if (e.target.closest('.button-remove')) {
            const row = e.target.closest('.dynamic-list-row');
            if (!row) return;
            row.remove(); // Hapus baris
            calculateAllDynamicTotals(); // Hitung ulang total
        }
    });

    // Event listener untuk perubahan input di list dinamis
    chromForm.addEventListener('input', (e) => {
        const targetClass = e.target.classList;
        if (targetClass.contains('remover-item-value') ||
            targetClass.contains('touchup-aerox-item-value')) {
            calculateAllDynamicTotals(); // Hitung ulang total
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
     * FUNGSI HELPER: Menjalankan semua kalkulasi total dinamis
     */
    function calculateAllDynamicTotals() {
        calculateDynamicListTotal(removerListContainer, 'remover-item-value', removerTotalSpan);
        calculateDynamicListTotal(touchUpAeroxListContainer, 'touchup-aerox-item-value', touchUpAeroxTotalSpan);
    }
    
    /**
     * FUNGSI PDF (Sama seperti sebelumnya, sudah disesuaikan untuk Chrom)
     */
    async function generatePDF(reportId) {
        alert('Membuat PDF... Mohon tunggu.');
        if (!window.jspdf) {
            alert('Gagal memuat library PDF. Pastikan Anda terhubung ke internet.');
            return;
        }
        const { jsPDF } = window.jspdf;
        try {
            const { data: report, error } = await _supabase.from('laporan_chrom').select('*').eq('id', reportId).single();
            if (error) throw new Error(`Gagal mengambil data laporan: ${error.message}`);
            
            const doc = new jsPDF({ format: 'a4' });
            const tableStyles = {
                theme: 'grid', styles: { cellWidth: 'wrap', fontSize: 8, cellPadding: 1 }, 
                headStyles: { fillColor: [22, 160, 133], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1 } 
            };
            const boldTotalStyle = (data) => {
                if (data.row.section === 'body' && data.cell.text[0].toLowerCase().includes('total')) {
                    data.cell.styles.fontStyle = 'bold';
                }
            };

            const marginX = 15;
            const fullWidth = doc.internal.pageSize.width - (marginX * 2);
            const colWidth = (fullWidth / 2) - 5;
            const leftColX = marginX;
            const rightColX = marginX + colWidth + 10;
            let currentY = 15;

            doc.setFontSize(16); doc.text("LAPORAN INTERNAL PAINTING", doc.internal.pageSize.width / 2, currentY, { align: 'center' });
            currentY += 5; doc.setFontSize(12); doc.text("LINE CHROM", doc.internal.pageSize.width / 2, currentY, { align: 'center' });
            currentY += 10; doc.setFontSize(9); 
            doc.text("HARI", marginX, currentY); doc.text(`: ${report.hari || ''}`, marginX + 30, currentY);
            currentY += 5; doc.text("TANGGAL", marginX, currentY); doc.text(`: ${report.tanggal || ''}`, marginX + 30, currentY);
            currentY += 5; doc.text("SHIFT", marginX, currentY); doc.text(`: ${report.shift || ''}`, marginX + 30, currentY);
            currentY += 8;

            doc.setFontSize(12); doc.text("1. ABSENSI", marginX, currentY); currentY += 4;
            
            const absMasukBody = [
                ['A. Line Chrom', report.abs_chrom_masuk],
                ['B. Line Remover', report.abs_remover_masuk],
                ['C. Line Touch Up', report.abs_touchup_masuk],
                ['D. Line Verifikasi', report.abs_verifikasi_masuk]
            ];
            const totalMasuk = absMasukBody.reduce((acc, row) => acc + (parseInt(row[1]) || 0), 0);
            absMasukBody.push(['TOTAL MASUK', totalMasuk]);
            
            doc.autoTable({
                startY: currentY, head: [['ABSENSI (MASUK)', 'QTY']], body: absMasukBody,
                ...tableStyles, margin: { left: leftColX }, tableWidth: colWidth, didParseCell: boldTotalStyle
            });

            const absTdkMasukBody = [
                ['A. Line Chrom', report.abs_chrom_tdk_masuk || ''],
                ['B. Line Remover', report.abs_remover_tdk_masuk || ''],
                ['C. Line Touch Up', report.abs_touchup_tdk_masuk || ''],
                ['D. Line Verifikasi', report.abs_verifikasi_tdk_masuk || '']
            ];
            doc.autoTable({
                startY: currentY, head: [['ABSENSI (TIDAK MASUK)', 'NAMA']], body: absTdkMasukBody,
                ...tableStyles, margin: { left: rightColX }, tableWidth: colWidth
            });
            currentY = doc.autoTable.previous.finalY + 12;

            doc.setFontSize(12); doc.text("2. PRODUKSI", marginX, currentY); currentY += 4;
            let leftY = currentY, rightY = currentY;

            // === PERUBAHAN DI SINI ===
            doc.autoTable({
                startY: leftY, head: [['A. LINE CHROM', 'TOTAL']],
                body: [
                    ['Part Machining', report.prod_chrom_machining],
                    ['Part Finishing', report.prod_chrom_finishing],
                    ['Part Remover', report.prod_chrom_remover], // <-- TAMBAHAN
                    ['TOTAL PRODUKSI', report.prod_chrom_total], 
                ],
                ...tableStyles, margin: { left: leftColX }, tableWidth: colWidth, didParseCell: boldTotalStyle
            });
            // === AKHIR PERUBAHAN ===
            
            leftY = doc.autoTable.previous.finalY + 8;
            
            doc.autoTable({
                startY: leftY, head: [['D. LINE VERIFIKASI (HASIL REPAIR)']],
                body: [[report.verifikasi_notes || '']],
                ...tableStyles, margin: { left: leftColX }, tableWidth: colWidth
            });
            leftY = doc.autoTable.previous.finalY;

            const removerItems = (report.prod_remover_notes || '').split('\n').filter(item => item.trim() !== '').map(item => { const parts = item.split(': '); return [parts[0] || '', parts[1] || '']; });
            let removerTotal = 0; removerItems.forEach(item => { removerTotal += parseInt(item[1]) || 0; });
            removerItems.push(['TOTAL', removerTotal]);

            doc.autoTable({
                startY: rightY, head: [['B. LINE REMOVER (PART NAME)', 'QTY']], body: removerItems,
                ...tableStyles, margin: { left: rightColX }, tableWidth: colWidth, didParseCell: boldTotalStyle
            });
            rightY = doc.autoTable.previous.finalY + 8;

            const touchUpAeroxItems = (report.prod_touchup_notes || '').split('\n').filter(item => item.trim() !== '').map(item => { const parts = item.split(': '); return [parts[0] || '', parts[1] || '']; });
            let touchUpAeroxTotal = 0; touchUpAeroxItems.forEach(item => { touchUpAeroxTotal += parseInt(item[1]) || 0; });
            touchUpAeroxItems.push(['TOTAL', touchUpAeroxTotal]);
            
            doc.autoTable({
                startY: rightY, head: [['C. LINE TOUCH UP AEROX (PART)', 'QTY']], body: touchUpAeroxItems,
                ...tableStyles, margin: { left: rightColX }, tableWidth: colWidth, didParseCell: boldTotalStyle
            });
            rightY = doc.autoTable.previous.finalY;

            // Footer
            currentY = Math.max(leftY, rightY) + 15;
            const preparerName = currentKaryawan ? currentKaryawan.nama_lengkap : (currentUser ? currentUser.email : 'N/A');
            const chiefName = report.chief_name || '( .......................... )';
            doc.setFontSize(9);
            doc.text("Dibuat,", marginX, currentY); doc.text(preparerName, marginX, currentY + 15); doc.text("Foreman", marginX, currentY + 20);
            doc.text("Disetujui,", doc.internal.pageSize.width / 2, currentY, { align: 'center' }); doc.text(chiefName, doc.internal.pageSize.width / 2, currentY + 15, { align: 'center' }); doc.text("Chief", doc.internal.pageSize.width / 2, currentY + 20, { align: 'center' });
            doc.text("Mengetahui,", doc.internal.pageSize.width - marginX, currentY, { align: 'right' }); doc.text("SINGGIH E W", doc.internal.pageSize.width - marginX, currentY + 15, { align: 'right' }); doc.text("Dept Head", doc.internal.pageSize.width - marginX, currentY + 20, { align: 'right' });

            doc.save(`Laporan_Chrom_${report.tanggal}.pdf`);
        } catch (error) {
            alert(`Gagal membuat PDF: ${error.message}`);
            console.error('PDF Generation Error:', error);
        }
    }


    /**
     * FUNGSI: Memuat draft laporan
     */
    async function loadChromDrafts() {
        if (!draftListEl) return;
        draftListEl.innerHTML = '<tr><td colspan="4">Memuat draft...</td></tr>';
        
        const { data, error } = await _supabase
            .from('laporan_chrom') 
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
                        const { error } = await _supabase.from('laporan_chrom').delete().eq('id', idToDelete);
                        if (error) {
                            alert('Gagal menghapus draft: ' + error.message);
                        } else {
                            await loadChromDrafts(); 
                        }
                    }
                });
            });
        }
    }

    /**
     * Fungsi: Memuat riwayat laporan
     */
    async function loadChromHistory() {
        if (!historyListEl) return;
        historyListEl.innerHTML = '<tr><td colspan="5">Memuat riwayat...</td></tr>';
        
        const { count, error: countError } = await _supabase
            .from('laporan_chrom') 
            .select('*', { count: 'exact', head: true })
            .or('status.eq.published,status.is.null');
            
        if (countError) {
            historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${countError.message}</td></tr>`; return;
        }
        
        totalReports = count;
        const totalPages = Math.ceil(totalReports / itemsPerPage) || 1;
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error } = await _supabase.from('laporan_chrom') 
            .select('id, tanggal, shift, hari, created_at') 
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
                    <td>${laporan.hari}</td>
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
                row.querySelector('.button-pdf').addEventListener('click', (e) => {
                    generatePDF(e.currentTarget.getAttribute('data-id'));
                });
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
            .from('laporan_chrom') 
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
        
        // Isi Absensi (8 fields)
        document.getElementById('abs_chrom_masuk').value = report.abs_chrom_masuk;
        document.getElementById('abs_chrom_tdk_masuk').value = report.abs_chrom_tdk_masuk;
        document.getElementById('abs_remover_masuk').value = report.abs_remover_masuk;
        document.getElementById('abs_remover_tdk_masuk').value = report.abs_remover_tdk_masuk;
        document.getElementById('abs_touchup_masuk').value = report.abs_touchup_masuk;
        document.getElementById('abs_touchup_tdk_masuk').value = report.abs_touchup_tdk_masuk;
        document.getElementById('abs_verifikasi_masuk').value = report.abs_verifikasi_masuk;
        document.getElementById('abs_verifikasi_tdk_masuk').value = report.abs_verifikasi_tdk_masuk;
        
        // Isi Produksi A (3 fields)
        document.getElementById('prod_chrom_machining').value = report.prod_chrom_machining;
        document.getElementById('prod_chrom_finishing').value = report.prod_chrom_finishing;
        // === PERUBAHAN DI SINI ===
        document.getElementById('prod_chrom_remover').value = report.prod_chrom_remover;
        // === AKHIR PERUBAHAN ===
        
        // Isi Produksi D (Textarea)
        document.getElementById('verifikasi_notes').value = report.verifikasi_notes;

        // Isi dynamic lists (B & C)
        deserializeDynamicList(removerListContainer, 'remover-item-name', 'remover-item-value', report.prod_remover_notes, defaultRemoverItems);
        deserializeDynamicList(touchUpAeroxListContainer, 'touchup-aerox-item-name', 'touchup-aerox-item-value', report.prod_touchup_notes, defaultTouchUpAeroxItems);

        // Hitung ulang semua total
        calculateAllDynamicTotals(); // Hitung total list
        updateProdChromTotal(); // Hitung total Prod A
        
        // Atur state form
        currentlyEditingId = reportId;
        formTitleEl.textContent = `Mengedit Laporan (Tanggal: ${report.tanggal}, Shift: ${report.shift})`;
        mainSubmitBtn.textContent = 'Update Laporan Final';
        saveDraftBtn.textContent = 'Update Draft';
        cancelEditBtn.style.display = 'inline-block';
        
        formMessageEl.textContent = 'Data berhasil dimuat. Silakan edit.';
        chromForm.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * FUNGSI: Mengosongkan form dan mereset state
     */
    function resetFormAndState() {
        chromForm.reset(); 
        currentlyEditingId = null; 

        // Reset 2 list dinamis
        resetDynamicList(removerListContainer, defaultRemoverItems, 'remover-item-name', 'remover-item-value');
        resetDynamicList(touchUpAeroxListContainer, defaultTouchUpAeroxItems, 'touchup-aerox-item-name', 'touchup-aerox-item-value');
        
        // Hitung ulang semua total (jadi 0)
        calculateAllDynamicTotals();
        updateProdChromTotal();
        
        // Kembalikan teks tombol dan judul
        formTitleEl.textContent = 'Buat Laporan Baru (Chrom)';
        mainSubmitBtn.textContent = 'Simpan Laporan Final';
        saveDraftBtn.textContent = 'Simpan Draft';
        cancelEditBtn.style.display = 'none';
        formMessageEl.textContent = '';
    }

    // Event listener untuk tombol "Batal Edit"
    cancelEditBtn.addEventListener('click', resetFormAndState);

    // Helper function to get INT value from input
    const getIntVal = (id) => parseInt(document.getElementById(id).value) || 0;
    const getStrVal = (id) => document.getElementById(id).value;


    /**
     * FUNGSI: Mengumpulkan semua data form ke 1 objek
     */
    function getFormData() {
        return {
            user_id: currentUser.id,
            hari: getStrVal('hari'),
            tanggal: getStrVal('tanggal'),
            shift: getStrVal('shift'), 
            chief_name: getStrVal('chief_name'),
            
            // Absensi (8 fields)
            abs_chrom_masuk: getIntVal('abs_chrom_masuk'),
            abs_chrom_tdk_masuk: getStrVal('abs_chrom_tdk_masuk'),
            abs_remover_masuk: getIntVal('abs_remover_masuk'),
            abs_remover_tdk_masuk: getStrVal('abs_remover_tdk_masuk'),
            abs_touchup_masuk: getIntVal('abs_touchup_masuk'),
            abs_touchup_tdk_masuk: getStrVal('abs_touchup_tdk_masuk'),
            abs_verifikasi_masuk: getIntVal('abs_verifikasi_masuk'),
            abs_verifikasi_tdk_masuk: getStrVal('abs_verifikasi_tdk_masuk'),
            
            // Produksi A (4 fields)
            prod_chrom_machining: getIntVal('prod_chrom_machining'),
            prod_chrom_finishing: getIntVal('prod_chrom_finishing'),
            // === PERUBAHAN DI SINI ===
            prod_chrom_remover: getIntVal('prod_chrom_remover'),
            // === AKHIR PERUBAHAN ===
            prod_chrom_total: getIntVal('prod_chrom_total'), 
            
            // Produksi D (Textarea)
            verifikasi_notes: getStrVal('verifikasi_notes'),
            
            // Serialisasi list dinamis (B & C)
            prod_remover_notes: serializeDynamicList(removerListContainer, 'remover-item-name', 'remover-item-value'),
            prod_touchup_notes: serializeDynamicList(touchUpAeroxListContainer, 'touchup-aerox-item-name', 'touchup-aerox-item-value')
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
                .from('laporan_chrom') 
                .update(laporanData)
                .eq('id', currentlyEditingId);
            error = updateError;
        } else {
            // MODE INSERT
            const { error: insertError } = await _supabase
                .from('laporan_chrom') 
                .insert(laporanData);
            error = insertError;
        }

        if (error) {
            formMessageEl.textContent = `Error: ${error.message}`;
            console.error('Submit Error:', error);
        } else {
            formMessageEl.textContent = `Laporan berhasil disimpan sebagai ${isDraft ? 'Draft' : 'Final'}!`;
            resetFormAndState();
            
            await loadChromDrafts(); 
            currentPage = 1; 
            await loadChromHistory(); 
            
            setTimeout(() => { formMessageEl.textContent = ''; }, 3000);
        }
    }

    // Event listener "Simpan Laporan Final"
    chromForm.onsubmit = async (event) => {
        event.preventDefault();
        await handleFormSubmit(false); // false = bukan draft
    };

    // Event listener "Simpan Draft"
    saveDraftBtn.addEventListener('click', async () => {
        await handleFormSubmit(true); // true = draft
    });


    // Event listener pagination
    prevButton.addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadChromHistory(); } });
    nextButton.addEventListener('click', () => { const totalPages = Math.ceil(totalReports / itemsPerPage); if (currentPage < totalPages) { currentPage++; loadChromHistory(); } });

    /**
     * Fungsi Inisialisasi Halaman
     */
    (async () => {
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
            await loadChromDrafts();
            await loadChromHistory(); 
        } catch (error) {
            console.error("Gagal memuat data:", error);
            if (historyListEl) historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Gagal memuat riwayat.</td></tr>`;
            if (draftListEl) draftListEl.innerHTML = `<tr><td colspan="4" style="color: red;">Gagal memuat draft.</td></tr>`;
        }
    })();
});