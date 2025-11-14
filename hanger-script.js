document.addEventListener('DOMContentLoaded', function() {
    
    // =============================================
    // KONEKSI SUPABASE
    // =============================================
    const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4';
    
    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('Supabase client initialized.');
    // =============================================
    
    // --- Variabel Global ---
    let loggedInUserName = "[Nama Login]"; 
    let loggedInUserJabatan = "[Jabatan]";
    let currentUser = null; 
    let currentlyEditingId = null;

    // --- Definisi Slot Waktu (Target di-HAPUS) ---
    const timeSlots = {
        '7': {
            '1': ['08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00'],
            '2': ['16:00-17:00', '17:00-18:00', '18:00-19:00', '19:00-20:00', '20:00-21:00', '21:00-22:00', '22:00-23:00', '23:00-00:00'],
            '3': ['00:00-01:00', '01:00-02:00', '02:00-03:00', '03:00-04:00', '04:00-05:00', '05:00-06:00', '06:00-07:00', '07:00-08:00']
        },
        '5': {
            '1': ['08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00'],
            '2': ['13:00-14:00', '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00'],
            '3': ['18:00-19:00', '19:00-20:00', '20:00-21:00', '21:00-22:00', '22:00-23:00']
        }
    };
    
    // 'targetValues' object dihapus
    
    // --- Ambil elemen UI ---
    const productionReportForm = document.getElementById('production-report-form');
    const jamKerjaEl = document.getElementById('jam-kerja');
    const shiftEl = document.getElementById('shift');
    const chiefNameEl = document.getElementById('chief-name');
    const productionTable = document.getElementById('production-table').getElementsByTagName('tbody')[0];
    
    // Input Target BARU
    const targetPerJamEl = document.getElementById('target-per-jam');

    // Tombol Form
    const saveFinalButton = document.getElementById('btn-save-final');
    const saveDraftButton = document.getElementById('btn-save-draft');
    const cancelEditButton = document.getElementById('btn-cancel-edit');
    const formTitleEl = document.getElementById('form-title');
    const formMessageEl = document.getElementById('form-message');

    // Riwayat & Paginasi
    const itemsPerPage = 10;
    let currentPage = 1;
    let totalReports = 0;
    const historyTbody = document.getElementById('hanger-history-tbody');
    const prevButton = document.getElementById('prev-page-btn');
    const nextButton = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');

    // Draft
    const draftTbody = document.getElementById('hanger-draft-tbody');

    // =============================================
    // FUNGSI LOAD NAMA USER & PENGECEKAN LOGIN
    // =============================================
    async function loadAndSetUserData() {
        const { data: { session }, error: sessionError } = await _supabase.auth.getSession();
        
        if (sessionError) {
            console.error("Error mendapatkan sesi:", sessionError.message);
            alert('Terjadi error saat memeriksa sesi. Mengarahkan ke login.');
            window.location.href = 'index.html';
            return;
        }
        
        if (!session) {
            console.warn('Tidak ada sesi login, mengarahkan ke index.html');
            alert('Anda harus login terlebih dahulu!');
            window.location.href = 'index.html';
            return; 
        }

        currentUser = session.user; 

        try {
            // === AWAL MODIFIKASI ===
            const { data: karyawanData, error } = await _supabase
                .from('karyawan')
                .select('nama_lengkap, jabatan') // <-- 'jabatan' DITAMBAHKAN
                .eq('user_id', session.user.id)
                .single();
            
            const sigUserNameEl = document.getElementById('sig-user-name');
            if (karyawanData) {
                loggedInUserName = karyawanData.nama_lengkap;
                loggedInUserJabatan = karyawanData.jabatan || '( Jabatan )'; // <-- BARIS BARU
                if (sigUserNameEl) sigUserNameEl.textContent = loggedInUserName;
            } else {
                console.warn('Tidak dapat menemukan data karyawan. Menggunakan email.', error);
                loggedInUserName = session.user.email;
                loggedInUserJabatan = '( Jabatan )'; // <-- BARIS BARU (FALLBACK)
                if (sigUserNameEl) sigUserNameEl.textContent = loggedInUserName;
            }
            // === AKHIR MODIFIKASI ===
        } catch (error) {
            console.error("Error mengambil data karyawan:", error.message);
            loggedInUserName = session.user.email;
            loggedInUserJabatan = '( Jabatan )'; // <-- BARIS BARU (FALLBACK)
            const sigUserNameEl = document.getElementById('sig-user-name');
            if (sigUserNameEl) sigUserNameEl.textContent = loggedInUserName;
        }
    }
    // =============================================

    /**
     * Fungsi utama untuk menghitung seluruh tabel
     */
    function calculateTable() {
        const rows = productionTable.getElementsByTagName('tr');
        let prevAccGap = 0, prevAccFilled = 0, prevAccEmpty = 0, prevAccLoss = 0;
        
        let lastAccFilled = 0;
        let lastAccEmpty = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const filled = parseFloat(row.querySelector('[data-col="filled"]').value) || 0;
            const empty = parseFloat(row.querySelector('[data-col="empty"]').value) || 0;
            const loss = parseFloat(row.querySelector('[data-col="loss"]').value) || 0;
            
            const gap = filled + empty;
            const accGap = gap + prevAccGap;
            const accFilled = filled + prevAccFilled;
            const accEmpty = empty + prevAccEmpty;
            const accLoss = loss + prevAccLoss;
            
            row.querySelector('[data-col="gap"]').value = gap;
            row.querySelector('[data-col="acc-gap"]').value = accGap;
            row.querySelector('[data-col="acc-filled"]').value = accFilled;
            row.querySelector('[data-col="acc-empty"]').value = accEmpty;
            row.querySelector('[data-col="acc-loss"]').value = accLoss;
            
            prevAccGap = accGap;
            prevAccFilled = accFilled;
            prevAccEmpty = accEmpty;
            prevAccLoss = accLoss;
            
            // Simpan nilai ACC terakhir
            lastAccFilled = accFilled;
            lastAccEmpty = accEmpty;
        }
        
        // ================== MODIFIKASI JS DI SINI ==================
        // Update input summary Hanger Isi dan Kosong
        document.getElementById('hanger-isi').value = lastAccFilled;
        document.getElementById('hanger-kosong').value = lastAccEmpty;
        
        // Panggil calculateSummary untuk update Total Hanger dan Performance
        calculateSummary();
        // ================ AKHIR MODIFIKASI JS ================
    }

    /**
     * Membuat satu sel input di dalam baris
     */
    function createInputCell(row, colName, readOnly = false, type = 'number') {
        const cell = row.insertCell();
        const input = document.createElement('input');
        input.type = type;
        input.value = readOnly ? '0' : '';
        input.className = 'table-input';
        input.setAttribute('data-col', colName);
        if (readOnly) input.readOnly = true;
        cell.appendChild(input);
    }
    
    /**
     * FUNGSI BARU: Mengupdate kolom Start & End saat Target per Jam diubah
     */
    function updateStartEndColumns() {
        const hourlyTarget = parseFloat(targetPerJamEl.value) || 0;
        const rows = productionTable.getElementsByTagName('tr');

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const startInput = row.querySelector('[data-col="target-start"]');
            const endInput = row.querySelector('[data-col="target-end"]');
            
            if (startInput && endInput) {
                startInput.value = i * hourlyTarget;
                endInput.value = (i + 1) * hourlyTarget;
            }
        }
    }

    /**
     * Mengisi ulang seluruh tabel produksi (LOGIKA DIPERBARUI)
     */
    function populateProductionTable(slots) { // Argumen targets dihapus
        productionTable.innerHTML = '';
        const hourlyTarget = parseFloat(targetPerJamEl.value) || 0; // Ambil target dari input
        
        slots.forEach((slot, index) => {
            const row = productionTable.insertRow();
            row.id = `row-${index}`;
            
            // Hitung start/end dinamis
            const startValue = index * hourlyTarget;
            const endValue = (index + 1) * hourlyTarget;
            
            let cell = row.insertCell(); cell.textContent = index + 1; // NO
            cell = row.insertCell(); cell.textContent = slot; // Hourly
            
            // Buat sel Start (Input Readonly)
            const startCell = row.insertCell();
            const startInput = document.createElement('input');
            startInput.type = 'number';
            startInput.value = startValue;
            startInput.className = 'table-input';
            startInput.setAttribute('data-col', 'target-start');
            startInput.readOnly = true;
            startCell.appendChild(startInput);

            // Buat sel End (Input Readonly)
            const endCell = row.insertCell();
            const endInput = document.createElement('input');
            endInput.type = 'number';
            endInput.value = endValue;
            endInput.className = 'table-input';
            endInput.setAttribute('data-col', 'target-end');
            endInput.readOnly = true;
            endCell.appendChild(endInput);
            
            // Buat sisa sel seperti biasa
            createInputCell(row, 'gap', true);
            createInputCell(row, 'acc-gap', true);
            createInputCell(row, 'filled', false);
            createInputCell(row, 'acc-filled', true);
            createInputCell(row, 'empty', false);
            createInputCell(row, 'acc-empty', true);
            createInputCell(row, 'loss', false);
            createInputCell(row, 'acc-loss', true);
            createInputCell(row, 'trouble', false, 'text');
        });
        calculateTable(); // Hitung ulang gap, acc, dll.
    }

    /**
     * Fungsi utama yang dipanggil saat dropdown berubah (LOGIKA DIPERBARUI)
     */
    function updateTableLogic() {
        const jamKerja = jamKerjaEl.value;
        const shift = shiftEl.value;
        const slotsToUse = timeSlots[jamKerja]?.[shift] || [];
        // const targetsToUse = targetValues[jamKerja] || []; // <-- BARIS INI HAPUS
        populateProductionTable(slotsToUse); // <-- Argumen targetsToUse dihapus
    }
    
    // --- Event Listener untuk Dropdown ---
    jamKerjaEl.addEventListener('change', updateTableLogic);
    shiftEl.addEventListener('change', updateTableLogic);
    
    // --- Event Listener BARU for Target per Jam ---
    targetPerJamEl.addEventListener('input', updateStartEndColumns);
    
    // --- Event Listener untuk TTD Chief ---
    chiefNameEl.addEventListener('change', function() {
        const chiefName = chiefNameEl.value;
        const sigChiefEl = document.getElementById('sig-chief-name');
        if (sigChiefEl) {
            sigChiefEl.textContent = chiefName || '[Pilih Chief]';
        }
    });
    
    // Event listener ke TBODY untuk kalkulasi otomatis tabel atas
    productionTable.addEventListener('input', function(event) {
        const target = event.target;
        if (target.matches('[data-col="filled"]') || 
            target.matches('[data-col="empty"]') || 
            target.matches('[data-col="loss"]')) 
        {
            calculateTable();
        }
    });
    
    /**
     * Fungsi untuk menghitung total Hanger dan Produksi di summary bawah
     */
    function calculateSummary() {
        // ================== MODIFIKASI JS DI SINI ==================
        
        // 1. Baca nilai (yang sudah diisi otomatis oleh calculateTable)
        const hangerIsi = parseFloat(document.getElementById('hanger-isi').value) || 0;
        const hangerKosong = parseFloat(document.getElementById('hanger-kosong').value) || 0;
        
        // 2. Baca nilai produksi
        const fresh = parseFloat(document.getElementById('fresh').value) || 0;
        const repair = parseFloat(document.getElementById('repair').value) || 0;

        // 3. Hitung Total Hanger
        const totalHanger = hangerIsi + hangerKosong;
        document.getElementById('total-hanger').value = totalHanger;
        
        // 4. Hitung Total Produksi
        document.getElementById('total-produksi').value = fresh + repair;
        
        // 5. Hitung Performance (MODIFIKASI: Target di-hardcode)
        const totalTarget = 1680; // <-- PERUBAHAN DI SINI
        
        // Pastikan totalHanger sudah dihitung di atas
        // const totalHanger = hangerIsi + hangerKosong; 
        
        const performance = (totalTarget > 0) ? (totalHanger / totalTarget) * 100 : 0;
        document.getElementById('performance').value = performance.toFixed(2) + '%';
        
        // ================ AKHIR MODIFIKASI JS ================
    }
    
    // ================== MODIFIKASI JS DI SINI ==================
    // Daftarkan event listener HANYA untuk input manual (fresh dan repair)
    const summaryInputs = ['fresh', 'repair'];
    // 'hanger-isi' dan 'hanger-kosong' dihapus dari array ini
    // ================ AKHIR MODIFIKASI JS ================
    summaryInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculateSummary);
    });


    // =============================================
    // FUNGSI DRAFT BARU
    // =============================================
   
    /**
     * FUNGSI BARU: Mereset form ke kondisi awal
     */
    function resetFormAndState() {
        productionReportForm.reset(); 
        currentlyEditingId = null; 

        document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];
        targetPerJamEl.value = '240'; // Reset target ke default (diubah dari 224)
        
        productionTable.innerHTML = ''; 
        
        // ================== MODIFIKASI JS DI SINI ==================
        // Kosongkan juga field performance
        if(document.getElementById('performance')) {
            document.getElementById('performance').value = '';
        }
        // ================ AKHIR MODIFIKASI JS ================

        calculateSummary(); 
        
        formTitleEl.textContent = 'Buat Laporan Baru';
        saveFinalButton.textContent = 'Simpan Laporan Final';
        saveDraftButton.textContent = 'Simpan Draft';
        cancelEditButton.style.display = 'none'; 
        formMessageEl.textContent = '';
    }

    /**
     * FUNGSI BARU: Memuat data draft
     */
    async function loadDrafts() {
        if (!draftTbody) return;
        if (!currentUser) {
             console.warn("User belum login, tidak bisa memuat draft.");
             return;
        }
        draftTbody.innerHTML = '<tr><td colspan="5">Memuat draft...</td></tr>';
        
        const { data, error } = await _supabase
            .from('laporan_produksi_harian')
            .select('id, tanggal, shift, jam_kerja, created_at')
            .eq('status', 'draft') 
            .eq('user_id', currentUser.id) 
            .order('created_at', { ascending: false });

        if (error) {
            draftTbody.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${error.message}</td></tr>`; return;
        }
        if (data.length === 0) {
            draftTbody.innerHTML = '<tr><td colspan="5">Tidak ada draft tersimpan.</td></tr>';
        } else {
            draftTbody.innerHTML = '';
            data.forEach(laporan => {
                const row = document.createElement('tr');
                let jamKerjaText = laporan.jam_kerja === '7' ? '7 Jam Kerja' : (laporan.jam_kerja === '5' ? '5 Jam Kerja' : laporan.jam_kerja);
                row.innerHTML = `
                    <td>${laporan.tanggal || 'N/A'}</td>
                    <td>${laporan.shift || 'N/A'}</td>
                    <td>${jamKerjaText}</td>
                    <td>${new Date(laporan.created_at).toLocaleString('id-ID')}</td>
                    <td class="history-actions">
                        <button class="btn-action btn-edit" data-id="${laporan.id}">Lanjutkan</button>
                        <button class="btn-action btn-delete-draft" data-id="${laporan.id}">Hapus</button>
                    </td>
                `;
                draftTbody.appendChild(row);
                
                row.querySelector('.btn-edit').addEventListener('click', (e) => {
                    loadReportForEditing(e.currentTarget.getAttribute('data-id'));
                });
                
                row.querySelector('.btn-delete-draft').addEventListener('click', async (e) => {
                    const idToDelete = e.currentTarget.getAttribute('data-id');
                    if (confirm('Anda yakin ingin menghapus draft ini?')) {
                        const { error: detailErr } = await _supabase.from('laporan_produksi_detail').delete().eq('laporan_id', idToDelete);
                        const { error: mainErr } = await _supabase.from('laporan_produksi_harian').delete().eq('id', idToDelete);
                        
                        if (mainErr || detailErr) {
                            alert('Gagal menghapus draft: ' + (mainErr?.message || detailErr?.message));
                        } else {
                            await loadDrafts(); 
                        }
                    }
                });
            });
        }
    }

    /**
     * FUNGSI BARU: Memuat data laporan ke form untuk diedit (LOGIKA DIPERBARUI)
     */
    async function loadReportForEditing(reportId) {
        formMessageEl.textContent = 'Memuat data laporan...';
        
        const { data: mainReport, error: mainError } = await _supabase
            .from('laporan_produksi_harian')
            .select('*')
            .eq('id', reportId)
            .single();

        if (mainError) {
            alert('Gagal memuat data laporan: ' + mainError.message);
            formMessageEl.textContent = ''; return;
        }

        const { data: detailData, error: detailError } = await _supabase
            .from('laporan_produksi_detail')
            .select('*')
            .eq('laporan_id', reportId)
            .order('no_urut', { ascending: true });

        if (detailError) {
            alert('Gagal memuat data detail laporan: ' + detailError.message);
            formMessageEl.textContent = ''; return;
        }

        // 3. Isi semua field form utama
        document.getElementById('tanggal').value = mainReport.tanggal;
        document.getElementById('chief-name').value = mainReport.chief_name;
        document.getElementById('c-t').value = mainReport.ct;
        document.getElementById('efisiensi').value = mainReport.efisiensi;
        
        // 4. Isi field summary
        document.getElementById('loss-time-menit').value = mainReport.loss_time_menit;
        document.getElementById('loss-time-hanger').value = mainReport.loss_time_hanger;
        document.getElementById('hanger-isi').value = mainReport.hanger_isi;
        document.getElementById('hanger-kosong').value = mainReport.hanger_kosong;
        document.getElementById('fresh').value = mainReport.fresh;
        document.getElementById('repair').value = mainReport.repair;
        document.getElementById('ng').value = mainReport.ng;
        document.getElementById('catatan-lain').value = mainReport.catatan_lain;

        // 5. Buat ulang tabel produksi (DIPERBARUI)
        
        // Ambil target per jam dari baris PERTAMA detail
        const hourlyTarget = detailData[0]?.target_end || 240; // Default 240 jika tidak ada data
        targetPerJamEl.value = hourlyTarget; // Set input Target per Jam
        
        jamKerjaEl.value = mainReport.jam_kerja;
        shiftEl.value = mainReport.shift;
        updateTableLogic(); // Ini akan membuat barIS tabel dgn target yg BENAR

        // 6. Isi nilai-nilai di tabel produksi
        detailData.forEach(detailRow => {
            const rowIndex = detailRow.no_urut - 1;
            if (productionTable.rows[rowIndex]) {
                const tr = productionTable.rows[rowIndex];
                tr.querySelector('[data-col="filled"]').value = detailRow.filled;
                tr.querySelector('[data-col="empty"]').value = detailRow.empty;
                tr.querySelector('[data-col="loss"]').value = detailRow.loss;
                tr.querySelector('[data-col="trouble"]').value = detailRow.trouble_reason;
            }
        });

        // 7. Hitung ulang semua total
        calculateTable();
        calculateSummary();
        
        // 8. Atur state form
        currentlyEditingId = reportId; 
        formTitleEl.textContent = `Mengedit Laporan (Tanggal: ${mainReport.tanggal}, Shift: ${mainReport.shift})`;
        saveFinalButton.textContent = 'Update Laporan Final';
        saveDraftButton.textContent = 'Update Draft';
        cancelEditButton.style.display = 'inline-block'; 
        formMessageEl.textContent = 'Data berhasil dimuat. Silakan edit.';
        productionReportForm.scrollIntoView({ behavior: 'smooth' }); 
    }

    // =============================================
    // FUNGSI SIMPAN DATA (DIMODIFIKASI)
    // =============================================
    
    /**
     * FUNGSI BARU: Mengumpulkan data main report dari form
     */
    function getMainFormData(isDraft = false) {
        return {
            user_id: currentUser.id, 
            status: isDraft ? 'draft' : 'published', 
            tanggal: document.getElementById('tanggal').value,
            jam_kerja: document.getElementById('jam-kerja').value,
            shift: document.getElementById('shift').value,
            chief_name: document.getElementById('chief-name').value,
            ct: document.getElementById('c-t').value,
            efisiensi: document.getElementById('efisiensi').value,
            loss_time_menit: parseFloat(document.getElementById('loss-time-menit').value) || 0,
            loss_time_hanger: parseFloat(document.getElementById('loss-time-hanger').value) || 0,
            hanger_isi: parseFloat(document.getElementById('hanger-isi').value) || 0,
            hanger_kosong: parseFloat(document.getElementById('hanger-kosong').value) || 0,
            total_hanger: parseFloat(document.getElementById('total-hanger').value) || 0,
            fresh: parseFloat(document.getElementById('fresh').value) || 0,
            repair: parseFloat(document.getElementById('repair').value) || 0,
            ng: parseFloat(document.getElementById('ng').value) || 0,
            total_produksi: parseFloat(document.getElementById('total-produksi').value) || 0,
            catatan_lain: document.getElementById('catatan-lain').value
            // Performance tidak perlu disimpan, karena bisa dihitung kapan saja
        };
    }

    /**
     * FUNGSI BARU: Mengumpulkan data detail dari tabel (LOGIKA DIPERBARUI)
     */
    function getDetailTableData(mainReportId) {
        const detailData = [];
        const rows = productionTable.getElementsByTagName('tr');
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const cells = row.getElementsByTagName('td');
            const rowData = {
                laporan_id: mainReportId,
                no_urut: parseInt(cells[0].textContent),
                hourly: cells[1].textContent,
                // Ambil nilai dari INPUT, bukan text
                target_start: parseFloat(row.querySelector('[data-col="target-start"]').value) || 0,
                target_end: parseFloat(row.querySelector('[data-col="target-end"]').value) || 0,
                
                gap: parseFloat(row.querySelector('[data-col="gap"]').value) || 0,
                acc_gap: parseFloat(row.querySelector('[data-col="acc-gap"]').value) || 0,
                filled: parseFloat(row.querySelector('[data-col="filled"]').value) || 0,
                acc_filled: parseFloat(row.querySelector('[data-col="acc-filled"]').value) || 0,
                empty: parseFloat(row.querySelector('[data-col="empty"]').value) || 0,
                acc_empty: parseFloat(row.querySelector('[data-col="acc-empty"]').value) || 0,
                loss: parseFloat(row.querySelector('[data-col="loss"]').value) || 0,
                acc_loss: parseFloat(row.querySelector('[data-col="acc-loss"]').value) || 0,
                trouble_reason: row.querySelector('[data-col="trouble"]').value
            };
            detailData.push(rowData);
        }
        return detailData;
    }

    /**
     * FUNGSI BARU: Logika submit utama
     */
    async function handleFormSubmit(isDraft = false) {
        if (!currentUser) {
            formMessageEl.textContent = 'Error: Sesi tidak ditemukan. Harap refresh.'; return;
        }

        const mainData = getMainFormData(isDraft);
        
        if (!mainData.tanggal || !mainData.jam_kerja || !mainData.shift || !mainData.chief_name) {
            formMessageEl.textContent = 'Error: Tanggal, Jam Kerja, Shift, dan Chief tidak boleh kosong.';
            return;
        }

        saveDraftButton.disabled = true;
        saveFinalButton.disabled = true;
        formMessageEl.textContent = 'Menyimpan...';

        try {
            if (currentlyEditingId) {
                // --- MODE UPDATE ---
                const { error: mainError } = await _supabase
                    .from('laporan_produksi_harian')
                    .update(mainData)
                    .eq('id', currentlyEditingId);
                if (mainError) throw mainError;

                const { error: deleteError } = await _supabase
                    .from('laporan_produksi_detail')
                    .delete()
                    .eq('laporan_id', currentlyEditingId);
                if (deleteError) throw deleteError;

                const detailData = getDetailTableData(currentlyEditingId);
                if (detailData.length > 0) {
                    const { error: detailError } = await _supabase
                        .from('laporan_produksi_detail')
                        .insert(detailData);
                    if (detailError) throw detailError;
                }
                
            } else {
                // --- MODE INSERT BARU ---
                const { data: mainReport, error: mainError } = await _supabase
                    .from('laporan_produksi_harian')
                    .insert(mainData)
                    .select()
                    .single();
                if (mainError) throw mainError;

                const newReportId = mainReport.id;
                const detailData = getDetailTableData(newReportId);
                if (detailData.length > 0) {
                    const { error: detailError } = await _supabase
                        .from('laporan_produksi_detail')
                        .insert(detailData);
                    
                    if (detailError) {
                        await _supabase.from('laporan_produksi_harian').delete().eq('id', newReportId);
                        throw detailError;
                    }
                }
            }

            // --- SUKSES ---
            formMessageEl.textContent = `Laporan berhasil disimpan sebagai ${isDraft ? 'Draft' : 'Final'}!`;
            resetFormAndState();
            await loadDrafts();
            await loadHistory();
            setTimeout(() => { formMessageEl.textContent = ''; }, 3000);

        } catch (error) {
            console.error('Error saat menyimpan:', error);
            formMessageEl.textContent = `Terjadi kesalahan: ${error.message}`;
        } finally {
            saveDraftButton.disabled = false;
            saveFinalButton.disabled = false;
        }
    }

    // =============================================
    // FUNGSI LOAD RIWAYAT (DIMODIFIKASI)
    // =============================================
    async function loadHistory() {
        if (!historyTbody) return;
        historyTbody.innerHTML = '<tr><td colspan="6">Memuat riwayat...</td></tr>';
        
        const { count, error: countError } = await _supabase
            .from('laporan_produksi_harian')
            .select('*', { count: 'exact', head: true })
            .or('status.eq.published,status.is.null'); 
            
        if (countError) {
            historyTbody.innerHTML = `<tr><td colspan="6" style="color: red;">Error: ${countError.message}</td></tr>`; 
            return;
        }
        
        totalReports = count;
        const totalPages = Math.ceil(totalReports / itemsPerPage) || 1;
        const from = (currentPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        const { data, error } = await _supabase
            .from('laporan_produksi_harian')
            .select('id, tanggal, shift, jam_kerja, total_hanger, created_at')
            .or('status.eq.published,status.is.null') 
            .order('created_at', { ascending: false })
            .range(from, to);
            
        if (error) {
            historyTbody.innerHTML = `<tr><td colspan="6" style="color: red;">Error: ${error.message}</td></tr>`; 
            return;
        }
        
        if (data.length === 0) {
            historyTbody.innerHTML = '<tr><td colspan="6">Belum ada riwayat.</td></tr>';
        } else {
            historyTbody.innerHTML = '';
            data.forEach(laporan => {
                const row = document.createElement('tr');
                let jamKerjaText = laporan.jam_kerja === '7' ? '7 Jam Kerja' : (laporan.jam_kerja === '5' ? '5 Jam Kerja' : laporan.jam_kerja);
                
                row.innerHTML = `
                    <td>${laporan.tanggal}</td>
                    <td>${laporan.shift}</td>
                    <td>${jamKerjaText}</td>
                    <td>${laporan.total_hanger}</td>
                    <td>${new Date(laporan.created_at).toLocaleString('id-ID')}</td>
                    <td class="history-actions">
                        <button class="btn-action btn-edit" data-id="${laporan.id}">Edit</button>
                        <button class="btn-action btn-pdf" data-id="${laporan.id}">PDF</button>
                    </td>
                `;
                historyTbody.appendChild(row);
                
                row.querySelector('.btn-pdf').addEventListener('click', (e) => {
                    generatePDF(e.currentTarget.getAttribute('data-id'));
                });
                
                row.querySelector('.btn-edit').addEventListener('click', (e) => {
                    loadReportForEditing(e.currentTarget.getAttribute('data-id'));
                });
            });
        }
        
        if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        if (prevButton) prevButton.disabled = (currentPage === 1);
        if (nextButton) nextButton.disabled = (currentPage === totalPages) || (totalReports === 0);
    }
    
    // --- Event Listener Paginasi ---
    if(prevButton) prevButton.addEventListener('click', () => { 
        if (currentPage > 1) { currentPage--; loadHistory(); } 
    });
    if(nextButton) nextButton.addEventListener('click', () => { 
        const totalPages = Math.ceil(totalReports / itemsPerPage); 
        if (currentPage < totalPages) { currentPage++; loadHistory(); } 
    });


    // =============================================
    // FUNGSI GENERATE PDF (Sudah rapi)
    // =============================================
    async function generatePDF(reportId) {
        if (!window.jspdf) {
            alert('Gagal memuat library PDF. Pastikan Anda terhubung ke internet.');
            return;
        }
        
        alert('Membuat PDF... Mohon tunggu.');
        
        try {
            // 2. Fetch data
            const { data: mainReport, error: mainError } = await _supabase
                .from('laporan_produksi_harian')
                .select('*')
                .eq('id', reportId)
                .single();
                
            if (mainError) throw new Error(`Gagal mengambil data utama: ${mainError.message}`);

            const { data: detailData, error: detailError } = await _supabase
                .from('laporan_produksi_detail')
                .select('*')
                .eq('laporan_id', reportId)
                .order('no_urut', { ascending: true });

            if (detailError) throw new Error(`Gagal mengambil data detail: ${detailError.message}`);

            // 3. Start PDF generation
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            // --- JUDUL & INFO ---
            const pageWidth = doc.internal.pageSize.width;
            
            doc.setFontSize(12); doc.setFont(undefined, 'bold');
            doc.text('PAINTING PRODUCTION DAILY CONTROL', pageWidth / 2, 18, { align: 'center' }); 
            doc.setFontSize(10);
            doc.text('LOSS TIME & PERFORMANCE MONITORING (OTR&PER)', pageWidth / 2, 24, { align: 'center' }); 
            
            // --- Info Laporan ---
            const dateObj = new Date(mainReport.tanggal + 'T12:00:00');
            const dayName = dateObj.toLocaleString('id-ID', { weekday: 'long' });
            const [year, month, day] = mainReport.tanggal.split('-');
            const ddmmyyyy = `${day}-${month}-${year}`;
            const formattedDate = `${dayName}, ${ddmmyyyy}`;

            let jamKerjaText = mainReport.jam_kerja === '7' ? '7 Jam Kerja' : (mainReport.jam_kerja === '5' ? '5 Jam Kerja' : mainReport.jam_kerja);

            doc.setFontSize(10); doc.setFont(undefined, 'normal');
            
            let infoY = 34; 
            const col1 = 20; const col2 = 85; const col3 = 155; const col4 = 210;
            
            doc.text(`Tanggal: ${formattedDate}`, col1, infoY);
            doc.text(`Jam Kerja: ${jamKerjaText}`, col2, infoY);
            doc.text(`Shift: ${mainReport.shift}`, col3, infoY);
            doc.text(`Chief: ${mainReport.chief_name}`, col4, infoY);
            
            infoY += 6; 
            doc.text(`C/T: ${mainReport.ct}`, col1, infoY);
            doc.text(`Efisiensi: ${mainReport.efisiensi}`, col2, infoY);

            // --- TABEL PRODUKSI ---
            const tableColumn = [
                "NO", "Hourly", "Start", "End",
                "GAP", "ACC. GAP", "FILLED", "ACC. FILLED", 
                "EMPTY", "ACC. EMPTY", "LOSS", "ACC. LOSS", 
                "TROUBLE REASON"
            ];
            const tableRows = [];
            
            detailData.forEach(row => {
                tableRows.push([
                    row.no_urut, row.hourly, row.target_start, row.target_end,
                    row.gap, row.acc_gap, row.filled, row.acc_filled,
                    row.empty, row.acc_empty, row.loss, row.acc_loss,
                    row.trouble_reason
                ]);
            });
            
            if (tableRows.length > 0) {
                doc.autoTable({
                    startY: infoY + 4, 
                    head: [tableColumn],
                    body: tableRows,
                    theme: 'grid',
                    // --- PERBAIKAN: TINGGI BARIS DITAMBAH ---
                    styles: { fontSize: 7, cellPadding: 1, minCellHeight: 8, halign: 'center', valign: 'middle' }, // <-- minCellHeight diubah ke 8
                    headStyles: { fillColor: [44, 62, 80], fontSize: 7, cellPadding: 1, halign: 'center' }, 
                    margin: { left: 10, right: 10 },
                    // --- PERBAIKAN: LEBAR KOLOM DIKURANGI ---
                    columnStyles: {
                        0: { cellWidth: 8, halign: 'center' },  // NO
                        1: { cellWidth: 22, halign: 'center' }, // Hourly
                        2: { cellWidth: 16, halign: 'center' }, // Start <-- 16
                        3: { cellWidth: 16, halign: 'center' }, // End <-- 16
                        4: { cellWidth: 16, halign: 'center' }, // GAP <-- 16
                        5: { cellWidth: 16, halign: 'center' }, // ACC. GAP <-- 16
                        6: { cellWidth: 16, halign: 'center' }, // FILLED <-- 16
                        7: { cellWidth: 16, halign: 'center' }, // ACC. FILLED <-- 16
                        8: { cellWidth: 16, halign: 'center' }, // EMPTY <-- 16
                        9: { cellWidth: 16, halign: 'center' }, // ACC. EMPTY <-- 16
                        10: { cellWidth: 16, halign: 'center' }, // LOSS <-- 16
                        11: { cellWidth: 16, halign: 'center' }, // ACC. LOSS <-- 16
                        12: { cellWidth: 'auto', halign: 'left' } // TROUBLE REASON (Otomatis)
                    }
                });
            }
            
            let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 5 : infoY + 15; 

            // --- KOMENTAR & CATATAN ---
            doc.setFontSize(10); doc.setFont(undefined, 'bold');
            doc.text('Komentar & Catatan:', 20, finalY);

            // ================== MODIFIKASI PDF DI SINI ==================
            // Hitung performance (MODIFIKASI: Target di-hardcode)
            const totalTarget = 1680; // <-- PERUBAHAN DI SINI
            const performance = (totalTarget > 0) ? (mainReport.total_hanger / totalTarget) * 100 : 0;
            const performanceText = performance.toFixed(2) + '%';
            
            const bodyKiri = [
                ['Loss Time (Menit)', mainReport.loss_time_menit || '0'],
                ['Loss Time (Hanger)', mainReport.loss_time_hanger || '0'],
                ['Hanger ISI', mainReport.hanger_isi || '0'],
                ['Hanger Kosong', mainReport.hanger_kosong || '0'],
                [{ content: 'Total Hanger', styles: { fontStyle: 'bold' } }, { content: mainReport.total_hanger || '0', styles: { fontStyle: 'bold', halign: 'center' } }],
                [{ content: 'Performance', styles: { fontStyle: 'bold' } }, { content: performanceText, styles: { fontStyle: 'bold', halign: 'center' } }] // <-- BARIS BARU
            ];
            
            const bodyKanan = [
                ['Fresh', mainReport.fresh || '0'],
                ['Repair', mainReport.repair || '0'],
                ['NG', mainReport.ng || '0'],
                [{ content: 'TOTAL Produksi', styles: { fontStyle: 'bold' } }, { content: mainReport.total_produksi || '0', styles: { fontStyle: 'bold', halign: 'center' } }]
            ];
            
            const tableStyles = {
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 1 },
                columnStyles: {
                    0: { fontStyle: 'bold', halign: 'left' },
                    1: { halign: 'center' }
                },
                tableWidth: 120
            };

            doc.autoTable({ startY: finalY + 3, body: bodyKiri, ...tableStyles, margin: { left: 20 } });
            const leftTableFinalY = doc.lastAutoTable.finalY; 

            doc.autoTable({ startY: finalY + 3, body: bodyKanan, ...tableStyles, margin: { left: 155 } });
            const rightTableFinalY = doc.lastAutoTable.finalY;

            // --- "Catatan Lain" (Dipindahkan ke Kanan) ---
            let catatanY = rightTableFinalY + 4; // <-- DIUBAH: dari leftTableFinalY
            const catatanX = 155; // <-- BARU: X-coordinate baru (sama dgn margin kiri tabel kanan)
            
            doc.setFontSize(10); 
            doc.setFont(undefined, 'bold');
            doc.text('Catatan Lain:', catatanX, catatanY); // <-- DIUBAH: dari 20
            doc.setFont(undefined, 'normal');
            doc.setLineWidth(0.1);
            doc.rect(catatanX, catatanY + 2, 120, 18); // <-- DIUBAH: dari 20.
            doc.text(mainReport.catatan_lain || '-', catatanX + 1, catatanY + 7, { maxWidth: 118 }); // <-- DIUBAH: dari 21
            const catatanFinalY = catatanY + 2 + 18; // <-- Ini tetap

            // --- TANDA TANGAN ---
            let sigY = Math.max(leftTableFinalY, catatanFinalY) + 7; // <-- DIUBAH: dari (catatanFinalY, rightTableFinalY)
            // ================ AKHIR MODIFIKASI PDF ================

            doc.setFontSize(9);
            const sigCol1 = 45, sigCol2 = 145, sigCol3 = 245;

            // === AWAL MODIFIKASI ===
            doc.setFont(undefined, 'normal');
            doc.text('Dibuat,', sigCol1, sigY, { align: 'center' });
            doc.setFont(undefined, 'bold');
            doc.text(loggedInUserName, sigCol1, sigY + 12, { align: 'center' }); 
            doc.setFont(undefined, 'normal');
            doc.text(loggedInUserJabatan, sigCol1, sigY + 16, { align: 'center' }); // <-- INI YANG DIGANTI
            // === AKHIR MODIFIKASI ===
            
            doc.text('Disetujui,', sigCol2, sigY, { align: 'center' });
            doc.setFont(undefined, 'bold');
            doc.text(mainReport.chief_name || '[Pilih Chief]', sigCol2, sigY + 12, { align: 'center' }); 
            doc.setFont(undefined, 'normal');
            doc.text('Chief', sigCol2, sigY + 16, { align: 'center' }); 
            
            doc.text('Mengetahui,', sigCol3, sigY, { align: 'center' });
            doc.setFont(undefined, 'bold');
            doc.text('SINGGIH EKO W', sigCol3, sigY + 12, { align: 'center' }); 
            doc.setFont(undefined, 'normal');
            doc.text('Dept. Head', sigCol3, sigY + 16, { align: 'center' }); 
            
            // --- BORDER HALAMAN ---
            const pageHeight = doc.internal.pageSize.height;
            const margin = 10; 
            doc.setLineWidth(0.5); 
            doc.setDrawColor(0, 0, 0); 
            doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
            
            // Simpan PDF
            doc.save(`Laporan_Produksi_${mainReport.tanggal}_Shift_${mainReport.shift}.pdf`);

        } catch (error) {
            alert(`Gagal membuat PDF: ${error.message}`);
            console.error('PDF Generation Error:', error);
        }
    }
    
    // =============================================
    // PANGGIL FUNGSI SAAT HALAMAN DIMUAT
    // =============================================
    
    // Event Listener Form
    productionReportForm.onsubmit = async (event) => {
        event.preventDefault();
        await handleFormSubmit(false); // Submit FINAL
    };

    saveDraftButton.addEventListener('click', async () => {
        await handleFormSubmit(true); // Submit DRAFT
    });
    
    cancelEditButton.addEventListener('click', resetFormAndState);

    // Inisialisasi Halaman
    (async () => {
        await loadAndSetUserData(); // 1. Login & ambil data user
        resetFormAndState();      // 2. Siapkan form
        await loadDrafts();         // 3. Muat draft
        await loadHistory();        // 4. Muat riwayat
    })();

});