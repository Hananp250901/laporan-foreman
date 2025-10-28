// =================================================================
// D. LOGIKA HALAMAN WUSTER (wuster.html)
// =================================================================

const wusterForm = document.getElementById('wuster-form');
if (wusterForm) {
    // Inisialisasi library jsPDF.
    const { jsPDF } = window.jspdf;

    let currentUser = null;
    let currentKaryawan = null;
    const historyListEl = document.getElementById('wuster-history-list')?.getElementsByTagName('tbody')[0];
    const formMessageEl = document.getElementById('form-message');

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
    const defaultBukaCapItems = ["MC 2DP FR", "MC 2DP RR", "MC K1ZV ABS", "MC K1ZV CBS", "MC K15A", "MC K2SA", "MC K3VA", "MC XD 831", "MC K60A ABS", "MC BWN 120", "MC K12M ABS", "MC K12M 80"];
    const wusterInputs = document.querySelectorAll('.wuster-calc');
    const wusterTotalSpan = document.getElementById('perf_wuster_total');
    const checkInputs = document.querySelectorAll('.check-calc');
    const checkTotalSpan = document.getElementById('total_check_total');
    const prodInputs = document.querySelectorAll('.prod-calc');
    const prodTotalSpan = document.getElementById('total_prod_total');

    /**
     * FUNGSI: Menambahkan baris item ke list dinamis
     */
    function addDynamicRow(container, nameClass, valueClass, itemName = "", itemValue = "") {
        const row = document.createElement('div');
        row.className = 'dynamic-list-row';
        row.innerHTML = `
            <input type="text" class="${nameClass}" placeholder="Nama Item" value="${itemName}">
            <input type="text" class="${valueClass}" placeholder="Jumlah/Catatan" value="${itemValue}">
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
        container.innerHTML = '';
        defaultItems.forEach(item => addDynamicRow(container, nameClass, valueClass, item));
    }

    // Event listener untuk tombol "Tambah Item"
    addHolderItemBtn.addEventListener('click', () => addDynamicRow(holderListContainer, 'packing-item-name', 'packing-item-value'));
    addPasangItemBtn.addEventListener('click', () => addDynamicRow(pasangListContainer, 'pasang-item-name', 'pasang-item-value'));
    addAssyCupItemBtn.addEventListener('click', () => addDynamicRow(assyCupListContainer, 'assy-cup-item-name', 'assy-cup-item-value'));
    addTouchUpItemBtn.addEventListener('click', () => addDynamicRow(touchUpListContainer, 'touch-up-item-name', 'touch-up-item-value'));
    addBukaCapItemBtn.addEventListener('click', () => addDynamicRow(bukaCapListContainer, 'buka-cap-item-name', 'buka-cap-item-value'));

    // Event listener untuk tombol "Hapus" (Delegasi)
    wusterForm.addEventListener('click', (e) => {
        if (e.target.closest('.button-remove')) {
            e.target.closest('.dynamic-list-row').remove();
        }
    });

    /**
     * FUNGSI: Serialisasi data list dinamis
     */
    function serializeDynamicList(container, nameClass, valueClass) {
        let resultString = "";
        const rows = container.querySelectorAll('.dynamic-list-row');
        rows.forEach(row => {
            const name = row.querySelector(`.${nameClass}`).value;
            const value = row.querySelector(`.${valueClass}`).value;
            if (name && value) { resultString += `${name}: ${value}\n`; }
        });
        return resultString.trim();
    }

    // FUNGSI KALKULASI TOTAL
    function calculateTotal(inputs, totalSpan) {
        let sum = 0;
        inputs.forEach(input => { sum += parseInt(input.value) || 0; });
        totalSpan.textContent = sum;
    }

    // Tambahkan event listener ke setiap input kalkulasi
    wusterInputs.forEach(input => input.addEventListener('input', () => calculateTotal(wusterInputs, wusterTotalSpan)));
    checkInputs.forEach(input => input.addEventListener('input', () => calculateTotal(checkInputs, checkTotalSpan)));
    prodInputs.forEach(input => input.addEventListener('input', () => calculateTotal(prodInputs, prodTotalSpan)));

    /**
     * FUNGSI PDF (Layout Sequential Columns)
     */
    async function generatePDF(reportId) {
        alert('Membuat PDF... Mohon tunggu.');
        try {
            const { data: report, error } = await _supabase.from('laporan_wuster').select('*').eq('id', reportId).single();
            if (error) throw new Error(`Gagal mengambil data laporan: ${error.message}`);

            const doc = new jsPDF({ format: 'legal' });
            const tableStyles = {
                theme: 'grid', styles: { cellWidth: 'wrap', fontSize: 9 }, // Font size tetap kecil
                headStyles: { fillColor: [22, 160, 133], textColor: [255, 255, 255], fontSize: 10 }
            };
            const colWidth = 90;
            const fullWidth = 190;
            const marginX = (doc.internal.pageSize.width - fullWidth) / 2;
            const col1X = marginX;
            const col2X = marginX + colWidth + 5;
            const boldLabel = { 0: { cellWidth: 50, fontStyle: 'bold' } };

            doc.setFontSize(16);
            doc.text("LAPORAN AKHIR SHIFT", doc.internal.pageSize.width / 2, 15, { align: 'center' });
            doc.setFontSize(10);
            doc.text("HARI", col1X, 30); doc.text(`: ${report.hari}`, col1X + 40, 30);
            doc.text("TANGGAL", col1X, 35); doc.text(`: ${report.tanggal}`, col1X + 40, 35);
            doc.text("SHIFT", col1X, 40); doc.text(`: ${report.shift}`, col1X + 40, 40);
            doc.text("TOTAL MASUK", col1X, 45); doc.text(`: ${report.total_masuk} Orang`, col1X + 40, 45);

            // Tabel Absensi (Full Width)
            doc.autoTable({
                startY: 55,
                head: [['1. ABSENSI', 'Masuk (org)', 'Tidak Masuk (Nama)']],
                body: [
                    ['STAFF', report.abs_staff_masuk, report.abs_staff_tdk_masuk || ''],
                    ['WUSTER', report.abs_wuster_masuk, report.abs_wuster_tdk_masuk || ''],
                    ['REPAIR & TOUCH UP', report.abs_repair_masuk, report.abs_repair_tdk_masuk || ''],
                    ['INCOMING, STEP ASSY, BUKA CAP', report.abs_incoming_masuk, report.abs_incoming_tdk_masuk || ''],
                    ['CHROM, VERIFIKASI, AEROX, REMOVER', report.abs_chrome_masuk, report.abs_chrome_tdk_masuk || ''],
                    ['PAINTING 4', report.abs_painting_4_masuk, report.abs_painting_4_tdk_masuk || ''],
                    ['USER & CPC', report.abs_user_cpc_masuk, report.abs_user_cpc_tdk_masuk || ''],
                    ['MAINTENANCE', report.abs_maintenance_masuk, report.abs_maintenance_tdk_masuk || ''],
                ],
                ...tableStyles,
                margin: { left: marginX }, tableWidth: fullWidth,
                columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 25 }, 2: { cellWidth: 105 } }
            });
            let startY2Col = doc.autoTable.previous.finalY + 5; // Y Awal untuk layout 2 kolom

            // Fungsi bantu gambar tabel
            function drawSingleTable(title, note, startY, startX, width = colWidth) {
                doc.autoTable({
                    startY: startY, head: [[title]], body: [[note || '']], ...tableStyles,
                    margin: { left: startX }, tableWidth: width,
                    columnStyles: { 0: { cellWidth: width - 2 } }
                });
                return doc.autoTable.previous.finalY;
            }
             // Fungsi bantu gambar tabel kalkulasi
             function drawCalcTable(options) {
                 doc.autoTable({ ...options, ...tableStyles });
                 return doc.autoTable.previous.finalY;
             }

            // --- Gambar Kolom Kiri Dulu ---
            let leftY = startY2Col;
            leftY = drawSingleTable('3. Packing Holder', report.packing_holder_notes, leftY, col1X);
            leftY = drawSingleTable('4. Pasang Holder', report.pasang_holder_notes, leftY + 5, col1X);
            leftY = drawSingleTable('5. Problem / Quality', report.problem_quality_notes, leftY + 5, col1X);
            leftY = drawSingleTable('6. Suplay Material', report.suplay_material_notes, leftY + 5, col1X);
            leftY = drawSingleTable('7. Packing Box / Lory', report.packing_box_notes, leftY + 5, col1X);
            leftY = drawSingleTable('8. Trouble Mesin', report.trouble_mesin_notes, leftY + 5, col1X);

            // --- Gambar Kolom Kanan ---
            let rightY = startY2Col; // Mulai dari Y yang sama dengan kolom kiri
            rightY = drawSingleTable('9. Hasil Assy Cup', report.hasil_assy_cup_notes, rightY, col2X);
            rightY = drawSingleTable('10. Hasil Touch Up', report.hasil_touch_up_notes, rightY + 5, col2X);
            rightY = drawSingleTable('11. Hasil Buka Cap', report.hasil_buka_cap_notes, rightY + 5, col2X);

            // Tabel Kalkulasi (lanjut di kolom kanan)
            const wusterTotal = (report.perf_wuster_isi || 0) + (report.perf_wuster_kosong || 0);
            rightY = drawCalcTable({
                startY: rightY + 5, head: [['13. PERFORMA WUSTER', 'Jumlah']],
                body: [['Hanger Isi', report.perf_wuster_isi || 0], ['Hanger Kosong', report.perf_wuster_kosong || 0], ['Total', wusterTotal]],
                margin: { left: col2X }, tableWidth: colWidth,
                columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 38 } },
                didParseCell: (data) => { if (data.row.index === 2) { data.cell.styles.fontStyle = 'bold'; } }
            });

            const checkTotal = (report.total_check_ok || 0) + (report.total_check_ng || 0) + (report.total_check_repair || 0) + (report.total_check_body || 0);
            rightY = drawCalcTable({
                startY: rightY + 5, head: [['14. TOTAL CHECK', 'Jumlah']],
                body: [['OK', report.total_check_ok || 0], ['NG', report.total_check_ng || 0], ['Repair', report.total_check_repair || 0], ['Body', report.total_check_body || 0], ['Total', checkTotal]],
                margin: { left: col2X }, tableWidth: colWidth,
                columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 38 } },
                didParseCell: (data) => { if (data.row.index === 4) { data.cell.styles.fontStyle = 'bold'; } }
            });

            const prodTotal = (report.total_prod_fresh || 0) + (report.total_prod_repair || 0) + (report.total_prod_ng || 0);
            rightY = drawCalcTable({
                startY: rightY + 5, head: [['14. TOTAL PRODUKSI', 'Jumlah']],
                body: [['Fresh', report.total_prod_fresh || 0], ['Repair', report.total_prod_repair || 0], ['NG', report.total_prod_ng || 0], ['Total', prodTotal]],
                margin: { left: col2X }, tableWidth: colWidth,
                columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 38 } },
                didParseCell: (data) => { if (data.row.index === 3) { data.cell.styles.fontStyle = 'bold'; } }
            });
            // --- Akhir Kolom Kanan ---

            // Tentukan Y-posisi akhir (ambil yang paling bawah dari kedua kolom)
            let currentY = Math.max(leftY, rightY) + 5;

            // Tabel Lain-lain (Full Width)
            doc.autoTable({
                startY: currentY, head: [['LAIN-LAIN', 'Catatan']],
                body: [['Lost Time', report.lost_time_notes || ''], ['Hanger', report.hanger_notes || '']],
                ...tableStyles, margin: { left: marginX }, tableWidth: fullWidth,
                columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 140 } }
            });

            // Footer
            let finalY = doc.autoTable.previous.finalY + 15;
            // Cek jika footer melebihi batas halaman
            if (finalY > (doc.internal.pageSize.height - 40)) { // Beri margin bawah 40
                 doc.addPage();
                 finalY = 20;
            }
            const preparerName = currentKaryawan ? currentKaryawan.nama_lengkap : (currentUser ? currentUser.email : 'N/A');
            doc.setFontSize(10);
            doc.text("Dibuat,", col1X, finalY); doc.text(preparerName, col1X, finalY + 20); doc.text("Foreman", col1X, finalY + 25);
            doc.text("Disetujui,", doc.internal.pageSize.width / 2, finalY, { align: 'center' });
            const chiefName = report.chief_name || '( .......................... )';
            doc.text(chiefName, doc.internal.pageSize.width / 2, finalY + 20, { align: 'center' }); doc.text("Chief", doc.internal.pageSize.width / 2, finalY + 25, { align: 'center' });
            doc.text("Mengetahui,", doc.internal.pageSize.width - marginX, finalY, { align: 'right' });
            doc.text("SINGGIH E W", doc.internal.pageSize.width - marginX, finalY + 20, { align: 'right' }); doc.text("Dept Head", doc.internal.pageSize.width - marginX, finalY + 25, { align: 'right' });

            doc.save(`Laporan_Wuster_${report.tanggal}_Shift${report.shift}.pdf`);
        } catch (error) {
            alert(`Gagal membuat PDF: ${error.message}`);
            console.error('PDF Generation Error:', error);
        }
    }


    /**
     * Fungsi: Memuat riwayat laporan
     */
    async function loadWusterHistory() {
        if (!historyListEl) return;
        historyListEl.innerHTML = '<tr><td colspan="5">Memuat riwayat...</td></tr>';
        const { count, error: countError } = await _supabase.from('laporan_wuster').select('*', { count: 'exact', head: true });
        if (countError) {
            historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${countError.message}</td></tr>`; return;
        }
        totalReports = count;
        const totalPages = Math.ceil(totalReports / itemsPerPage) || 1;
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        const { data, error } = await _supabase.from('laporan_wuster')
            .select('id, tanggal, shift, total_masuk, created_at')
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
                    <td><button class="button-pdf" data-id="${laporan.id}"><span class="material-icons">picture_as_pdf</span> PDF</button></td>
                `;
                historyListEl.appendChild(row);
                row.querySelector('.button-pdf').addEventListener('click', (e) => generatePDF(e.currentTarget.getAttribute('data-id')));
            });
        }
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevButton.disabled = (currentPage === 1);
        nextButton.disabled = (currentPage === totalPages) || (totalReports === 0);
    }

    /**
     * Fungsi: Menangani submit form
     */
    wusterForm.onsubmit = async (event) => {
        event.preventDefault();
        if (!currentUser) {
            formMessageEl.textContent = 'Error: Sesi tidak ditemukan. Harap refresh.'; return;
        }
        formMessageEl.textContent = 'Menyimpan...';

        const laporanData = {
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
        };

        const { data, error } = await _supabase.from('laporan_wuster').insert(laporanData);

        if (error) {
            formMessageEl.textContent = `Error: ${error.message}`;
            console.error('Submit Error:', error);
        } else {
            formMessageEl.textContent = 'Laporan berhasil disimpan!';
            wusterForm.reset();
            resetDynamicList(holderListContainer, defaultHolderItems, 'packing-item-name', 'packing-item-value');
            resetDynamicList(pasangListContainer, defaultPasangItems, 'pasang-item-name', 'pasang-item-value');
            resetDynamicList(assyCupListContainer, defaultAssyCupItems, 'assy-cup-item-name', 'assy-cup-item-value');
            resetDynamicList(touchUpListContainer, defaultTouchUpItems, 'touch-up-item-name', 'touch-up-item-value');
            resetDynamicList(bukaCapListContainer, defaultBukaCapItems, 'buka-cap-item-name', 'buka-cap-item-value');
            calculateTotal(wusterInputs, wusterTotalSpan);
            calculateTotal(checkInputs, checkTotalSpan);
            calculateTotal(prodInputs, prodTotalSpan);
            currentPage = 1;
            loadWusterHistory();
            setTimeout(() => { formMessageEl.textContent = ''; }, 3000);
        }
    };

    // Event listener untuk tombol pagination
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; loadWusterHistory(); }
    });
    nextButton.addEventListener('click', () => {
        const totalPages = Math.ceil(totalReports / itemsPerPage);
        if (currentPage < totalPages) { currentPage++; loadWusterHistory(); }
    });

    /**
     * Fungsi Inisialisasi Halaman
     */
    (async () => {
        const session = await getActiveUserSession();
        if (!session) {
            alert('Anda harus login terlebih dahulu!');
            window.location.href = 'login.html';
            return;
        }
        currentUser = session.user;
        currentKaryawan = await loadSharedDashboardData(currentUser);
        currentPage = 1;
        resetDynamicList(holderListContainer, defaultHolderItems, 'packing-item-name', 'packing-item-value');
        resetDynamicList(pasangListContainer, defaultPasangItems, 'pasang-item-name', 'pasang-item-value');
        resetDynamicList(assyCupListContainer, defaultAssyCupItems, 'assy-cup-item-name', 'assy-cup-item-value');
        resetDynamicList(touchUpListContainer, defaultTouchUpItems, 'touch-up-item-name', 'touch-up-item-value');
        resetDynamicList(bukaCapListContainer, defaultBukaCapItems, 'buka-cap-item-name', 'buka-cap-item-value');
        calculateTotal(wusterInputs, wusterTotalSpan);
        calculateTotal(checkInputs, checkTotalSpan);
        calculateTotal(prodInputs, prodTotalSpan);
        await loadWusterHistory();
    })();
}