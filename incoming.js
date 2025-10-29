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
    const draftListEl = document.getElementById('incoming-draft-list')?.getElementsByTagName('tbody')[0];
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

    // === Variabel List Dinamis BARU ===
    const stepAssyListContainer = document.getElementById('prod-step-assy-list');
    const addStepAssyItemBtn = document.getElementById('add-step-assy-item-btn');
    const defaultStepAssyItems = ["S/B K41K CW", "SB KPYX LH"];
    const stepAssyTotalSpan = document.getElementById('prod-step-assy-total');

    const bukaCapListContainer = document.getElementById('prod-buka-cap-list');
    const addBukaCapItemBtn = document.getElementById('add-buka-cap-item-btn');
    const defaultBukaCapItems = ["M/C 2DP RH", "2DP LH"];
    const bukaCapTotalSpan = document.getElementById('prod-buka-cap-total');

    const assyCupListContainer = document.getElementById('prod-assy-cup-list');
    const addAssyCupItemBtn = document.getElementById('add-assy-cup-item-btn');
    const defaultAssyCupItems = ["M/C 200 LH", "K12V CBS"];
    const assyCupTotalSpan = document.getElementById('prod-assy-cup-total');
    
    /**
     * FUNGSI: Menambahkan baris item ke list dinamis
     * (Diadaptasi dari wuster.js)
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

    // Event listener untuk tombol "Tambah Item"
    if (addStepAssyItemBtn) addStepAssyItemBtn.addEventListener('click', () => addDynamicRow(stepAssyListContainer, 'step-assy-item-name', 'step-assy-item-value'));
    if (addBukaCapItemBtn) addBukaCapItemBtn.addEventListener('click', () => addDynamicRow(bukaCapListContainer, 'buka-cap-item-name', 'buka-cap-item-value'));
    if (addAssyCupItemBtn) addAssyCupItemBtn.addEventListener('click', () => addDynamicRow(assyCupListContainer, 'assy-cup-item-name', 'assy-cup-item-value'));

    // Event listener untuk tombol "Hapus" (Delegasi)
    incomingForm.addEventListener('click', (e) => {
        if (e.target.closest('.button-remove')) {
            const row = e.target.closest('.dynamic-list-row');
            if (!row) return;
            row.remove(); // Hapus baris
            calculateAllDynamicTotals(); // Hitung ulang total
        }
    });

    // Event listener untuk perubahan input di list dinamis
    incomingForm.addEventListener('input', (e) => {
        const targetClass = e.target.classList;
        if (targetClass.contains('step-assy-item-value') ||
            targetClass.contains('buka-cap-item-value') ||
            targetClass.contains('assy-cup-item-value')) {
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
     * FUNGSI HELPER BARU: Menjalankan semua kalkulasi total
     */
    function calculateAllDynamicTotals() {
        calculateDynamicListTotal(stepAssyListContainer, 'step-assy-item-value', stepAssyTotalSpan);
        calculateDynamicListTotal(bukaCapListContainer, 'buka-cap-item-value', bukaCapTotalSpan);
        calculateDynamicListTotal(assyCupListContainer, 'assy-cup-item-value', assyCupTotalSpan);
    }

    
    /**
     * FUNGSI PDF (Disalin dari incoming.js lama, tidak diubah)
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
            
            const doc = new jsPDF({ format: 'legal' });

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

            // Tabel 2: Produksi Line Incoming
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
                startY: doc.autoTable.previous.finalY + 7, head: [['3 & 4. PRODUKSI & CHECK THICKNESS', 'Catatan']],
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

            doc.save(`Laporan_Incoming_${report.tanggal}_Shift${report.shift}.pdf`);
        } catch (error) {
            alert(`Gagal membuat PDF: ${error.message}`);
            console.error('PDF Generation Error:', error);
        }
    }


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
        if (!historyListEl) return;
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
        const { data: report, error } = await _supabase
            .from('laporan_incoming')
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
        
        document.getElementById('absensi_incoming_masuk').value = report.absensi_incoming_masuk;
        document.getElementById('absensi_incoming_tdk_masuk').value = report.absensi_incoming_tdk_masuk;
        document.getElementById('absensi_step_assy_masuk').value = report.absensi_step_assy_masuk;
        document.getElementById('absensi_step_assy_tdk_masuk').value = report.absensi_step_assy_tdk_masuk;
        document.getElementById('absensi_buka_cap_masuk').value = report.absensi_buka_cap_masuk;
        document.getElementById('absensi_buka_cap_tdk_masuk').value = report.absensi_buka_cap_tdk_masuk;
        
        document.getElementById('prod_wuster').value = report.prod_wuster;
        document.getElementById('prod_chrom').value = report.prod_chrom;
        
        document.getElementById('quality_item').value = report.quality_item;
        document.getElementById('quality_cek').value = report.quality_cek;
        document.getElementById('quality_ng').value = report.quality_ng;
        document.getElementById('quality_balik_material').value = report.quality_balik_material;
        
        document.getElementById('check_thickness_notes').value = report.check_thickness_notes;

        // Isi dynamic lists
        deserializeDynamicList(stepAssyListContainer, 'step-assy-item-name', 'step-assy-item-value', report.prod_step_assy_notes, defaultStepAssyItems);
        deserializeDynamicList(bukaCapListContainer, 'buka-cap-item-name', 'buka-cap-item-value', report.prod_buka_cap_notes, defaultBukaCapItems);
        deserializeDynamicList(assyCupListContainer, 'assy-cup-item-name', 'assy-cup-item-value', report.prod_assy_cup_notes, defaultAssyCupItems);

        // Hitung ulang semua total
        calculateAllDynamicTotals();
        
        // Atur state form
        currentlyEditingId = reportId;
        formTitleEl.textContent = `Mengedit Laporan (Tanggal: ${report.tanggal}, Shift: ${report.shift})`;
        mainSubmitBtn.textContent = 'Update Laporan Final';
        saveDraftBtn.textContent = 'Update Draft';
        cancelEditBtn.style.display = 'inline-block';
        
        formMessageEl.textContent = 'Data berhasil dimuat. Silakan edit.';
        incomingForm.scrollIntoView({ behavior: 'smooth' });
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
        return {
            user_id: currentUser.id,
            hari: document.getElementById('hari').value,
            tanggal: document.getElementById('tanggal').value,
            shift: parseInt(document.getElementById('shift').value), 
            chief_name: document.getElementById('chief_name').value,
            
            absensi_incoming_masuk: parseInt(document.getElementById('absensi_incoming_masuk').value),
            absensi_incoming_tdk_masuk: document.getElementById('absensi_incoming_tdk_masuk').value,
            absensi_step_assy_masuk: parseInt(document.getElementById('absensi_step_assy_masuk').value),
            absensi_step_assy_tdk_masuk: document.getElementById('absensi_step_assy_tdk_masuk').value,
            absensi_buka_cap_masuk: parseInt(document.getElementById('absensi_buka_cap_masuk').value),
            absensi_buka_cap_tdk_masuk: document.getElementById('absensi_buka_cap_tdk_masuk').value,
            
            prod_wuster: document.getElementById('prod_wuster').value,
            prod_chrom: document.getElementById('prod_chrom').value,
            
            quality_item: document.getElementById('quality_item').value,
            quality_cek: document.getElementById('quality_cek').value,
            quality_ng: document.getElementById('quality_ng').value,
            quality_balik_material: document.getElementById('quality_balik_material').value,
            
            // Serialisasi list dinamis
            prod_step_assy_notes: serializeDynamicList(stepAssyListContainer, 'step-assy-item-name', 'step-assy-item-value'),
            prod_buka_cap_notes: serializeDynamicList(bukaCapListContainer, 'buka-cap-item-name', 'buka-cap-item-value'),
            prod_assy_cup_notes: serializeDynamicList(assyCupListContainer, 'assy-cup-item-name', 'assy-cup-item-value'),

            check_thickness_notes: document.getElementById('check_thickness_notes').value
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
            // MODE UPDATE
            const { error: updateError } = await _supabase
                .from('laporan_incoming')
                .update(laporanData)
                .eq('id', currentlyEditingId);
            error = updateError;
        } else {
            // MODE INSERT
            const { error: insertError } = await _supabase
                .from('laporan_incoming')
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
            await loadIncomingDrafts(); 
            currentPage = 1; 
            await loadIncomingHistory(); 
            
            setTimeout(() => { formMessageEl.textContent = ''; }, 3000);
        }
    }

    // Event listener "Simpan Laporan Final" (submit utama)
    incomingForm.onsubmit = async (event) => {
        event.preventDefault();
        await handleFormSubmit(false); // false = bukan draft
    };

    // Event listener "Simpan Draft"
    saveDraftBtn.addEventListener('click', async () => {
        await handleFormSubmit(true); // true = draft
    });


    // Event listener pagination
    prevButton.addEventListener('click', () => { if (currentPage > 1) { currentPage--; loadIncomingHistory(); } });
    nextButton.addEventListener('click', () => { const totalPages = Math.ceil(totalReports / itemsPerPage); if (currentPage < totalPages) { currentPage++; loadIncomingHistory(); } });

    /**
     * Fungsi Inisialisasi Halaman
     */
    (async () => {
        let session;
        try {
            session = await getActiveUserSession();
            if (!session) {
                alert('Anda harus login terlebih dahulu!');
                window.location.href = 'index.html'; // Arahkan ke index/login
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
            await loadIncomingDrafts();
            await loadIncomingHistory(); 
        } catch (error) {
            console.error("Gagal memuat data:", error);
            if (historyListEl) historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Gagal memuat riwayat.</td></tr>`;
            if (draftListEl) draftListEl.innerHTML = `<tr><td colspan="4" style="color: red;">Gagal memuat draft.</td></tr>`;
        }
    })();
});