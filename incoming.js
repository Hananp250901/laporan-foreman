// =================================================================
// C. LOGIKA HALAMAN INCOMING (incoming.html)
// =================================================================

const incomingForm = document.getElementById('incoming-form');
if (incomingForm) {
    // Inisialisasi library jsPDF.
    const { jsPDF } = window.jspdf;

    let currentUser = null; 
    let currentKaryawan = null; 
    const historyListEl = document.getElementById('incoming-history-list')?.getElementsByTagName('tbody')[0];
    const formMessageEl = document.getElementById('form-message');

    /**
     * FUNGSI PDF (UPDATED)
     */
    async function generatePDF(reportId) {
        alert('Membuat PDF... Mohon tunggu.');

        try {
            const { data: report, error } = await _supabase
                .from('laporan_incoming').select('*').eq('id', reportId).single();
            if (error) throw new Error(`Gagal mengambil data laporan: ${error.message}`);
            
            const doc = new jsPDF({ format: 'legal' });

            // Judul
            doc.setFontSize(16);
            doc.text("LAPORAN INTERNAL PAINTING", 105, 15, { align: 'center' });
            doc.setFontSize(12);
            doc.text("LINE INCOMING", 105, 22, { align: 'center' });

            // Info Header
            doc.setFontSize(10);
            doc.text("HARI", 20, 35);
            doc.text(`: ${report.hari}`, 50, 35);
            doc.text("TANGGAL", 20, 40);
            doc.text(`: ${report.tanggal}`, 50, 40);
            doc.text("SHIFT", 20, 45);
            doc.text(`: ${report.shift}`, 50, 45);
            
            const tableStyles = {
                theme: 'grid',
                styles: { cellWidth: 'wrap', fontSize: 9 },
                headStyles: { fillColor: [22, 160, 133], textColor: [255, 255, 255], fontSize: 10 }
            };

            // Tabel 1: Absensi (UPDATED)
            doc.autoTable({
                startY: 50,
                head: [['1. ABSENSI', 'Masuk (org)', 'Tidak Masuk (Nama)']], // Judul diubah
                body: [
                    // Menampilkan data sebagai teks
                    ['A. Line Incoming', report.absensi_incoming_masuk, report.absensi_incoming_tdk_masuk || ''],
                    ['B. Line Step Assy', report.absensi_step_assy_masuk, report.absensi_step_assy_tdk_masuk || ''],
                    ['C. Line Buka Cap', report.absensi_buka_cap_masuk, report.absensi_buka_cap_tdk_masuk || ''],
                ],
                ...tableStyles
            });

            // Tabel 2: Produksi Line Incoming
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 7,
                head: [['2. PRODUKSI LINE INCOMING', 'Jumlah/Catatan']], 
                body: [
                    ['In Wuster', report.prod_wuster || ''], 
                    ['In Chrom', report.prod_chrom || ''],
                    ['Quality Item', report.quality_item || ''],
                    ['Quality Cek', report.quality_cek || ''],
                    ['Quality NG (Ket.)', report.quality_ng || ''],
                    ['Balik Material', report.quality_balik_material || ''],
                ],
                ...tableStyles
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
                ],
                ...tableStyles,
                columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: 130 } }
            });
            
            // Footer
            let finalY = doc.autoTable.previous.finalY + 20; 
            if (finalY > 300) { doc.addPage(); finalY = 20; } 

            const preparerName = currentKaryawan ? currentKaryawan.nama_lengkap : (currentUser ? currentUser.email : 'N/A');
            doc.setFontSize(10);

            doc.text("Dibuat,", 20, finalY);
            doc.text(preparerName, 20, finalY + 20); 
            doc.text("Foreman", 20, finalY + 25);
            
            doc.text("Disetujui,", 105, finalY, { align: 'center' });
            const chiefName = report.chief_name || '( .......................... )';
            doc.text(chiefName, 105, finalY + 20, { align: 'center' });
            doc.text("Chief", 105, finalY + 25, { align: 'center' });

            doc.text("Mengetahui,", 190, finalY, { align: 'right' });
            doc.text("SINGGIH E W", 190, finalY + 20, { align: 'right' });
            doc.text("Dept Head", 190, finalY + 25, { align: 'right' });

            // Simpan file
            doc.save(`Laporan_Incoming_${report.tanggal}_Shift${report.shift}.pdf`);

        } catch (error)
        {
            alert(`Gagal membuat PDF: ${error.message}`);
            console.error('PDF Generation Error:', error);
        }
    }


    /**
     * Fungsi: Memuat riwayat laporan
     */
    async function loadIncomingHistory() {
        if (!historyListEl) return;
        historyListEl.innerHTML = '<tr><td colspan="5">Memuat riwayat...</td></tr>';

        const { data, error } = await _supabase
            .from('laporan_incoming').select('id, tanggal, shift, hari, created_at')
            .order('created_at', { ascending: false }).limit(20); 

        if (error) {
            historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Error: ${error.message}</td></tr>`; return;
        }
        if (data.length === 0) {
            historyListEl.innerHTML = '<tr><td colspan="5">Belum ada riwayat.</td></tr>'; return;
        }
        historyListEl.innerHTML = ''; 

        data.forEach(laporan => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${laporan.tanggal}</td>
                <td>${laporan.shift}</td>
                <td>${laporan.hari}</td>
                <td>${new Date(laporan.created_at).toLocaleString('id-ID')}</td>
                <td>
                    <button class="button-pdf" data-id="${laporan.id}">
                        <span class="material-icons">picture_as_pdf</span> PDF
                    </button>
                </td>
            `;
            historyListEl.appendChild(row);

            row.querySelector('.button-pdf').addEventListener('click', (e) => {
                const reportId = e.currentTarget.getAttribute('data-id');
                generatePDF(reportId);
            });
        });
    }

    /**
     * Fungsi: Menangani submit form (UPDATED)
     */
    incomingForm.onsubmit = async (event) => {
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
            
            absensi_incoming_masuk: parseInt(document.getElementById('absensi_incoming_masuk').value),
            // --- UPDATED (dihapus parseInt) ---
            absensi_incoming_tdk_masuk: document.getElementById('absensi_incoming_tdk_masuk').value,
            
            absensi_step_assy_masuk: parseInt(document.getElementById('absensi_step_assy_masuk').value),
            // --- UPDATED (dihapus parseInt) ---
            absensi_step_assy_tdk_masuk: document.getElementById('absensi_step_assy_tdk_masuk').value,
            
            absensi_buka_cap_masuk: parseInt(document.getElementById('absensi_buka_cap_masuk').value),
            // --- UPDATED (dihapus parseInt) ---
            absensi_buka_cap_tdk_masuk: document.getElementById('absensi_buka_cap_tdk_masuk').value,
            // ----------------------------------
            
            prod_wuster: document.getElementById('prod_wuster').value,
            prod_chrom: document.getElementById('prod_chrom').value,
            
            quality_item: document.getElementById('quality_item').value,
            quality_cek: document.getElementById('quality_cek').value,
            quality_ng: document.getElementById('quality_ng').value,
            quality_balik_material: document.getElementById('quality_balik_material').value,
            
            prod_step_assy_notes: document.getElementById('prod_step_assy_notes').value,
            prod_buka_cap_notes: document.getElementById('prod_buka_cap_notes').value,
            prod_assy_cup_notes: document.getElementById('prod_assy_cup_notes').value,
            check_thickness_notes: document.getElementById('check_thickness_notes').value
        };

        const { data, error } = await _supabase.from('laporan_incoming').insert(laporanData);

        if (error) {
            formMessageEl.textContent = `Error: ${error.message}`;
        } else {
            formMessageEl.textContent = 'Laporan berhasil disimpan!';
            incomingForm.reset(); 
            loadIncomingHistory(); 
            setTimeout(() => { formMessageEl.textContent = ''; }, 3000);
        }
    };
    
    /**
     * Fungsi Inisialisasi Halaman
     */
    (async () => {
        const session = await getActiveUserSession();
        if (!session) {
            alert('Anda harus login terlebih dahulu!');
            window.location.href = 'index.html';
            return;
        }
        currentUser = session.user; 
        currentKaryawan = await loadSharedDashboardData(currentUser); 
        await loadIncomingHistory(); 
    })();
}