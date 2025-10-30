// =================================================================
// C. LOGIKA HALAMAN INCOMING (incoming.html)
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    const incomingForm = document.getElementById('incoming-form');
    // Jika tidak ada form incoming di halaman ini, hentikan script
    if (!incomingForm) {
        // console.log("Incoming form not found on this page."); // Debugging (opsional)
        return;
    }

    // --- Deklarasi Variabel ---
    let currentUser = null;         // Info user yg login
    let currentKaryawan = null;     // Info karyawan (nama, NIK)
    let currentlyEditingId = null;  // ID laporan yg sedang diedit

    // Elemen UI
    const historyListEl = document.getElementById('incoming-history-list')?.getElementsByTagName('tbody')[0];
    const draftListEl = document.getElementById('incoming-draft-list')?.getElementsByTagName('tbody')[0];
    const formMessageEl = document.getElementById('form-message');
    const formTitleEl = document.getElementById('form-title');
    const mainSubmitBtn = document.getElementById('main-submit-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // Pagination
    const itemsPerPage = 10;
    let currentPage = 1;
    let totalReports = 0;
    const prevButton = document.getElementById('prev-page-btn');
    const nextButton = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');

    // Konfigurasi List Dinamis untuk halaman Incoming
    const listConfigsIncoming = [
        { id: 'prod-step-assy', nameClass: 'step-assy-item-name', valueClass: 'step-assy-item-value', defaults: ["S/B K41K CW", "SB KPYX LH"], container: null, button: null, totalSpan: null, notesKey: 'prod_step_assy_notes' },
        { id: 'prod-buka-cap', nameClass: 'buka-cap-item-name', valueClass: 'buka-cap-item-value', defaults: ["M/C 2DP RH", "2DP LH"], container: null, button: null, totalSpan: null, notesKey: 'prod_buka_cap_notes' },
        { id: 'prod-assy-cup', nameClass: 'assy-cup-item-name', valueClass: 'assy-cup-item-value', defaults: ["M/C 200 LH", "K12V CBS"], container: null, button: null, totalSpan: null, notesKey: 'prod_assy_cup_notes' }
    ];
    // Ambil elemen HTML berdasarkan konfigurasi
    listConfigsIncoming.forEach(config => {
        config.container = document.getElementById(`${config.id}-list`);
        // ID tombol di HTML tidak pakai prefix 'prod-'
        config.button = document.getElementById(`add-${config.id.replace('prod-', '')}-item-btn`);
        config.totalSpan = document.getElementById(`${config.id}-total`);
        // Peringatan jika elemen tidak ditemukan (membantu debugging)
        if (!config.container) console.warn(`Incoming: Element with ID ${config.id}-list not found.`);
        if (!config.button) console.warn(`Incoming: Button add-${config.id.replace('prod-', '')}-item-btn not found.`);
        if (!config.totalSpan) console.warn(`Incoming: Total span for ${config.id} list not found.`);
    });
    // --- Akhir Deklarasi Variabel ---


    // --- Fungsi Helper List Dinamis ---
    /**
     * Menambahkan baris input baru (Nama Item + Jumlah Angka) ke container list.
     */
    function addDynamicRow(container, nameClass, valueClass, itemName = "", itemValue = "") {
        if (!container) return; // Jangan lakukan apa-apa jika container tidak ada
        const row = document.createElement('div');
        row.className = 'dynamic-list-row';
        const inputType = "number"; // Semua list di halaman ini angka
        const inputPlaceholder = "Jumlah";
        const inputValue = itemValue || 0; // Default ke 0 jika kosong

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
     * Mengosongkan container list dan mengisinya kembali dengan item default.
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
            const parts = item.split(': '); // Pisahkan nama dan jumlah
            const name = parts[0]?.trim() || ''; // Ambil nama (bagian pertama), hilangkan spasi
            const value = parts.slice(1).join(': ')?.trim() || ''; // Ambil sisa bagian (jumlah), gabungkan jika ada ':' lagi, hilangkan spasi
            if (name || value) { // Hanya tambahkan jika ada nama atau jumlah
                addDynamicRow(config.container, config.nameClass, config.valueClass, name, value);
            }
        });
    }

    /**
     * Mengubah isi list dinamis menjadi satu string (format "Nama: Jumlah\n") untuk disimpan ke database.
     */
    function serializeDynamicList(config) {
        if (!config.container) return ""; // Kembalikan string kosong jika container tidak ada
        let resultString = "";
        const rows = config.container.querySelectorAll('.dynamic-list-row'); // Ambil semua baris
        rows.forEach(row => {
            const nameInput = row.querySelector(`.${config.nameClass}`);
            const valueInput = row.querySelector(`.${config.valueClass}`);
            if (nameInput && valueInput) {
                const name = nameInput.value.trim(); // Ambil nama, hapus spasi awal/akhir
                const value = valueInput.value.trim(); // Ambil jumlah, hapus spasi
                if (name || value) { // Hanya simpan jika ada nama atau jumlah
                    resultString += `${name}: ${value}\n`; // Tambahkan ke string hasil
                }
            }
        });
        return resultString.trim(); // Kembalikan string hasil, hapus spasi/newline di akhir
    }
    // --- Akhir Fungsi Helper List Dinamis ---


    // --- Fungsi Kalkulasi Total ---
    /**
     * Menghitung total jumlah dari semua input angka dalam satu list dinamis.
     */
    function calculateDynamicListTotal(config) {
        if (!config.container || !config.totalSpan) return; // Butuh container dan span total
        let sum = 0;
        const inputs = config.container.querySelectorAll(`.${config.valueClass}`); // Ambil semua input jumlah
        inputs.forEach(input => {
            sum += parseInt(input.value) || 0; // Tambahkan nilainya ke sum (anggap 0 jika bukan angka)
        });
        config.totalSpan.textContent = sum; // Tampilkan hasilnya di span total
    }

    /**
     * Menjalankan kalkulasi total untuk SEMUA list dinamis di halaman ini.
     */
    function calculateAllDynamicTotals() {
        listConfigsIncoming.forEach(calculateDynamicListTotal); // Panggil fungsi hitung untuk setiap list
    }
    // --- Akhir Fungsi Kalkulasi Total ---


    // --- Event Listener Dinamis (Tambah, Hapus, Input) ---
    // Tambahkan event listener ke setiap tombol "Tambah Item"
    listConfigsIncoming.forEach(config => {
         if (config.button) {
            config.button.addEventListener('click', () => addDynamicRow(config.container, config.nameClass, config.valueClass));
         } else {
             console.warn(`Incoming: Button element not found for list ${config.id}, cannot add listener.`);
         }
    });

    // Gunakan event delegation di form untuk tombol "Hapus" dan perubahan "Input Jumlah"
    incomingForm.addEventListener('click', (e) => {
        // Jika tombol Hapus (- lingkaran merah) atau ikon di dalamnya yg diklik
        if (e.target.closest('.button-remove')) {
            const row = e.target.closest('.dynamic-list-row'); // Cari baris terdekat
            if (row) {
                row.remove(); // Hapus baris dari tampilan
                calculateAllDynamicTotals(); // Hitung ulang totalnya
            }
        }
    });
    incomingForm.addEventListener('input', (e) => {
        // Cek apakah yang berubah adalah input jumlah di salah satu list dinamis
        const isDynamicInput = listConfigsIncoming.some(config => e.target.classList.contains(config.valueClass));
        if (isDynamicInput) {
            calculateAllDynamicTotals(); // Jika ya, hitung ulang semua total
        }
    });
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
     * Fungsi utama untuk generate PDF laporan Incoming.
     */
    async function generatePDF(reportId) {
        alert('Membuat PDF... Mohon tunggu.');
        // Cek ketersediaan library PDF
        if (!window.jspdf) { alert('Gagal memuat library PDF (jspdf). Pastikan Anda online.'); return; }
        const { jsPDF } = window.jspdf;
         if (!window.jspdf.autoTable) { alert('Gagal memuat plugin PDF (jspdf-autotable). Pastikan Anda online.'); return;}

        try {
            // Ambil data lengkap laporan dari Supabase berdasarkan ID
            const { data: report, error } = await _supabase.from('laporan_incoming').select('*').eq('id', reportId).single();
            if (error) throw new Error(`Gagal mengambil data laporan: ${error.message}`);

            const doc = new jsPDF({ format: 'legal' }); // Ukuran kertas Legal

            // --- Header PDF ---
            doc.setFontSize(16); doc.text("LAPORAN INTERNAL PAINTING - LINE INCOMING", doc.internal.pageSize.width / 2, 15, { align: 'center' });
            doc.setFontSize(10);
            doc.text("HARI", 20, 30); doc.text(`: ${report.hari || 'N/A'}`, 50, 30);
            doc.text("TANGGAL", 20, 35); doc.text(`: ${report.tanggal || 'N/A'}`, 50, 35);
            doc.text("SHIFT", 20, 40); doc.text(`: ${report.shift || 'N/A'}`, 50, 40);

            // Style umum untuk tabel
            const tableStyles = { theme: 'grid', styles: { cellWidth: 'wrap', fontSize: 9 }, headStyles: { fillColor: [22, 160, 133], textColor: [255, 255, 255], fontSize: 10 } };

            // --- Tabel 1: Absensi ---
            doc.autoTable({
                startY: 45, // Mulai tabel sedikit di bawah header
                head: [['1. ABSENSI', 'Masuk (org)', 'Tidak Masuk (Nama)']],
                body: [
                    ['A. Line Incoming', report.absensi_incoming_masuk || 0, report.absensi_incoming_tdk_masuk || ''],
                    ['B. Line Step Assy', report.absensi_step_assy_masuk || 0, report.absensi_step_assy_tdk_masuk || ''],
                    ['C. Line Buka Cap', report.absensi_buka_cap_masuk || 0, report.absensi_buka_cap_tdk_masuk || ''],
                ],
                ...tableStyles // Gunakan style umum
            });

            // --- Tabel 2: Produksi Line Incoming ---
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 7, // Mulai 7pt di bawah tabel sebelumnya
                head: [['2. PRODUKSI LINE INCOMING', 'Jumlah/Catatan']],
                body: [
                    ['In Wuster', report.prod_wuster || ''],
                    ['In Chrom', report.prod_chrom || ''],
                    ['Quality Item', report.quality_item || ''],
                    ['Quality Cek', report.quality_cek || ''],
                    ['Quality NG (Ket.)', report.quality_ng || ''],
                    ['Balik Material', report.quality_balik_material || ''],
                ],
                ...tableStyles // Gunakan style umum
            });

            // --- Tabel 3 & 4 Gabungan (Produksi List Dinamis & Check Thickness) ---
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 7,
                head: [['3 & 4. PRODUKSI & CHECK THICKNESS', 'Catatan']],
                body: [
                    // Gunakan helper addTotalToNotes untuk list dinamis
                    ['Prod. Line Step Assy', addTotalToNotes(report.prod_step_assy_notes)],
                    ['Prod. Line Buka Cap', addTotalToNotes(report.prod_buka_cap_notes)],
                    ['Prod. Assy Cup', addTotalToNotes(report.prod_assy_cup_notes)],
                    // Kolom Check Thickness biasa
                    ['Check Thickness', report.check_thickness_notes || '']
                ],
                 ...tableStyles, // Gunakan style umum
                 columnStyles: { // Atur lebar kolom
                    0: { cellWidth: 60, fontStyle: 'bold' }, // Kolom pertama (Label)
                    1: { cellWidth: 130 }                  // Kolom kedua (Catatan)
                 },
                 // Style tambahan: Buat teks "TOTAL: xxx" jadi bold
                 didParseCell: (data) => {
                     // Jika isi cell mengandung "TOTAL:"
                     if (data.cell.raw?.toString().includes('TOTAL:')) {
                         data.cell.styles.fontStyle = 'bold'; // Jadikan bold
                     }
                 }
            });

            // --- Footer PDF (Tanda Tangan) ---
            let finalY = doc.autoTable.previous.finalY + 15; // Jarak dari tabel terakhir
            const pageHeight = doc.internal.pageSize.height;
             const bottomMargin = 15; // Jarak aman dari bawah kertas
             // Cek jika footer akan melewati batas bawah, jika ya, tambah halaman baru
             if (finalY + 40 > pageHeight - bottomMargin) { // Perkirakan tinggi footer ~40pt
                 doc.addPage();
                 finalY = 20; // Mulai dari atas di halaman baru
             }

            // Ambil nama pembuat (jika data karyawan ada) atau email
            const preparerName = currentKaryawan?.nama_lengkap || currentUser?.email || 'N/A';
            doc.setFontSize(10);
            const col1X = 20;
            const col2X = doc.internal.pageSize.width / 2;
            const col3X = doc.internal.pageSize.width - 20;

            // Kolom 1: Dibuat
            doc.text("Dibuat,", col1X, finalY);
            doc.text(preparerName, col1X, finalY + 20);
            doc.text("Foreman", col1X, finalY + 25);

            // Kolom 2: Disetujui
            const chiefName = report.chief_name || '( .......................... )'; // Default jika kosong
            doc.text("Disetujui,", col2X, finalY, { align: 'center' });
            doc.text(chiefName, col2X, finalY + 20, { align: 'center' });
            doc.text("Chief", col2X, finalY + 25, { align: 'center' });

            // Kolom 3: Mengetahui
            doc.text("Mengetahui,", col3X, finalY, { align: 'right' });
            doc.text("SINGGIH E W", col3X, finalY + 20, { align: 'right' });
            doc.text("Dept Head", col3X, finalY + 25, { align: 'right' });

            // --- Simpan PDF ---
            // Gunakan fallback jika tanggal atau shift kosong
            doc.save(`Laporan_Incoming_${report.tanggal || 'TanpaTanggal'}_Shift${report.shift || 'TanpaShift'}.pdf`);

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
    async function loadIncomingDrafts() {
        if (!draftListEl || !currentUser) return; // Pastikan elemen tabel dan user ada
        draftListEl.innerHTML = '<tr><td colspan="4">Memuat draft...</td></tr>'; // Pesan loading
        try {
            const { data, error } = await _supabase.from('laporan_incoming')
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
                    if (confirm('Hapus draft ini secara permanen?')) { // Konfirmasi user
                        const { error: deleteError } = await _supabase.from('laporan_incoming').delete().eq('id', idToDelete);
                        if (deleteError) { alert('Gagal menghapus draft: ' + deleteError.message); }
                        else { await loadIncomingDrafts(); } // Muat ulang daftar draft jika berhasil
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
    async function loadIncomingHistory() {
        if (!historyListEl || !currentUser) return;
        historyListEl.innerHTML = '<tr><td colspan="5">Memuat riwayat...</td></tr>';
        try {
            // 1. Hitung total laporan dulu untuk pagination
            const { count, error: countError } = await _supabase.from('laporan_incoming')
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
            const { data, error } = await _supabase.from('laporan_incoming')
                .select('id, tanggal, shift, hari, created_at') // Ambil kolom yg perlu ditampilkan
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
                        <td>${laporan.hari || 'N/A'}</td>
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
            const { data: report, error } = await _supabase.from('laporan_incoming').select('*').eq('id', reportId).single();
            if (error) throw error;

            // Isi semua field standar (cocokkan ID elemen dengan nama kolom DB)
             ['hari', 'tanggal', 'shift', 'chief_name', 'absensi_incoming_masuk', 'absensi_incoming_tdk_masuk',
              'absensi_step_assy_masuk', 'absensi_step_assy_tdk_masuk', 'absensi_buka_cap_masuk', 'absensi_buka_cap_tdk_masuk',
              'prod_wuster', 'prod_chrom', 'quality_item', 'quality_cek', 'quality_ng', 'quality_balik_material',
              'check_thickness_notes']
              .forEach(id => {
                  const element = document.getElementById(id);
                  if (element) {
                     element.value = report[id] ?? ''; // Isi value atau string kosong jika null/undefined
                  } else {
                     console.warn(`Incoming: Element with ID ${id} not found when loading report`);
                  }
              });

            // Isi list dinamis menggunakan deserialize
            listConfigsIncoming.forEach(config => {
                 deserializeDynamicList(config, report[config.notesKey]);
            });

            calculateAllDynamicTotals(); // Hitung ulang total list dinamis

            // Atur state aplikasi ke mode edit
            currentlyEditingId = reportId; // Simpan ID yg diedit
            formTitleEl.textContent = `Mengedit Laporan (Tanggal: ${report.tanggal || 'N/A'}, Shift: ${report.shift || 'N/A'})`; // Update judul form
            mainSubmitBtn.textContent = 'Update Laporan Final'; // Ubah teks tombol submit
            saveDraftBtn.textContent = 'Update Draft';          // Ubah teks tombol draft
            cancelEditBtn.style.display = 'inline-block';      // Tampilkan tombol Batal
            formMessageEl.textContent = 'Data berhasil dimuat.';

            // Scroll ke form agar terlihat
            incomingForm.scrollIntoView({ behavior: 'smooth' });

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
        incomingForm.reset(); // Mengosongkan input, select, textarea
        currentlyEditingId = null; // Hapus ID yg sedang diedit
        listConfigsIncoming.forEach(resetDynamicList); // Kembalikan list dinamis ke item default
        calculateAllDynamicTotals(); // Hitung ulang total (akan jadi 0)

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

        // Ambil nilai dari field input standar
         ['hari', 'tanggal', 'shift', 'chief_name', 'absensi_incoming_masuk', 'absensi_incoming_tdk_masuk',
          'absensi_step_assy_masuk', 'absensi_step_assy_tdk_masuk', 'absensi_buka_cap_masuk', 'absensi_buka_cap_tdk_masuk',
          'prod_wuster', 'prod_chrom', 'quality_item', 'quality_cek', 'quality_ng', 'quality_balik_material',
          'check_thickness_notes']
          .forEach(id => {
              const element = document.getElementById(id);
              if (element) {
                  // Cek apakah field ini harusnya angka
                  const isNumber = element.type === 'number' || id.includes('_masuk') || id === 'shift';
                  // Ambil nilainya, konversi ke integer jika perlu (anggap 0 jika gagal konversi)
                  formData[id] = isNumber ? (parseInt(element.value) || 0) : element.value;
              } else {
                   console.warn(`Incoming: Element with ID ${id} not found in getFormData`);
              }
          });

        // Ambil nilai dari list dinamis (sudah diserialisasi jadi string)
        listConfigsIncoming.forEach(config => {
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
        formMessageEl.textContent = 'Menyimpan...'; // Pesan loading

        try {
            const laporanData = getFormData(); // Ambil semua data dari form
            laporanData.status = isDraft ? 'draft' : 'published'; // Set status ('draft' atau 'published')

            let result;
            if (currentlyEditingId) { // Jika sedang dalam mode UPDATE
                console.log(`Incoming: Updating report ID: ${currentlyEditingId} with status: ${laporanData.status}`); // Debugging
                result = await _supabase.from('laporan_incoming').update(laporanData).eq('id', currentlyEditingId);
            } else { // Jika sedang dalam mode INSERT (buat baru)
                console.log(`Incoming: Inserting new report with status: ${laporanData.status}`); // Debugging
                result = await _supabase.from('laporan_incoming').insert(laporanData);
            }

            // Cek hasil operasi database
            if (result.error) {
                throw result.error; // Lemparkan error jika gagal
            }

            // Jika berhasil
            formMessageEl.textContent = `Laporan berhasil disimpan sebagai ${isDraft ? 'Draft' : 'Final'}!`;
            resetFormAndState(); // Kosongkan form dan reset state

            // Muat ulang daftar draft dan riwayat (agar data terbaru muncul)
            await loadIncomingDrafts();
            currentPage = 1; // Kembali ke halaman pertama riwayat
            await loadIncomingHistory();

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
    incomingForm.onsubmit = (e) => {
        e.preventDefault(); // Mencegah submit HTML biasa
        handleFormSubmit(false); // Panggil fungsi submit dengan status 'published'
    };
    saveDraftBtn.addEventListener('click', () => {
        handleFormSubmit(true); // Panggil fungsi submit dengan status 'draft'
    });

    // --- Event listener pagination ---
    prevButton.addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadIncomingHistory(); } });
    nextButton.addEventListener('click', () => { if (!nextButton.disabled) { currentPage++; loadIncomingHistory(); } });


    // === INILAH BAGIAN YANG DIKEMBALIKAN KE VERSI SIMPEL ===
    /**
     * Fungsi Inisialisasi Halaman (Jalan sekali setelah DOM siap)
     */
    (async () => {
        console.log("Incoming: Initializing page...");
        // Langsung cek session saat halaman dimuat
        const session = await getActiveUserSession(); // Fungsi ini ada di app.js

        // Jika TIDAK ADA session, tampilkan alert dan redirect
        // Pengecekan ini sudah ada di app.js, tapi kita tambahkan lagi di sini
        // sebagai fallback jika user langsung membuka halaman ini.
        if (!session) {
            console.warn("Incoming: No active session found during init, redirecting to index.html...");
            alert('Anda harus login terlebih dahulu!'); // Tampilkan peringatan
            window.location.href = 'index.html'; // Redirect ke halaman login (index.html)
            return; // Hentikan eksekusi script
        }

        // Jika lolos cek session, lanjutkan
        console.log("Incoming: Session found, proceeding.");
        currentUser = session.user; // Simpan info user yg login

        try {
            // Muat data karyawan (untuk footer PDF & info sidebar)
            // Fungsi ini dipanggil lagi di sini untuk memastikan currentKaryawan terisi
            currentKaryawan = await loadSharedDashboardData(currentUser); // Fungsi ini ada di app.js

            // Set form ke kondisi awal (kosong/default) dan hitung total awal
            resetFormAndState();

            // Muat data draft dan riwayat secara bersamaan
            await Promise.all([
                loadIncomingDrafts(),
                loadIncomingHistory()
            ]);

            console.log("Incoming: Initialization complete.");

        } catch (error) {
            // Tangani error jika gagal memuat data awal
            console.error("Incoming: Initialization error:", error);
            alert('Gagal memuat data awal untuk halaman Incoming. Cek koneksi internet dan coba refresh.');
            if (historyListEl) historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Gagal memuat riwayat.</td></tr>`;
            if (draftListEl) draftListEl.innerHTML = `<tr><td colspan="4" style="color: red;">Gagal memuat draft.</td></tr>`;
        }
    })();
    // === AKHIR BAGIAN YANG DIKEMBALIKAN ===

}); // Akhir dari DOMContentLoaded