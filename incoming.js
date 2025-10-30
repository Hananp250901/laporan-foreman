// =================================================================
// C. LOGIKA HALAMAN INCOMING (incoming.html)
// =================================================================

// Pastikan semua HTML sudah siap sebelum menjalankan kode
document.addEventListener('DOMContentLoaded', () => {

    const incomingForm = document.getElementById('incoming-form');
    // Jika tidak ada form, hentikan script
    if (!incomingForm) return; 

    let currentUser = null;
    let currentKaryawan = null;
    let currentlyEditingId = null; // State untuk Edit/Draft

    const historyListEl = document.getElementById('incoming-history-list')?.getElementsByTagName('tbody')[0];
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
     * FUNGSI: Menambahkan baris item ke list dinamis
     */
    function addDynamicRow(container, nameClass, valueClass, itemName = "", itemValue = "") {
        if (!container) return;
        const row = document.createElement('div');
        row.className = 'dynamic-list-row';

        // Semua list di halaman ini adalah Angka
        const inputType = "number";
        const inputPlaceholder = "Jumlah";
        const inputValue = itemValue || 0; 

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
            const { data: report, error } = await _supabase
                .from('laporan_incoming').select('*').eq('id', reportId).single();
            if (error) throw new Error(`Gagal mengambil data laporan: ${error.message}`);

            const doc = new jsPDF({ format: 'legal' }); // Ukuran kertas Legal

            // Judul
            doc.setFontSize(16); doc.text("LAPORAN INTERNAL PAINTING", 105, 15, { align: 'center' });
            doc.setFontSize(12); doc.text("LINE INCOMING", 105, 22, { align: 'center' });

            // Info Header
            doc.setFontSize(10);
            doc.text("HARI", 20, 35); doc.text(`: ${report.hari}`, 50, 35);
            doc.text("TANGGAL", 20, 40); doc.text(`: ${report.tanggal}`, 50, 40);
            doc.text("SHIFT", 20, 45); doc.text(`: ${report.shift}`, 50, 45);
            
            const tableStyles = { theme: 'grid', styles: { cellWidth: 'wrap', fontSize: 9 }, headStyles: { fillColor: [22, 160, 133], textColor: [255, 255, 255], fontSize: 10 } };

            // Tabel 1: Absensi
            doc.autoTable({
                startY: 50, head: [['1. ABSENSI', 'Masuk (org)', 'Tidak Masuk (Nama)']],
                body: [
                    ['A. Line Incoming', report.absensi_incoming_masuk, report.absensi_incoming_tdk_masuk || ''],
                    ['B. Line Step Assy', report.absensi_step_assy_masuk, report.absensi_step_assy_tdk_masuk || ''],
                    ['C. Line Buka Cap', report.absensi_buka_cap_masuk, report.absensi_buka_cap_tdk_masuk || ''],
                ], ...tableStyles
            });

            // --- Tabel 2: Produksi Line Incoming ---
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 7, head: [['2. PRODUKSI LINE INCOMING', 'Jumlah/Catatan']], 
                body: [
                    ['In Wuster', report.prod_wuster || ''], ['In Chrom', report.prod_chrom || ''],
                    ['Quality Item', report.quality_item || ''], ['Quality Cek', report.quality_cek || ''],
                    ['Quality NG (Ket.)', report.quality_ng || ''], ['Balik Material', report.quality_balik_material || ''],
                ], ...tableStyles
            });

            // Tabel 3 & 4 Gabungan
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 7,
                head: [['3 & 4. PRODUKSI & CHECK THICKNESS', 'Catatan']],
                body: [
                    ['Prod. Line Step Assy', report.prod_step_assy_notes || ''],
                    ['Prod. Line Buka Cap', report.prod_buka_cap_notes || ''],
                    ['Prod. Assy Cup', report.prod_assy_cup_notes || ''],
                    ['Check Thickness', report.check_thickness_notes || '']
                ], ...tableStyles, columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 130 } }
            });
            
            // Footer
            let finalY = doc.autoTable.previous.finalY + 20; 
            if (finalY > 300) { doc.addPage(); finalY = 20; } 

            const preparerName = currentKaryawan ? currentKaryawan.nama_lengkap : (currentUser ? currentUser.email : 'N/A');
            doc.setFontSize(10);
            doc.text("Dibuat,", 20, finalY); doc.text(preparerName, 20, finalY + 20); doc.text("Foreman", 20, finalY + 25);
            doc.text("Disetujui,", 105, finalY, { align: 'center' }); const chiefName = report.chief_name || '( .......................... )'; doc.text(chiefName, 105, finalY + 20, { align: 'center' }); doc.text("Chief", 105, finalY + 25, { align: 'center' });
            doc.text("Mengetahui,", 190, finalY, { align: 'right' }); doc.text("SINGGIH E W", 190, finalY + 20, { align: 'right' }); doc.text("Dept Head", 190, finalY + 25, { align: 'right' });

            // --- Simpan PDF ---
            // Gunakan fallback jika tanggal atau shift kosong
            doc.save(`Laporan_Incoming_${report.tanggal || 'TanpaTanggal'}_Shift${report.shift || 'TanpaShift'}.pdf`);

        } catch (error) {
            alert(`Gagal membuat PDF: ${error.message}`);
            console.error('PDF Generation Error:', error);
        }
    }
    // --- Akhir Fungsi PDF ---


    // --- Fungsi CRUD (Create, Read, Update, Delete) ---
    /**
     * FUNGSI BARU: Memuat draft laporan
     */
    async function loadIncomingDrafts() {
        if (!draftListEl) return;
        draftListEl.innerHTML = '<tr><td colspan="4">Memuat draft...</td></tr>';
        
        const { data, error } = await _supabase
            .from('laporan_incoming') // Ganti ke tabel incoming
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
                        const { error } = await _supabase.from('laporan_incoming').delete().eq('id', idToDelete);
                        if (error) {
                            alert('Gagal menghapus draft: ' + error.message);
                        } else {
                            await loadIncomingDrafts(); 
                        }
                    }
                });
            });
        }
    }

    /**
     * Fungsi: Memuat riwayat laporan (UPGRADED dengan Paginasi & Edit)
     */
    async function loadIncomingHistory() {
        if (!historyListEl || !currentUser) return;
        historyListEl.innerHTML = '<tr><td colspan="5">Memuat riwayat...</td></tr>';
        
        const { count, error: countError } = await _supabase
            .from('laporan_incoming')
            .select('*', { count: 'exact', head: true })
            .or('status.eq.published,status.is.null');
            
        if (countError) {
            historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${countError.message}</td></tr>`; return;
        }
        
        totalReports = count;
        const totalPages = Math.ceil(totalReports / itemsPerPage) || 1;
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error } = await _supabase.from('laporan_incoming')
            .select('id, tanggal, shift, hari, created_at') // Ambil 'hari'
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
                // Sesuaikan kolom tabel
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
     * FUNGSI BARU: Memuat data laporan ke form untuk diedit
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
     * FUNGSI BARU: Mengosongkan form dan mereset state
     */
    function resetFormAndState() {
        incomingForm.reset(); 
        currentlyEditingId = null; 

        // Reset semua list dinamis ke default
        resetDynamicList(stepAssyListContainer, defaultStepAssyItems, 'step-assy-item-name', 'step-assy-item-value');
        resetDynamicList(bukaCapListContainer, defaultBukaCapItems, 'buka-cap-item-name', 'buka-cap-item-value');
        resetDynamicList(assyCupListContainer, defaultAssyCupItems, 'assy-cup-item-name', 'assy-cup-item-value');
        
        // Hitung ulang semua total (jadi 0)
        calculateAllDynamicTotals();
        
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
            resetFormAndState(); // Reset form
            
            // Muat ulang kedua tabel
            await loadIncomingDrafts(); 
            currentPage = 1; 
            await loadIncomingHistory(); 
            
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
    nextButton.addEventListener('click', () => { const totalPages = Math.ceil(totalReports / itemsPerPage); if (currentPage < totalPages) { currentPage++; loadIncomingHistory(); } });

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
            console.error("Gagal memuat data:", error);
            if (historyListEl) historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Gagal memuat riwayat.</td></tr>`;
            if (draftListEl) draftListEl.innerHTML = `<tr><td colspan="4" style="color: red;">Gagal memuat draft.</td></tr>`;
        }
    })();
});