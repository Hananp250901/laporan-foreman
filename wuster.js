// =================================================================
// D. LOGIKA HALAMAN WUSTER (wuster.html)
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    const wusterForm = document.getElementById('wuster-form');
    // Jika tidak ada form wuster di halaman ini, hentikan script
    if (!wusterForm) {
        // console.log("Wuster form not found on this page."); // Debugging (opsional)
        return;
    }

    // --- Deklarasi Variabel ---
    let currentUser = null;         // Info user yg login (dari Supabase Auth)
    let currentKaryawan = null;     // Info karyawan (nama, NIK dari tabel 'karyawan')
    let currentlyEditingId = null;  // Menyimpan ID laporan yg sedang diedit (null jika buat baru)

    // Elemen UI
    const historyListEl = document.getElementById('wuster-history-list')?.getElementsByTagName('tbody')[0];
    const draftListEl = document.getElementById('wuster-draft-list')?.getElementsByTagName('tbody')[0];
    const formMessageEl = document.getElementById('form-message'); // Untuk pesan error/sukses form
    const formTitleEl = document.getElementById('form-title');     // Judul form (Buat Baru / Edit)
    const mainSubmitBtn = document.getElementById('main-submit-btn'); // Tombol Simpan Final/Update Final
    const saveDraftBtn = document.getElementById('save-draft-btn');   // Tombol Simpan Draft/Update Draft
    const cancelEditBtn = document.getElementById('cancel-edit-btn'); // Tombol Batal Edit

    // Pagination
    const itemsPerPage = 10;        // Jumlah item per halaman riwayat
    let currentPage = 1;            // Halaman riwayat yg sedang aktif
    let totalReports = 0;           // Total laporan (untuk hitung total halaman)
    const prevButton = document.getElementById('prev-page-btn');
    const nextButton = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');

    // Konfigurasi untuk semua list dinamis di halaman ini
    const listConfigs = [
        // Setiap objek mewakili satu list dinamis
        {
            id: 'packing-holder',           // Bagian dari ID elemen HTML (e.g., packing-holder-list)
            nameClass: 'packing-item-name', // Class CSS untuk input Nama Item
            valueClass: 'packing-item-value',// Class CSS untuk input Jumlah/Catatan
            defaults: ["HOLDER KYEA", "HOLDER BLS", "HOLDER BCM", "HOLDER 21D", "CAP 2DP", "CAP BC11", "CAP K64A RR", "CAP K64 FR"], // Item default saat reset
            container: null,                // Akan diisi elemen div container list
            button: null,                   // Akan diisi elemen tombol 'Tambah Item'
            totalSpan: null,                // Akan diisi elemen span untuk total (jika ada)
            notesKey: 'packing_holder_notes' // Nama kolom di database Supabase
        },
        { id: 'pasang-holder', nameClass: 'pasang-item-name', valueClass: 'pasang-item-value', defaults: ["HOLDER KYEA", "HOLDER BLS", "HOLDER BCM", "HOLDER 21D", "CAP 2DP", "CAP BC11", "CAP K64A RR", "CAP K64 FR"], container: null, button: null, totalSpan: null, notesKey: 'pasang_holder_notes' },
        { id: 'assy-cup', nameClass: 'assy-cup-item-name', valueClass: 'assy-cup-item-value', defaults: ["MC 2DP FR", "MC 2DP RR", "MC K1ZV ABS", "MC K1ZV CBS", "MC K15A", "MC K2SA", "MC K3VA", "MC XD 831"], container: null, button: null, totalSpan: null, notesKey: 'hasil_assy_cup_notes' },
        { id: 'touch-up', nameClass: 'touch-up-item-name', valueClass: 'touch-up-item-value', defaults: ["CC 1DY 1", "CC 1DY 2", "CAP ENGINE 9307"], container: null, button: null, totalSpan: null, notesKey: 'hasil_touch_up_notes' },
        { id: 'buka-cap', nameClass: 'buka-cap-item-name', valueClass: 'buka-cap-item-value', defaults: ["MC 2DP FR", "MC 2DP RR", "MC K1ZV ABS", "MC K1ZV CBS", "MC K15A", "MC K2SA", "MC K3VA", "MC XD 831", "MC K84A FR", "MC BWN"], container: null, button: null, totalSpan: null, notesKey: 'hasil_buka_cap_notes' }
    ];
    // Ambil elemen HTML berdasarkan konfigurasi
    listConfigs.forEach(config => {
        config.container = document.getElementById(`${config.id}-list`);
        // ID Tombol di HTML Anda menggunakan format 'add-nama-item-btn'
        config.button = document.getElementById(`add-${config.id}-item-btn`);
        config.totalSpan = document.getElementById(`${config.id}-total`);
        // Peringatan jika elemen tidak ditemukan (membantu debugging)
        if (!config.container) console.warn(`Wuster: Element ${config.id}-list not found.`);
        if (!config.button) console.warn(`Wuster: Button add-${config.id}-item-btn not found.`); // Peringatan disesuaikan
        if (!config.totalSpan && ['packing-holder', 'pasang-holder', 'assy-cup', 'touch-up', 'buka-cap'].includes(config.id)) console.warn(`Wuster: Total span for ${config.id} list not found.`);
    });

    // Elemen input untuk total statis
    const wusterInputs = document.querySelectorAll('.wuster-calc'); const wusterTotalSpan = document.getElementById('perf_wuster_total');
    const checkInputs = document.querySelectorAll('.check-calc'); const checkTotalSpan = document.getElementById('total_check_total');
    const prodInputs = document.querySelectorAll('.prod-calc'); const prodTotalSpan = document.getElementById('total_prod_total');
    // --- Akhir Deklarasi Variabel ---


    // --- Fungsi Helper List Dinamis ---
    /**
     * Menambahkan baris input baru (Nama Item + Jumlah/Catatan) ke container list.
     */
    function addDynamicRow(container, nameClass, valueClass, itemName = "", itemValue = "") {
        if (!container) return; // Jangan lakukan apa-apa jika container tidak ada
        const row = document.createElement('div');
        row.className = 'dynamic-list-row';
        // Cek apakah list ini harusnya angka berdasarkan valueClass
        const isNumeric = ['packing-item-value', 'pasang-item-value', 'assy-cup-item-value', 'touch-up-item-value', 'buka-cap-item-value'].includes(valueClass);
        const inputType = isNumeric ? "number" : "text"; // Tipe input: number atau text
        const inputPlaceholder = isNumeric ? "Jumlah" : "Jumlah/Catatan"; // Placeholder sesuai tipe
        const inputValue = isNumeric ? (itemValue || 0) : itemValue; // Default 0 jika angka & kosong

        row.innerHTML = `
            <input type="text" class="${nameClass}" placeholder="Nama Item" value="${itemName}">
            <input type="${inputType}" class="${valueClass}" placeholder="${inputPlaceholder}" value="${inputValue}">
            <button type="button" class="button-remove">
                <span class="material-icons">remove_circle</span>
            </button>
        `;
        container.appendChild(row); // Tambahkan baris baru ke akhir container
    }

    /**
     * Mengosongkan container list dan mengisinya kembali dengan item default dari konfigurasi.
     */
    function resetDynamicList(config) {
        if (!config.container) return;
        config.container.innerHTML = ''; // Hapus semua baris yang ada
        config.defaults.forEach(item => addDynamicRow(config.container, config.nameClass, config.valueClass, item)); // Tambahkan item default
    }

    /**
     * Mengosongkan container list dan mengisinya berdasarkan string dari database (format "Nama: Jumlah\n").
     */
    function deserializeDynamicList(config, notesString) {
        if (!config.container) return;
        config.container.innerHTML = ''; // Hapus semua baris yang ada
        // Jika string kosong atau hanya spasi, reset ke default
        if (!notesString || notesString.trim() === '') {
            resetDynamicList(config);
            return;
        }
        // Jika ada isi, pecah per baris dan buat inputnya
        const items = notesString.split('\n');
        items.forEach(item => {
            const parts = item.split(': '); // Pisahkan nama dan jumlah/catatan
            const name = parts[0]?.trim() || ''; // Ambil nama (bagian pertama), hilangkan spasi
            const value = parts.slice(1).join(': ')?.trim() || ''; // Ambil sisa bagian (jumlah/catatan), gabungkan jika ada ':' lagi, hilangkan spasi
            if (name || value) { // Hanya tambahkan jika ada nama atau value
                addDynamicRow(config.container, config.nameClass, config.valueClass, name, value);
            }
        });
    }

    /**
     * Mengubah data dari list dinamis (input-input) menjadi satu string untuk disimpan ke DB.
     */
    function serializeDynamicList(config) {
        if (!config.container) return ""; // Kembalikan string kosong jika container tidak ada
        let resultString = "";
        const rows = config.container.querySelectorAll('.dynamic-list-row');
        rows.forEach(row => {
            const nameInput = row.querySelector(`.${config.nameClass}`);
            const valueInput = row.querySelector(`.${config.valueClass}`);
            if (nameInput && valueInput) {
                const name = nameInput.value.trim();
                const value = valueInput.value.trim();
                // Hanya tambahkan ke string jika nama atau value ada isinya
                if (name || value) {
                    resultString += `${name}: ${value}\n`;
                }
            }
        });
        return resultString.trim(); // Hapus spasi/newline ekstra di akhir
    }
    // --- Akhir Fungsi Helper List Dinamis ---


    // --- Fungsi Kalkulasi Total ---
    /**
     * Menghitung total jumlah dari input-input statis (Performa Wuster, Total Check, Total Prod).
     */
    function calculateStaticTotal(inputs, totalSpan) {
        if (!totalSpan) return; // Jangan hitung jika elemen span total tidak ada
        let sum = 0;
        inputs.forEach(input => {
            sum += parseInt(input.value) || 0; // Tambahkan nilai input ke sum (anggap 0 jika bukan angka)
        });
        totalSpan.textContent = sum; // Tampilkan hasilnya
    }

    /**
     * Menghitung total jumlah dari semua input angka dalam satu list dinamis (jika list tsb punya totalSpan).
     */
    function calculateDynamicListTotal(config) {
        // Hanya hitung jika ada container DAN span total
        if (!config.container || !config.totalSpan) return;
        let sum = 0;
        const inputs = config.container.querySelectorAll(`.${config.valueClass}`); // Ambil semua input jumlah/angka
        inputs.forEach(input => {
            sum += parseInt(input.value) || 0; // Tambahkan nilainya ke sum
        });
        config.totalSpan.textContent = sum; // Tampilkan hasilnya
    }

    /**
     * Menjalankan SEMUA fungsi kalkulasi total (statis dan dinamis).
     */
    function calculateAllTotals() {
        calculateStaticTotal(wusterInputs, wusterTotalSpan);
        calculateStaticTotal(checkInputs, checkTotalSpan);
        calculateStaticTotal(prodInputs, prodTotalSpan);
        calculateAllDynamicTotals(); // Panggil juga fungsi untuk total dinamis
    }

    /**
     * Menjalankan kalkulasi total untuk SEMUA list dinamis yang punya totalSpan.
     */
    function calculateAllDynamicTotals() {
        listConfigs.forEach(config => {
            // Cek apakah list ini dikonfigurasi untuk punya total
            if (config.totalSpan) {
                calculateDynamicListTotal(config);
            }
        });
    }
    // --- Akhir Fungsi Kalkulasi Total ---


    // --- Event Listener Dinamis (Tambah, Hapus, Input) ---
    // Tambahkan event listener ke setiap tombol "Tambah Item"
    listConfigs.forEach(config => {
        if (config.button) {
            config.button.addEventListener('click', () => addDynamicRow(config.container, config.nameClass, config.valueClass));
        } else {
            // Peringatan jika tombol tidak ditemukan, tapi tidak menghentikan script
            console.warn(`Wuster: Button element not found for list ${config.id}, cannot add listener.`);
        }
    });

    // Gunakan event delegation di form untuk tombol "Hapus" dan perubahan "Input Jumlah/Angka"
     wusterForm.addEventListener('click', (e) => {
         // Jika tombol Hapus (- lingkaran merah) atau ikon di dalamnya yg diklik
         if (e.target.closest('.button-remove')) {
             const row = e.target.closest('.dynamic-list-row'); // Cari baris terdekat
             if (row) {
                 row.remove(); // Hapus baris dari tampilan
                 calculateAllDynamicTotals(); // Hitung ulang totalnya
             }
         }
     });
     wusterForm.addEventListener('input', (e) => {
         // Cek apakah yang berubah adalah input angka/jumlah di salah satu list dinamis yg punya total
         const isDynamicNumericInput = listConfigs.some(config =>
             config.totalSpan && e.target.classList.contains(config.valueClass)
         );
         if (isDynamicNumericInput) {
             calculateAllDynamicTotals(); // Jika ya, hitung ulang semua total dinamis
         }
     });
    // Event listener untuk input statis (Performa, Check, Prod)
    wusterInputs.forEach(input => input.addEventListener('input', () => calculateStaticTotal(wusterInputs, wusterTotalSpan)));
    checkInputs.forEach(input => input.addEventListener('input', () => calculateStaticTotal(checkInputs, checkTotalSpan)));
    prodInputs.forEach(input => input.addEventListener('input', () => calculateStaticTotal(prodInputs, prodTotalSpan)));
    // --- Akhir Event Listener Dinamis ---


    // --- Fungsi PDF ---
    /**
     * Helper function untuk PDF: Mengurai string "Nama: Jumlah\n", menghitung total, dan menambahkannya ke string jika ada angka.
     */
    function addTotalToNotes(notesString) {
        if (!notesString || notesString.trim() === '') return '(Kosong)'; // Tampilkan '(Kosong)' jika string kosong
        let sum = 0;
        const lines = notesString.split('\n');
        let hasNumericValue = false; // Flag untuk cek apakah ada angka valid

        lines.forEach(line => {
            const parts = line.split(': ');
            // Hanya proses jika ada format "Nama: Value"
            if (parts.length >= 2) {
                const valuePart = parts[parts.length - 1].trim(); // Ambil bagian paling belakang setelah ':' terakhir
                const num = parseInt(valuePart); // Coba ubah jadi angka
                // Jika berhasil jadi angka (bukan NaN)
                if (!isNaN(num)) {
                    sum += num; // Tambahkan ke total
                    hasNumericValue = true; // Set flag bahwa ada angka
                }
            }
        });

        // Hanya tambahkan baris "TOTAL: xxx" jika memang ada angka yang dijumlahkan
        return hasNumericValue ? `${notesString}\n\nTOTAL: ${sum}` : notesString;
    }

    /**
     * Fungsi utama untuk generate PDF laporan Wuster.
     */
    async function generatePDF(reportId) {
        alert('Membuat PDF... Mohon tunggu.');
        // Cek ketersediaan library PDF
        if (!window.jspdf) { alert('Gagal memuat library PDF (jspdf). Pastikan Anda online.'); return; }
        const { jsPDF } = window.jspdf;
         if (!window.jspdf.autoTable) { alert('Gagal memuat plugin PDF (jspdf-autotable). Pastikan Anda online.'); return;} //

        try {
            // Ambil data lengkap laporan dari Supabase berdasarkan ID
            const { data: report, error } = await _supabase.from('laporan_wuster').select('*').eq('id', reportId).single();
            if (error) throw new Error(`Gagal mengambil data laporan: ${error.message}`);

            const doc = new jsPDF({ format: 'legal' }); // Ukuran kertas Legal
            // Style umum tabel
            const tableStyles = { theme: 'grid', styles: { cellWidth: 'wrap', fontSize: 8, cellPadding: 1 }, headStyles: { fillColor: [22, 160, 133], textColor: [255, 255, 255], fontSize: 9 } };
            // Layout kolom
            const colWidth = 90; const fullWidth = 190;
            const marginX = (doc.internal.pageSize.width - fullWidth) / 2;
            const col1X = marginX; const col2X = marginX + colWidth + 5; const marginYSmall = 2;

            // --- Header PDF ---
            doc.setFontSize(16); doc.text("LAPORAN AKHIR SHIFT - WUSTER", doc.internal.pageSize.width / 2, 15, { align: 'center' });
            doc.setFontSize(9);
            doc.text("HARI", col1X, 25); doc.text(`: ${report.hari || 'N/A'}`, col1X + 30, 25);
            doc.text("TANGGAL", col1X, 29); doc.text(`: ${report.tanggal || 'N/A'}`, col1X + 30, 29);
            doc.text("SHIFT", col1X, 33); doc.text(`: ${report.shift || 'N/A'}`, col1X + 30, 33);
            doc.text("TOTAL MASUK", col1X, 37); doc.text(`: ${report.total_masuk || 0} Orang`, col1X + 30, 37);

            // --- Tabel 1: Absensi (Full Width) ---
            doc.autoTable({
                startY: 45, head: [['ABSENSI', 'Masuk (org)', 'Tidak Masuk (Nama)']],
                body: [ // Pastikan nilai default 0 jika null/undefined
                    ['STAFF', report.abs_staff_masuk || 0, report.abs_staff_tdk_masuk || ''],
                    ['WUSTER', report.abs_wuster_masuk || 0, report.abs_wuster_tdk_masuk || ''],
                    ['REPAIR & TOUCH UP', report.abs_repair_masuk || 0, report.abs_repair_tdk_masuk || ''],
                    ['INCOMING, STEP ASSY, BUKA CAP', report.abs_incoming_masuk || 0, report.abs_incoming_tdk_masuk || ''],
                    ['CHROM, VERIFIKASI, AEROX, REMOVER', report.abs_chrome_masuk || 0, report.abs_chrome_tdk_masuk || ''],
                    ['PAINTING 4', report.abs_painting_4_masuk || 0, report.abs_painting_4_tdk_masuk || ''],
                    ['USER & CPC', report.abs_user_cpc_masuk || 0, report.abs_user_cpc_tdk_masuk || ''],
                    ['MAINTENANCE', report.abs_maintenance_masuk || 0, report.abs_maintenance_tdk_masuk || ''],
                 ],
                ...tableStyles, margin: { left: marginX }, tableWidth: fullWidth,
                columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 25 }, 2: { cellWidth: 105 } }
            });
            let startY2Col = doc.autoTable.previous.finalY + marginYSmall; // Posisi Y awal untuk layout 2 kolom

            // Helper: Gambar tabel single-cell (untuk notes)
            function drawSingleTable(title, note, startY, startX, width = colWidth) {
                doc.autoTable({
                    startY: startY, head: [[title]], body: [[note || '(Kosong)']], // Tampilkan (Kosong) jika null
                    ...tableStyles, margin: { left: startX }, tableWidth: width,
                    columnStyles: { 0: { cellWidth: width - 2 } }, // Lebar cell = lebar tabel - padding
                    // Style tambahan: Buat teks "TOTAL: xxx" jadi bold
                    didParseCell: (data) => {
                        if (data.cell.raw?.toString().includes('TOTAL:')) {
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                 });
                 return doc.autoTable.previous.finalY; // Kembalikan posisi Y setelah tabel
            }
            // Helper: Gambar tabel kalkulasi (Performa, Check, Prod)
            function drawCalcTable(options) {
                 let localTableStyles = JSON.parse(JSON.stringify(tableStyles)); // Kopi style agar bisa di-override
                 doc.autoTable({ ...options, ...localTableStyles });
                 return doc.autoTable.previous.finalY;
            }

            // --- Kolom Kiri ---
            let leftY = startY2Col;
            leftY = drawSingleTable('Packing Holder', addTotalToNotes(report.packing_holder_notes), leftY, col1X);
            leftY = drawSingleTable('Pasang Holder', addTotalToNotes(report.pasang_holder_notes), leftY + marginYSmall, col1X);
            leftY = drawSingleTable('Problem / Quality', report.problem_quality_notes, leftY + marginYSmall, col1X);
            leftY = drawSingleTable('Suplay Material', report.suplay_material_notes, leftY + marginYSmall, col1X);
            leftY = drawSingleTable('Packing Box / Lory', report.packing_box_notes, leftY + marginYSmall, col1X);
            leftY = drawSingleTable('Trouble Mesin', report.trouble_mesin_notes, leftY + marginYSmall, col1X);

            // Tabel Total Produksi (masih di kolom kiri)
            const prodTotal = (report.total_prod_fresh || 0) + (report.total_prod_repair || 0) + (report.total_prod_ng || 0);
            leftY = drawCalcTable({
                 startY: leftY + marginYSmall, head: [['TOTAL PRODUKSI', 'Jumlah']], // Nomor urut disesuaikan
                 body: [
                     ['Fresh', report.total_prod_fresh || 0],
                     ['Repair', report.total_prod_repair || 0],
                     ['NG', report.total_prod_ng || 0],
                     ['Total', prodTotal]
                 ],
                 margin: { left: col1X }, tableWidth: colWidth,
                 columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 38 } },
                 didParseCell: (data) => { if (data.row.index === 3) { data.cell.styles.fontStyle = 'bold'; } } // Baris Total bold
            });

            // --- Kolom Kanan ---
            let rightY = startY2Col; // Mulai dari Y yang sama dengan kolom kiri
            rightY = drawSingleTable('Hasil Assy Cup', addTotalToNotes(report.hasil_assy_cup_notes), rightY, col2X);
            rightY = drawSingleTable('Hasil Touch Up', addTotalToNotes(report.hasil_touch_up_notes), rightY + marginYSmall, col2X);
            rightY = drawSingleTable('Hasil Buka Cap', addTotalToNotes(report.hasil_buka_cap_notes), rightY + marginYSmall, col2X);

            // Tabel Performa Wuster
            const wusterTotal = (report.perf_wuster_isi || 0) + (report.perf_wuster_kosong || 0);
            rightY = drawCalcTable({
                 startY: rightY + marginYSmall, head: [['PERFORMA WUSTER', 'Jumlah']],
                 body: [
                     ['Hanger Isi', report.perf_wuster_isi || 0],
                     ['Hanger Kosong', report.perf_wuster_kosong || 0],
                     ['Total', wusterTotal]
                 ],
                 margin: { left: col2X }, tableWidth: colWidth,
                 columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 38 } },
                 didParseCell: (data) => { if (data.row.index === 2) { data.cell.styles.fontStyle = 'bold'; } }
            });

            // Tabel Total Check
            const checkTotal = (report.total_check_ok || 0) + (report.total_check_ng || 0) + (report.total_check_repair || 0) + (report.total_check_body || 0);
            rightY = drawCalcTable({
                 startY: rightY + marginYSmall, head: [['TOTAL CHECK', 'Jumlah']],
                 body: [
                     ['OK', report.total_check_ok || 0],
                     ['NG', report.total_check_ng || 0],
                     ['Repair', report.total_check_repair || 0],
                     ['Body', report.total_check_body || 0],
                     ['Total', checkTotal]
                 ],
                 margin: { left: col2X }, tableWidth: colWidth,
                 columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 38 } },
                 didParseCell: (data) => { if (data.row.index === 4) { data.cell.styles.fontStyle = 'bold'; } }
            });

            // --- Lain-lain (Full Width, di bawah kedua kolom) ---
            let currentY = Math.max(leftY, rightY) + marginYSmall; // Ambil Y terendah dari kedua kolom
            doc.autoTable({
                startY: currentY, head: [['LAIN-LAIN', 'Catatan']], // Nomor urut disesuaikan
                body: [
                    ['Lost Time', report.lost_time_notes || ''],
                    ['Hanger', report.hanger_notes || '']
                ],
                ...tableStyles, margin: { left: marginX }, tableWidth: fullWidth,
                columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' }, 1: { cellWidth: 140 } }
            });

            // --- Footer PDF (Tanda Tangan) ---
            let finalY = doc.autoTable.previous.finalY + 10; // Jarak dari tabel Lain-lain
            const pageHeight = doc.internal.pageSize.height;
            const bottomMargin = 15; // Jarak aman dari bawah kertas
            // Cek jika footer akan melewati batas bawah, jika ya, tambah halaman baru
            if (finalY + 40 > pageHeight - bottomMargin) { // Perkirakan tinggi footer ~40pt
                 doc.addPage();
                 finalY = 20; // Mulai dari atas di halaman baru
            }

            // Ambil nama pembuat (jika data karyawan ada) atau email
            const preparerName = currentKaryawan?.nama_lengkap || currentUser?.email || 'N/A';
            doc.setFontSize(9); // Font kecil untuk footer
            const footerCol1X = col1X; // Posisi X kolom 1
            const footerCol2X = doc.internal.pageSize.width / 2; // Posisi X kolom 2 (tengah)
            const footerCol3X = doc.internal.pageSize.width - marginX; // Posisi X kolom 3 (kanan)

            // Kolom 1: Dibuat
            doc.text("Dibuat,", footerCol1X, finalY);
            doc.text(preparerName, footerCol1X, finalY + 15);
            doc.text("Foreman", footerCol1X, finalY + 20);

            // Kolom 2: Disetujui
            const chiefName = report.chief_name || '( .......................... )'; // Default jika kosong
            doc.text("Disetujui,", footerCol2X, finalY, { align: 'center' });
            doc.text(chiefName, footerCol2X, finalY + 15, { align: 'center' });
            doc.text("Chief", footerCol2X, finalY + 20, { align: 'center' });

            // Kolom 3: Mengetahui
            doc.text("Mengetahui,", footerCol3X, finalY, { align: 'right' });
            doc.text("SINGGIH E W", footerCol3X, finalY + 15, { align: 'right' });
            doc.text("Dept Head", footerCol3X, finalY + 20, { align: 'right' });

            // --- Simpan PDF ---
            // Gunakan fallback jika tanggal atau shift kosong
            doc.save(`Laporan_Wuster_${report.tanggal || 'TanpaTanggal'}_Shift${report.shift || 'TanpaShift'}.pdf`);

        } catch (error) {
            // Tangani jika ada error saat generate PDF
            alert(`Gagal membuat PDF: ${error.message}`);
            console.error('PDF Generation Error:', error);
        }
    }
    // --- Akhir Fungsi PDF ---


    // --- Fungsi CRUD (Create, Read, Update, Delete) ---
    /**
     * Memuat daftar laporan yang berstatus 'draft' milik user ini.
     */
    async function loadWusterDrafts() {
        if (!draftListEl || !currentUser) return; // Pastikan elemen tabel dan user ada
        draftListEl.innerHTML = '<tr><td colspan="4">Memuat draft...</td></tr>'; // Pesan loading
        try {
            const { data, error } = await _supabase.from('laporan_wuster')
                .select('id, tanggal, shift, created_at') // Ambil kolom yg perlu ditampilkan
                .eq('status', 'draft')                  // Filter hanya draft
                .eq('user_id', currentUser.id)          // Filter hanya milik user ini
                .order('created_at', { ascending: false }); // Urutkan terbaru di atas

            if (error) throw error; // Lemparkan error jika query gagal

            if (data.length === 0) {
                draftListEl.innerHTML = '<tr><td colspan="4">Tidak ada draft tersimpan.</td></tr>';
                return;
            }

            // Jika ada data, buat baris tabelnya
            draftListEl.innerHTML = ''; // Kosongkan tabel dulu
            data.forEach(laporan => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${laporan.tanggal || 'N/A'}</td>
                    <td>${laporan.shift || 'N/A'}</td>
                    <td>${new Date(laporan.created_at).toLocaleString('id-ID')}</td>
                    <td class="history-actions">
                        <button class="button-edit" data-id="${laporan.id}"><span class="material-icons">edit</span> Lanjutkan</button>
                        <button class="button-danger button-delete-draft" data-id="${laporan.id}"><span class="material-icons">delete</span> Hapus</button>
                    </td>`;
                draftListEl.appendChild(row);

                // Tambah event listener ke tombol 'Lanjutkan' dan 'Hapus'
                row.querySelector('.button-edit').addEventListener('click', (e) => loadReportForEditing(e.currentTarget.dataset.id));
                row.querySelector('.button-delete-draft').addEventListener('click', async (e) => {
                    const idToDelete = e.currentTarget.dataset.id;
                    if (confirm('Anda yakin ingin menghapus draft ini?')) { // Konfirmasi user
                        const { error: deleteError } = await _supabase.from('laporan_wuster').delete().eq('id', idToDelete);
                        if (deleteError) { alert('Gagal menghapus draft: ' + deleteError.message); }
                        else { await loadWusterDrafts(); } // Muat ulang daftar draft jika berhasil
                    }
                });
            });
        } catch (error) {
             draftListEl.innerHTML = `<tr><td colspan="4" style="color: red;">Error memuat draft: ${error.message}</td></tr>`;
             console.error("Error loading drafts:", error);
        }
    }

    /**
     * Memuat riwayat laporan yang sudah 'published' (atau lama yg statusnya null).
     */
    async function loadWusterHistory() {
        if (!historyListEl || !currentUser) return;
        historyListEl.innerHTML = '<tr><td colspan="5">Memuat riwayat...</td></tr>';
        try {
            // 1. Hitung total laporan dulu untuk pagination
            const { count, error: countError } = await _supabase.from('laporan_wuster')
                .select('*', { count: 'exact', head: true }) // head:true hanya ambil count
                .or('status.eq.published,status.is.null'); // Filter published atau lama

            if (countError) throw countError;

            totalReports = count || 0;
            const totalPages = Math.ceil(totalReports / itemsPerPage) || 1;
            // Pastikan currentPage tidak melebihi total halaman atau kurang dari 1
            currentPage = Math.max(1, Math.min(currentPage, totalPages));

            // 2. Hitung offset (range) data yang akan diambil
            const from = (currentPage - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            // 3. Ambil data untuk halaman saat ini
            const { data, error } = await _supabase.from('laporan_wuster')
                .select('id, tanggal, shift, total_masuk, created_at') // Ambil kolom yg perlu ditampilkan
                .or('status.eq.published,status.is.null')      // Filter published atau lama
                .order('created_at', { ascending: false })     // Urutkan terbaru di atas
                .range(from, to);                              // Ambil sesuai range halaman

            if (error) throw error;

            // Tampilkan data ke tabel
            if (data.length === 0 && totalReports === 0) {
                historyListEl.innerHTML = '<tr><td colspan="5">Belum ada riwayat laporan.</td></tr>';
            } else if (data.length === 0 && totalReports > 0) {
                // Ada laporan tapi tidak di halaman ini (jarang terjadi jika currentPage dibatasi)
                 historyListEl.innerHTML = `<tr><td colspan="5">Tidak ada data di halaman ${currentPage}.</td></tr>`;
            } else {
                historyListEl.innerHTML = ''; // Kosongkan tabel
                data.forEach(laporan => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${laporan.tanggal || 'N/A'}</td>
                        <td>${laporan.shift || 'N/A'}</td>
                        <td>${laporan.total_masuk || 0}</td>
                        <td>${new Date(laporan.created_at).toLocaleString('id-ID')}</td>
                        <td class="history-actions">
                            <button class="button-edit" data-id="${laporan.id}"><span class="material-icons">edit</span> Edit</button>
                            <button class="button-pdf" data-id="${laporan.id}"><span class="material-icons">picture_as_pdf</span> PDF</button>
                        </td>`;
                    historyListEl.appendChild(row);
                    // Tambah event listener ke tombol 'Edit' dan 'PDF'
                    row.querySelector('.button-edit').addEventListener('click', (e) => loadReportForEditing(e.currentTarget.dataset.id));
                    row.querySelector('.button-pdf').addEventListener('click', (e) => generatePDF(e.currentTarget.dataset.id));
                });
            }

            // Update info pagination
            pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
            prevButton.disabled = (currentPage === 1);
            nextButton.disabled = (currentPage >= totalPages);

        } catch (error) {
             historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Error memuat riwayat: ${error.message}</td></tr>`;
             console.error("Error loading history:", error);
             // Nonaktifkan tombol paginasi jika error
             prevButton.disabled = true;
             nextButton.disabled = true;
             pageInfo.textContent = 'Page - of -';
        }
    }

    /**
     * Memuat data satu laporan (berdasarkan ID) ke dalam form untuk diedit.
     */
    async function loadReportForEditing(reportId) {
        formMessageEl.textContent = 'Memuat data laporan...';
        try {
            const { data: report, error } = await _supabase.from('laporan_wuster').select('*').eq('id', reportId).single();
            if (error) throw error;

            // Isi semua field standar (cocokkan ID elemen dengan nama kolom DB)
            // Array ID elemen yang sama dengan nama kolom di tabel 'laporan_wuster'
            const fieldIds = ['hari', 'tanggal', 'shift', 'chief_name', 'total_masuk',
                              'abs_staff_masuk', 'abs_staff_tdk_masuk', 'abs_wuster_masuk', 'abs_wuster_tdk_masuk',
                              'abs_repair_masuk', 'abs_repair_tdk_masuk', 'abs_incoming_masuk', 'abs_incoming_tdk_masuk',
                              'abs_chrome_masuk', 'abs_chrome_tdk_masuk', 'abs_painting_4_masuk', 'abs_painting_4_tdk_masuk',
                              'abs_user_cpc_masuk', 'abs_user_cpc_tdk_masuk', 'abs_maintenance_masuk', 'abs_maintenance_tdk_masuk',
                              'problem_quality_notes', 'suplay_material_notes', 'packing_box_notes', 'trouble_mesin_notes',
                              'perf_wuster_isi', 'perf_wuster_kosong', 'total_check_ok', 'total_check_ng',
                              'total_check_repair', 'total_check_body', 'total_prod_fresh', 'total_prod_repair', 'total_prod_ng',
                              'lost_time_notes', 'hanger_notes'];
            fieldIds.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                   element.value = report[id] ?? ''; // Isi value atau string kosong jika null/undefined
                } else {
                   console.warn(`Wuster: Element with ID ${id} not found when loading report`);
                }
            });

            // Isi list dinamis menggunakan deserialize
            listConfigs.forEach(config => {
                // Ambil nama kolom notes dari config (e.g., packing_holder_notes)
                deserializeDynamicList(config, report[config.notesKey]);
            });

            calculateAllTotals(); // Hitung ulang semua total

            // Atur state aplikasi ke mode edit
            currentlyEditingId = reportId; // Simpan ID yg diedit
            formTitleEl.textContent = `Mengedit Laporan (Tanggal: ${report.tanggal || 'N/A'}, Shift: ${report.shift || 'N/A'})`; // Update judul form
            mainSubmitBtn.textContent = 'Update Laporan Final'; // Ubah teks tombol submit
            saveDraftBtn.textContent = 'Update Draft';          // Ubah teks tombol draft
            cancelEditBtn.style.display = 'inline-block';      // Tampilkan tombol Batal
            formMessageEl.textContent = 'Data berhasil dimuat. Silakan edit.';

            // Scroll ke form agar terlihat
            wusterForm.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            alert('Gagal memuat data laporan untuk diedit: ' + error.message);
            formMessageEl.textContent = ''; // Hapus pesan loading
            console.error("Error loading report for editing:", error);
        }
    }

    /**
     * Mengosongkan semua input form, mereset list dinamis, dan mengembalikan state ke mode 'Buat Baru'.
     */
    function resetFormAndState() {
        wusterForm.reset(); // Mengosongkan input, select, textarea
        currentlyEditingId = null; // Hapus ID yg sedang diedit
        listConfigs.forEach(resetDynamicList); // Kembalikan list dinamis ke item default
        // Kembalikan nilai default khusus untuk 'Lain-lain'
        document.getElementById('lost_time_notes').value = "0 MENIT";
        document.getElementById('hanger_notes').value = "0 HANGER";
        calculateAllTotals(); // Hitung ulang total (akan jadi 0)

        // Kembalikan tampilan tombol dan judul ke state awal
        formTitleEl.textContent = 'Buat Laporan Baru';
        mainSubmitBtn.textContent = 'Simpan Laporan Final';
        saveDraftBtn.textContent = 'Simpan Draft';
        cancelEditBtn.style.display = 'none'; // Sembunyikan tombol Batal
        formMessageEl.textContent = ''; // Hapus pesan form
    }

    // Tambahkan event listener ke tombol "Batal Edit"
    cancelEditBtn.addEventListener('click', resetFormAndState);

    /**
     * Mengumpulkan semua nilai dari form ke dalam satu objek JavaScript.
     */
    function getFormData() {
        const formData = { user_id: currentUser.id }; // Selalu sertakan user_id
        // Array ID elemen yang sama dengan nama kolom di tabel 'laporan_wuster'
        const fieldIds = ['hari', 'tanggal', 'shift', 'chief_name', 'total_masuk',
                          'abs_staff_masuk', 'abs_staff_tdk_masuk', 'abs_wuster_masuk', 'abs_wuster_tdk_masuk',
                          'abs_repair_masuk', 'abs_repair_tdk_masuk', 'abs_incoming_masuk', 'abs_incoming_tdk_masuk',
                          'abs_chrome_masuk', 'abs_chrome_tdk_masuk', 'abs_painting_4_masuk', 'abs_painting_4_tdk_masuk',
                          'abs_user_cpc_masuk', 'abs_user_cpc_tdk_masuk', 'abs_maintenance_masuk', 'abs_maintenance_tdk_masuk',
                          'problem_quality_notes', 'suplay_material_notes', 'packing_box_notes', 'trouble_mesin_notes',
                          'perf_wuster_isi', 'perf_wuster_kosong', 'total_check_ok', 'total_check_ng',
                          'total_check_repair', 'total_check_body', 'total_prod_fresh', 'total_prod_repair', 'total_prod_ng',
                          'lost_time_notes', 'hanger_notes'];
        
        // [PERBAIKAN ERROR 400 DIMULAI DI SINI]
        fieldIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // Cek apakah field ini harusnya angka
                const isNumber = element.type === 'number' ||
                                 element.classList.contains('wuster-calc') ||
                                 element.classList.contains('check-calc') ||
                                 element.classList.contains('prod-calc') ||
                                 id === 'total_masuk' ||
                                 id.includes('_masuk') || 
                                 id === 'shift';
                
                if (isNumber) {
                    const value = element.value;
                    const parsedValue = parseInt(value);

                    // Perlakuan khusus untuk 'shift'
                    if (id === 'shift') {
                        // Jika 'shift' kosong ("") atau 0, kirim 'null' ke DB
                        // 'null' berarti "tidak ada data", '0' adalah data angka 0.
                        formData[id] = (value === "" || isNaN(parsedValue) || parsedValue === 0) ? null : parsedValue;
                    } else {
                        // Untuk field angka lainnya, default ke 0 jika kosong atau tidak valid
                        formData[id] = isNaN(parsedValue) ? 0 : parsedValue;
                    }
                } else {
                    // Jika ini adalah string (textarea, text, select-string)
                    formData[id] = element.value;
                }

            } else {
                 // Peringatan jika elemen form tidak ditemukan
                 console.warn(`Wuster: Element with ID ${id} not found in getFormData`);
            }
        });
        // [PERBAIKAN ERROR 400 SELESAI]

        // Ambil nilai dari list dinamis (sudah diserialisasi jadi string)
        listConfigs.forEach(config => {
            formData[config.notesKey] = serializeDynamicList(config);
        });

        return formData; // Kembalikan objek data lengkap
    }

    /**
     * Fungsi utama yang menangani proses penyimpanan (baik insert baru atau update).
     * Menerima parameter boolean 'isDraft' untuk menentukan status laporan.
     */
    async function handleFormSubmit(isDraft = false) {
        if (!currentUser) { formMessageEl.textContent = 'Error: Sesi tidak ditemukan. Tidak bisa menyimpan.'; return; }
        
        // Validasi Sederhana (Hanya untuk 'Simpan Final')
        if (!isDraft) {
            const tanggal = document.getElementById('tanggal').value;
            const shift = document.getElementById('shift').value;
            if (!tanggal || !shift) {
                formMessageEl.textContent = 'Error: Tanggal dan Shift wajib diisi untuk Laporan Final.';
                alert('Tanggal dan Shift wajib diisi untuk Laporan Final!');
                return;
            }
        }
        
        formMessageEl.textContent = 'Menyimpan...'; // Pesan loading

        try {
            const laporanData = getFormData(); // Ambil semua data dari form
            laporanData.status = isDraft ? 'draft' : 'published'; // Set status ('draft' atau 'published')

            let result;
            if (currentlyEditingId) { // Jika sedang dalam mode UPDATE
                console.log(`Wuster: Updating report ID: ${currentlyEditingId} with status: ${laporanData.status}`); // Debugging
                // Kirim perintah update ke Supabase
                result = await _supabase.from('laporan_wuster').update(laporanData).eq('id', currentlyEditingId);
            } else { // Jika sedang dalam mode INSERT (buat baru)
                console.log(`Wuster: Inserting new report with status: ${laporanData.status}`); // Debugging
                // Kirim perintah insert ke Supabase
                result = await _supabase.from('laporan_wuster').insert(laporanData);
            }

            // Cek hasil operasi database
            if (result.error) {
                throw result.error; // Lemparkan error jika gagal
            }

            // Jika berhasil
            formMessageEl.textContent = `Laporan berhasil disimpan sebagai ${isDraft ? 'Draft' : 'Final'}!`;
            resetFormAndState(); // Kosongkan form dan reset state

            // Muat ulang daftar draft dan riwayat (agar data terbaru muncul)
            await loadWusterDrafts();
            currentPage = 1; // Kembali ke halaman pertama riwayat
            await loadWusterHistory();

            // Hilangkan pesan sukses setelah 3 detik
            setTimeout(() => { formMessageEl.textContent = ''; }, 3000);

        } catch (error) {
            // Tangani error saat menyimpan
            formMessageEl.textContent = `Error: ${error.message}`;
            console.error('Submit Error:', error);
        }
    }
    // --- Akhir Fungsi CRUD ---


    // --- Event listener Submit Utama & Simpan Draft ---
    wusterForm.onsubmit = (e) => {
        e.preventDefault(); // Mencegah submit HTML biasa
        handleFormSubmit(false); // Panggil fungsi submit dengan status 'published'
    };
    saveDraftBtn.addEventListener('click', () => {
        handleFormSubmit(true); // Panggil fungsi submit dengan status 'draft'
    });

    // --- Event listener pagination ---
    prevButton.addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadWusterHistory(); } });
    nextButton.addEventListener('click', () => { if (!nextButton.disabled) { currentPage++; loadWusterHistory(); } });


    // === INILAH BAGIAN YANG DIKEMBALIKAN KE VERSI SIMPEL ===
    /**
     * Fungsi Inisialisasi Halaman (Jalan sekali setelah DOM siap)
     */
    (async () => {
        console.log("Wuster: Initializing page...");
        // Langsung cek session saat halaman dimuat
        const session = await getActiveUserSession(); // Fungsi ini ada di app.js

        // Jika TIDAK ADA session, tampilkan alert dan redirect
        // Pengecekan ini sudah ada di app.js, tapi kita tambahkan lagi di sini
        // sebagai fallback jika user langsung membuka halaman ini.
        if (!session) {
            console.warn("Wuster: No active session found during init, redirecting to index.html...");
            alert('Anda harus login terlebih dahulu!'); // Tampilkan peringatan
            window.location.href = 'index.html'; // Redirect ke halaman login (index.html)
            return; // Hentikan eksekusi script selanjutnya di halaman ini
        }

        // Jika lolos cek session, lanjutkan inisialisasi
        console.log("Wuster: Session found, proceeding with initialization.");
        currentUser = session.user; // Simpan info user yg login

        try {
            // Muat data karyawan (untuk footer PDF & info sidebar)
            // Fungsi ini dipanggil lagi di sini untuk memastikan currentKaryawan terisi
            // Meskipun sidebar sudah diurus app.js, kita butuh datanya untuk PDF
            currentKaryawan = await loadSharedDashboardData(currentUser); // Fungsi ini ada di app.js

            // Set form ke kondisi awal (kosong/default) dan hitung total awal
            resetFormAndState();

            // Muat data draft dan riwayat secara bersamaan (lebih efisien)
            await Promise.all([
                loadWusterDrafts(),
                loadWusterHistory()
            ]);

            console.log("Wuster: Initialization complete.");

        } catch (error) {
            // Tangani error jika gagal memuat data awal (misal network error)
            console.error("Wuster: Initialization error:", error);
            alert('Gagal memuat data awal untuk halaman Wuster. Cek koneksi internet dan coba refresh.');
            // Tampilkan pesan error di tabel jika elemennya ada
            if (historyListEl) historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Gagal memuat riwayat.</td></tr>`;
            if (draftListEl) draftListEl.innerHTML = `<tr><td colspan="4" style="color: red;">Gagal memuat draft.</td></tr>`;
        }
    })();
    // === AKHIR BAGIAN YANG DIKEMBALIKAN ===

});