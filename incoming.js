// =================================================================
// C. LOGIKA HALAMAN INCOMING (incoming.html)
// (VERSI MODIFIKASI: Layout PDF diubah, Remover & Touch Up pindah ke KIRI)
// (MODIFIKASI 2: Verifikasi jadi list dinamis, PDF skip item 0)
// (MODIFIKASI 3: Check dipecah jadi 3 textarea)
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    const incomingForm = document.getElementById('incoming-form');
    if (!incomingForm) return; 

    let currentUser = null;
    let currentKaryawan = null;
    let currentlyEditingId = null; 

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

    // === Variabel Line Chrom ===
    const prodChromInputs = document.querySelectorAll('.prod-chrom-calc');
    const prodChromTotalInput = document.getElementById('prod_chrom_total');

    // === Variabel List Dinamis ===
    const stepAssyListContainer = document.getElementById('prod-step-assy-list');
    const addStepAssyItemBtn = document.getElementById('add-step-assy-item-btn');
    const defaultStepAssyItems = ["S/B K41K LH", "S/B K41K SP", "S/B K41K CW", "S/B KPYX LH", "S/B KPYX SP", "S/B KPYX CW"];
    const stepAssyTotalSpan = document.getElementById('prod-step-assy-total')

    const bukaCapListContainer = document.getElementById('prod-buka-cap-list');
    const addBukaCapItemBtn = document.getElementById('add-buka-cap-item-btn');
    const defaultBukaCapItems = ["M/C 2DP RH", "M/C 2DP LH", "M/C K1ZV ABS", "M/C K1ZV CBS", "M/C K15A", "M/C K2SA", "M/C K3VA FR", "M/C XD 831", "M/C K84A FR"];
    const bukaCapTotalSpan = document.getElementById('prod-buka-cap-total');

    // === Variabel Line Remover ===
    const removerListContainer = document.getElementById('prod-remover-list');
    const addRemoverItemBtn = document.getElementById('add-remover-item-btn');
    const defaultRemoverItems = ["C/H BXD", "C/C 1DY 2", "HOLDER KYEA"];
    const removerTotalSpan = document.getElementById('prod-remover-total');
    
    // === Variabel Touch Up Aerox ===
    const touchUpAeroxListContainer = document.getElementById('prod-touch-up-aerox-list');
    const addTouchUpAeroxItemBtn = document.getElementById('add-touch-up-aerox-item-btn');
    const defaultTouchUpAeroxItems = ["M/C 2DP RH", "M/C 2DP LH", "M/C K1ZV ABS", "M/C K1ZV CBS"];
    const touchUpAeroxTotalSpan = document.getElementById('prod-touch-up-aerox-total');
    
    // === TAMBAHAN: Variabel Line Verifikasi ===
    const verifikasiListContainer = document.getElementById('prod-verifikasi-list');
    const addVerifikasiItemBtn = document.getElementById('add-verifikasi-item-btn');
    const defaultVerifikasiItems = ["M/C 2DP RH", "M/C 2DP LH", "M/C K1ZV ABS", "M/C K1ZV CBS"]; // Default kosong
    const verifikasiTotalSpan = document.getElementById('prod-verifikasi-total');

    /**
     * FUNGSI: Menghitung total Produksi Chrom (A)
     */
    function updateProdChromTotal() {
        if (!prodChromTotalInput) return;
        let total = 0;
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

        const inputType = "number";
        const inputPlaceholder = "Jumlah";
        const inputValue = itemValue || " "; 

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
        container.innerHTML = ''; 
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
    if (addRemoverItemBtn) addRemoverItemBtn.addEventListener('click', () => addDynamicRow(removerListContainer, 'remover-item-name', 'remover-item-value')); 
    if (addTouchUpAeroxItemBtn) addTouchUpAeroxItemBtn.addEventListener('click', () => addDynamicRow(touchUpAeroxListContainer, 'touchup-aerox-item-name', 'touchup-aerox-item-value')); 
    if (addVerifikasiItemBtn) addVerifikasiItemBtn.addEventListener('click', () => addDynamicRow(verifikasiListContainer, 'verifikasi-item-name', 'verifikasi-item-value')); // TAMBAHAN

    // Event listener untuk tombol "Hapus" (Delegasi)
    incomingForm.addEventListener('click', (e) => {
        if (e.target.closest('.button-remove')) {
            const row = e.target.closest('.dynamic-list-row');
            if (!row) return;
            row.remove(); 
            calculateAllDynamicTotals(); 
        }
    });

    // Event listener untuk perubahan input di list dinamis
    incomingForm.addEventListener('input', (e) => {
        const targetClass = e.target.classList;
        if (targetClass.contains('step-assy-item-value') ||
            targetClass.contains('buka-cap-item-value') ||
            targetClass.contains('remover-item-value') || 
            targetClass.contains('touchup-aerox-item-value') ||
            targetClass.contains('verifikasi-item-value')) { // TAMBAHAN
            calculateAllDynamicTotals(); 
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
        calculateDynamicListTotal(removerListContainer, 'remover-item-value', removerTotalSpan); 
        calculateDynamicListTotal(touchUpAeroxListContainer, 'touchup-aerox-item-value', touchUpAeroxTotalSpan); 
        calculateDynamicListTotal(verifikasiListContainer, 'verifikasi-item-value', verifikasiTotalSpan); // TAMBAHAN
    }

    
    /**
     * FUNGSI PDF (DIMODIFIKASI UNTUK LAYOUT BARU)
     */
    async function generatePDF(reportId) {
        alert('Membuat PDF... Mohon tunggu.');
        if (!window.jspdf) {
            alert('Gagal memuat library PDF. Pastikan Anda terhubung ke internet.');
            return;
        }
        const { jsPDF } = window.jspdf;

        /**
         * FUNGSI HELPER PDF (KANAN): 
         * Mengubah string notes (cth: "Item A: 10\nItem B: 20") 
         * menjadi baris-baris autoTable (3 kolom) lengkap dengan rowSpan dan TOTAL.
         * MODIFIKASI: Melewatkan item jika quantity 0.
         */
        function parseNotesToRows(groupName, notesString) {
            const parsedRows = []; 
            const itemRows = [];   
            let sum = 0;
            
            const lines = notesString ? notesString.split('\n').filter(l => l.trim() !== '') : [];
            
            lines.forEach(line => {
                const parts = line.split(': ');
                const name = parts[0] || '';
                const value = parts.slice(1).join(': ') || ''; 
                const quantity = parseInt(value) || 0;
                
                // MODIFIKASI: Hanya tambahkan jika quantity > 0
                if (quantity > 0) {
                    sum += quantity;
                    itemRows.push([name, value]);
                } 
            });

            // MODIFIKASI: Cek jika itemRows kosong (artinya list asli kosong ATAU semua item nilainya 0)
            if (itemRows.length === 0) {
                parsedRows.push([
                    { content: groupName, styles: { fontStyle: 'bold', valign: 'top' } },
                    '(Kosong)',
                    ''
                ]);
                return parsedRows;
            }
            // AKHIR MODIFIKASI

            itemRows.push([
                { content: 'TOTAL', styles: { fontStyle: 'bold', halign: 'right' } },
                { content: sum.toString(), styles: { fontStyle: 'bold', halign: 'center' } } 
            ]);

            parsedRows.push([
                { 
                    content: groupName, 
                    rowSpan: itemRows.length, 
                    styles: { fontStyle: 'bold', valign: 'top' } 
                },
                ...itemRows[0] 
            ]);
            
            parsedRows.push(...itemRows.slice(1));
            
            return parsedRows;
        }

        /**
         * FUNGSI HELPER PDF (KIRI): 
         * Mengubah string notes menjadi baris-baris sederhana [Item, Jumlah]
         * untuk tabel KIRI (2 kolom).
         * MODIFIKASI: Melewatkan item jika quantity 0.
         */
        function parseNotesToSimpleRows(title, notesString) {
            const rows = [];
            let sum = 0;
            
            rows.push([{ 
                content: title, 
                styles: { fontStyle: 'bold', fillColor: [230, 230, 230] }, 
                colSpan: 2 
            }]);
            
            const lines = notesString ? notesString.split('\n').filter(l => l.trim() !== '') : [];
            const validItemRows = []; // Tampung item yang valid di sini

            lines.forEach(line => {
                const parts = line.split(': ');
                const name = '   ' + (parts[0] || ''); 
                const value = parts.slice(1).join(': ') || ''; 
                const quantity = parseInt(value) || 0;
                
                // MODIFIKASI: Hanya tambahkan jika quantity > 0
                if (quantity > 0) {
                    sum += quantity;
                    validItemRows.push([name, { content: value, styles: { halign: 'center' } }]); 
                }
            });

            // MODIFIKASI: Cek jika tidak ada item valid
            if (validItemRows.length === 0) {
                rows.push(['(Kosong)', '']);
                return rows;
            }
            // AKHIR MODIFIKASI

            // Tambahkan semua item valid ke rows
            rows.push(...validItemRows);

            rows.push([
                { content: 'TOTAL', styles: { fontStyle: 'bold' } },
                { content: sum.toString(), styles: { fontStyle: 'bold', halign: 'center' } }
            ]);
            
            return rows;
        }
        // --- Akhir fungsi helper ---

        try {
            const { data: report, error } = await _supabase
                .from('laporan_incoming').select('*').eq('id', reportId).single();
            if (error) throw new Error(`Gagal mengambil data laporan: ${error.message}`);
            
            const doc = new jsPDF({ format: 'legal' }); 

            // === TAMBAHAN BARU: Border Hitam Pinggir ===
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 10; // Margin 10mm
            doc.setDrawColor(0, 0, 0); // Warna border hitam
            doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2)); // Gambar kotak
            // === AKHIR TAMBAHAN ===

            // Judul
            doc.setFontSize(16); doc.text("LAPORAN INTERNAL PAINTING", 105, 15, { align: 'center' });
            doc.setFontSize(12); doc.text("LINE INCOMING", 105, 22, { align: 'center' });

            // Info Header
            doc.setFontSize(10);
            doc.text("HARI", 20, 35); doc.text(`: ${report.hari}`, 50, 35);
            doc.text("TANGGAL", 20, 40); doc.text(`: ${report.tanggal}`, 50, 40);
            doc.text("SHIFT", 20, 45); doc.text(`: ${report.shift}`, 50, 45);
            
            // Style Tabel (Rapat)
            const tableStyles = { 
                theme: 'grid', 
                styles: { 
                    cellWidth: 'wrap', 
                    fontSize: 8, 
                    cellPadding: 1.2 
                }, 
                headStyles: { 
                    fillColor: [22, 160, 133], 
                    textColor: [255, 255, 255], 
                    fontSize: 9, 
                    cellPadding: 1.2 
                } 
            };
            
            // Tabel 1: Absensi (Full Width)
            doc.autoTable({
                startY: 50, 
                head: [['1. ABSENSI', 'Masuk (org)', 'Tdk Masuk (org)', 'Tidak Masuk (Nama)']],
                body: [
                    ['A. Line Incoming', report.absensi_incoming_masuk || 0, report.absensi_incoming_tdk_masuk_org || 0, report.absensi_incoming_tdk_masuk_nama || ''],
                    ['B. Line Step Assy', report.absensi_step_assy_masuk || 0, report.absensi_step_assy_tdk_masuk_org || 0, report.absensi_step_assy_tdk_masuk_nama || ''],
                    ['C. Line Buka Cap', report.absensi_buka_cap_masuk || 0, report.absensi_buka_cap_tdk_masuk_org || 0, report.absensi_buka_cap_tdk_masuk_nama || ''],
                    ['D. Chrom', report.absensi_chrom_masuk || 0, report.absensi_chrom_tdk_masuk_org || 0, report.absensi_chrom_tdk_masuk_nama || ''],
                    ['E. Remover', report.absensi_remover_masuk || 0, report.absensi_remover_tdk_masuk_org || 0, report.absensi_remover_tdk_masuk_nama || ''],
                    ['F. Touch Up Aerox', report.absensi_touch_up_aerox_masuk || 0, report.absensi_touch_up_aerox_tdk_masuk_org || 0, report.absensi_touch_up_aerox_tdk_masuk_nama || ''],
                    ['G. Verifikasi', report.absensi_verifikasi_masuk || 0, report.absensi_verifikasi_tdk_masuk_org || 0, report.absensi_verifikasi_tdk_masuk_nama || ''],
                ], 
                ...tableStyles,
                columnStyles: { 
                    0: { cellWidth: 50 }, 
                    1: { cellWidth: 25, halign: 'center' }, 
                    2: { cellWidth: 30, halign: 'center' },
                    3: { cellWidth: 85 }
                }
            });
            
            // ===========================================
            //         MODIFIKASI LAYOUT 2 KOLOM
            // ===========================================
            
            let table2StartY = doc.autoTable.previous.finalY + 5;
            
            // const pageWidth = doc.internal.pageSize.getWidth(); // Sudah ada di atas
            const pageMargin = 10;
            const usableWidth = pageWidth - (pageMargin * 2);
            const tableWidth = (usableWidth / 2) - 2;
            const gap = 4;
            
            const table2MarginRight = pageWidth - pageMargin - tableWidth;
            const table3MarginLeft = pageMargin + tableWidth + gap;

            // =======================================================
            // KOLOM KIRI (Tabel 2)
            // =======================================================
            
            // 1. Bangun body untuk Tabel 2 (Kiri)
            let table2Body = [
                ['In Wuster', report.prod_wuster || ''], 
                ['In Chrom', report.prod_chrom || ''],
                ['Quality Item', report.quality_item || ''], 
                ['Quality Cek', report.quality_cek || ''],
                ['Quality NG (Ket.)', report.quality_ng || ''], 
                ['Balik Material', report.quality_balik_material || ''],
                // Data Chrom
                [{ content: 'Produksi Line Chrom:', styles: { fontStyle: 'bold', fillColor: [230, 230, 230] }, colSpan: 2 }],
                ['   Part Machining', { content: report.prod_chrom_machining || 0, styles: { halign: 'center' } }],
                ['   Part Finishing', { content: report.prod_chrom_finishing || 0, styles: { halign: 'center' } }],
                ['   Part Remover', { content: report.prod_chrom_remover || 0, styles: { halign: 'center' } }],
                ['   TOTAL Produksi', { content: report.prod_chrom_total || 0, styles: { fontStyle: 'bold', halign: 'center' } }],
            ];
            
            // Ambil data Remover & Touch Up
            const removerSimpleRows = parseNotesToSimpleRows('Line Remover', report.prod_remover_notes);
            table2Body.push(...removerSimpleRows);
            
            const touchUpSimpleRows = parseNotesToSimpleRows('Line Touch Up Aerox', report.prod_touchup_notes);
            table2Body.push(...touchUpSimpleRows);

            // 2. Gambar Tabel Kiri
            doc.autoTable({
                startY: table2StartY, 
                head: [['2. PRODUKSI LINE INCOMING', 'Jumlah/Catatan']], 
                body: table2Body, 
                ...tableStyles,
                margin: { right: table2MarginRight } 
            });
            
            let table2FinalY = doc.autoTable.previous.finalY;

            // =======================================================
            // KOLOM KANAN (Tabel 3 & 4)
            // =======================================================
            
            // 1. Bangun body untuk Tabel 3 (Kanan)
            let table3Body = [];
            
            const stepAssyRows = parseNotesToRows('Line Step Assy', report.prod_step_assy_notes);
            table3Body.push(...stepAssyRows);

            const bukaCapRows = parseNotesToRows('Line Buka Cap', report.prod_buka_cap_notes);
            table3Body.push(...bukaCapRows);
            
            // MODIFIKASI: Ganti Verifikasi statis jadi dinamis
            const verifikasiRows = parseNotesToRows('Line Verifikasi', report.prod_verifikasi_notes);
            table3Body.push(...verifikasiRows);

            // ================== MODIFIKASI PDF DI SINI ==================
            // Data Check (3 baris baru)
            table3Body.push([
                { content: 'Check Thickness', styles: { fontStyle: 'bold', valign: 'top' } },
                { content: report.check_thickness_notes || '(Kosong)', colSpan: 2 } 
            ]);
            table3Body.push([
                { content: 'Check Adhesive Delivery', styles: { fontStyle: 'bold', valign: 'top' } },
                { content: report.check_adhesive_delivery_notes || '(Kosong)', colSpan: 2 } 
            ]);
            table3Body.push([
                { content: 'Check Adhesive Assy', styles: { fontStyle: 'bold', valign: 'top' } },
                { content: report.check_adhesive_assy_notes || '(Kosong)', colSpan: 2 } 
            ]);
            // ================ AKHIR MODIFIKASI PDF ================
            
            // 2. Gambar Tabel Kanan
            doc.autoTable({
                startY: table2StartY, 
                head: [['PRODUKSI', 'Item', 'Jumlah']], 
                body: table3Body, 
                ...tableStyles,
                margin: { left: table3MarginLeft }, 
                
                columnStyles: { 
                    0: { cellWidth: 35, fontStyle: 'bold' },     
                    1: { cellWidth: tableWidth - 35 - 20 }, 
                    2: { cellWidth: 20, halign: 'center' }   
                } 
            });
            
            let table3FinalY = doc.autoTable.previous.finalY;
            
            // ===========================================
            //         AKHIR MODIFIKASI LAYOUT
            // ===========================================
            
            // Footer
            let finalY = Math.max(table2FinalY, table3FinalY) + 20; 
            
            if (finalY > 300) { 
                doc.addPage(); 
                finalY = 20; 
            } 
            
            const preparerName = currentKaryawan ? currentKaryawan.nama_lengkap : (currentUser ? currentUser.email : 'N/A');
            const preparerJabatan = (currentKaryawan && currentKaryawan.jabatan) || '( Jabatan )'; 
            
            doc.setFontSize(10);
            doc.text("Dibuat,", 20, finalY); 
            doc.text(preparerName, 20, finalY + 20); 
            doc.text(preparerJabatan, 20, finalY + 25); 
            
            doc.text("Disetujui,", 105, finalY, { align: 'center' }); 
            const chiefName = report.chief_name || '( .......................... )'; 
            doc.text(chiefName, 105, finalY + 20, { align: 'center' }); 
            doc.text("Chief", 105, finalY + 25, { align: 'center' });
            
            doc.text("Mengetahui,", 190, finalY, { align: 'right' }); 
            doc.text("SINGGIH E W", 190, finalY + 20, { align: 'right' }); 
            doc.text("Dept Head", 190, finalY + 25, { align: 'right' });

            doc.save(`Laporan_Incoming_${report.tanggal}_Shift${report.shift}.pdf`);
        } catch (error) {
            alert(`Gagal membuat PDF: ${error.message}`);
            console.error('PDF Generation Error:', error);
        }
    }

    /**
     * FUNGSI: Memuat draft laporan
     */
    async function loadIncomingDrafts() {
        if (!draftListEl) return;
        draftListEl.innerHTML = '<tr><td colspan="4">Memuat draft...</td></tr>';
        
        const { data, error } = await _supabase
            .from('laporan_incoming') 
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
     * Fungsi: Memuat riwayat laporan
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
            .from('laporan_incoming')
            .select('*')
            .eq('id', reportId)
            .single();

        if (error) {
            alert('Gagal memuat data laporan: ' + error.message);
            formMessageEl.textContent = '';
            return;
        }

        // Header
        document.getElementById('hari').value = report.hari;
        document.getElementById('tanggal').value = report.tanggal;
        document.getElementById('shift').value = report.shift;
        document.getElementById('chief_name').value = report.chief_name;
        
        // Absensi
        document.getElementById('abs_incoming_masuk').value = report.absensi_incoming_masuk;
        document.getElementById('abs_incoming_tdk_masuk_org').value = report.absensi_incoming_tdk_masuk_org;
        document.getElementById('abs_incoming_tdk_masuk_nama').value = report.absensi_incoming_tdk_masuk_nama;
        document.getElementById('abs_step_assy_masuk').value = report.absensi_step_assy_masuk;
        document.getElementById('abs_step_assy_tdk_masuk_org').value = report.absensi_step_assy_tdk_masuk_org;
        document.getElementById('abs_step_assy_tdk_masuk_nama').value = report.absensi_step_assy_tdk_masuk_nama;
        document.getElementById('abs_buka_cap_masuk').value = report.absensi_buka_cap_masuk;
        document.getElementById('abs_buka_cap_tdk_masuk_org').value = report.absensi_buka_cap_tdk_masuk_org;
        document.getElementById('abs_buka_cap_tdk_masuk_nama').value = report.absensi_buka_cap_tdk_masuk_nama;
        document.getElementById('abs_chrom_masuk').value = report.absensi_chrom_masuk;
        document.getElementById('abs_chrom_tdk_masuk_org').value = report.absensi_chrom_tdk_masuk_org;
        document.getElementById('abs_chrom_tdk_masuk_nama').value = report.absensi_chrom_tdk_masuk_nama;
        document.getElementById('abs_remover_masuk').value = report.absensi_remover_masuk;
        document.getElementById('abs_remover_tdk_masuk_org').value = report.absensi_remover_tdk_masuk_org;
        document.getElementById('abs_remover_tdk_masuk_nama').value = report.absensi_remover_tdk_masuk_nama;
        document.getElementById('abs_touch_up_aerox_masuk').value = report.absensi_touch_up_aerox_masuk;
        document.getElementById('abs_touch_up_aerox_tdk_masuk_org').value = report.absensi_touch_up_aerox_tdk_masuk_org;
        document.getElementById('abs_touch_up_aerox_tdk_masuk_nama').value = report.absensi_touch_up_aerox_tdk_masuk_nama;
        document.getElementById('abs_verifikasi_masuk').value = report.absensi_verifikasi_masuk;
        document.getElementById('abs_verifikasi_tdk_masuk_org').value = report.absensi_verifikasi_tdk_masuk_org;
        document.getElementById('abs_verifikasi_tdk_masuk_nama').value = report.absensi_verifikasi_tdk_masuk_nama;
        
        // Produksi Incoming
        document.getElementById('prod_wuster').value = report.prod_wuster;
        document.getElementById('prod_chrom').value = report.prod_chrom;
        
        // Produksi Line Chrom
        if (document.getElementById('prod_chrom_machining')) { 
            document.getElementById('prod_chrom_machining').value = report.prod_chrom_machining;
            document.getElementById('prod_chrom_finishing').value = report.prod_chrom_finishing;
            document.getElementById('prod_chrom_remover').value = report.prod_chrom_remover;
        }
        
        // Quality
        document.getElementById('quality_item').value = report.quality_item;
        document.getElementById('quality_cek').value = report.quality_cek;
        document.getElementById('quality_ng').value = report.quality_ng;
        document.getElementById('quality_balik_material').value = report.quality_balik_material;
        
        // ================== MODIFIKASI LOAD DI SINI ==================
        // Textareas
        document.getElementById('check_thickness_notes').value = report.check_thickness_notes;
        document.getElementById('check_adhesive_delivery_notes').value = report.check_adhesive_delivery_notes; // TAMBAHAN
        document.getElementById('check_adhesive_assy_notes').value = report.check_adhesive_assy_notes; // TAMBAHAN
        // ================ AKHIR MODIFIKASI LOAD ================

        // Isi dynamic lists
        deserializeDynamicList(stepAssyListContainer, 'step-assy-item-name', 'step-assy-item-value', report.prod_step_assy_notes, defaultStepAssyItems);
        deserializeDynamicList(bukaCapListContainer, 'buka-cap-item-name', 'buka-cap-item-value', report.prod_buka_cap_notes, defaultBukaCapItems);
        deserializeDynamicList(removerListContainer, 'remover-item-name', 'remover-item-value', report.prod_remover_notes, defaultRemoverItems); 
        deserializeDynamicList(touchUpAeroxListContainer, 'touchup-aerox-item-name', 'touchup-aerox-item-value', report.prod_touchup_notes, defaultTouchUpAeroxItems); 
        deserializeDynamicList(verifikasiListContainer, 'verifikasi-item-name', 'verifikasi-item-value', report.prod_verifikasi_notes, defaultVerifikasiItems); // TAMBAHAN

        // Hitung ulang semua total
        calculateAllDynamicTotals();
        updateProdChromTotal(); 
        
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
     * FUNGSI: Mengosongkan form dan mereset state
     */
    function resetFormAndState() {
        incomingForm.reset(); 
        currentlyEditingId = null; 

        // Reset semua list dinamis ke default
        resetDynamicList(stepAssyListContainer, defaultStepAssyItems, 'step-assy-item-name', 'step-assy-item-value');
        resetDynamicList(bukaCapListContainer, defaultBukaCapItems, 'buka-cap-item-name', 'buka-cap-item-value');
        resetDynamicList(removerListContainer, defaultRemoverItems, 'remover-item-name', 'remover-item-value'); 
        resetDynamicList(touchUpAeroxListContainer, defaultTouchUpAeroxItems, 'touchup-aerox-item-name', 'touchup-aerox-item-value'); 
        resetDynamicList(verifikasiListContainer, defaultVerifikasiItems, 'verifikasi-item-name', 'verifikasi-item-value'); // TAMBAHAN
        
        // Hitung ulang semua total (jadi 0)
        calculateAllDynamicTotals();
        updateProdChromTotal(); 
        
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
     * FUNGSI: Mengumpulkan semua data form ke 1 objek
     */
    function getFormData() {
        return {
            user_id: currentUser.id,
            hari: document.getElementById('hari').value,
            tanggal: document.getElementById('tanggal').value,
            shift: parseInt(document.getElementById('shift').value), 
            chief_name: document.getElementById('chief_name').value,
            
            // Absensi
            absensi_incoming_masuk: parseInt(document.getElementById('abs_incoming_masuk').value) || 0,
            absensi_incoming_tdk_masuk_org: parseInt(document.getElementById('abs_incoming_tdk_masuk_org').value) || 0,
            absensi_incoming_tdk_masuk_nama: document.getElementById('abs_incoming_tdk_masuk_nama').value,
            absensi_step_assy_masuk: parseInt(document.getElementById('abs_step_assy_masuk').value) || 0,
            absensi_step_assy_tdk_masuk_org: parseInt(document.getElementById('abs_step_assy_tdk_masuk_org').value) || 0,
            absensi_step_assy_tdk_masuk_nama: document.getElementById('abs_step_assy_tdk_masuk_nama').value,
            absensi_buka_cap_masuk: parseInt(document.getElementById('abs_buka_cap_masuk').value) || 0,
            absensi_buka_cap_tdk_masuk_org: parseInt(document.getElementById('abs_buka_cap_tdk_masuk_org').value) || 0,
            absensi_buka_cap_tdk_masuk_nama: document.getElementById('abs_buka_cap_tdk_masuk_nama').value,
            absensi_chrom_masuk: parseInt(document.getElementById('abs_chrom_masuk').value) || 0,
            absensi_chrom_tdk_masuk_org: parseInt(document.getElementById('abs_chrom_tdk_masuk_org').value) || 0,
            absensi_chrom_tdk_masuk_nama: document.getElementById('abs_chrom_tdk_masuk_nama').value,
            absensi_remover_masuk: parseInt(document.getElementById('abs_remover_masuk').value) || 0,
            absensi_remover_tdk_masuk_org: parseInt(document.getElementById('abs_remover_tdk_masuk_org').value) || 0,
            absensi_remover_tdk_masuk_nama: document.getElementById('abs_remover_tdk_masuk_nama').value,
            absensi_touch_up_aerox_masuk: parseInt(document.getElementById('abs_touch_up_aerox_masuk').value) || 0,
            absensi_touch_up_aerox_tdk_masuk_org: parseInt(document.getElementById('abs_touch_up_aerox_tdk_masuk_org').value) || 0,
            absensi_touch_up_aerox_tdk_masuk_nama: document.getElementById('abs_touch_up_aerox_tdk_masuk_nama').value,
            absensi_verifikasi_masuk: parseInt(document.getElementById('abs_verifikasi_masuk').value) || 0,
            absensi_verifikasi_tdk_masuk_org: parseInt(document.getElementById('abs_verifikasi_tdk_masuk_org').value) || 0,
            absensi_verifikasi_tdk_masuk_nama: document.getElementById('abs_verifikasi_tdk_masuk_nama').value,
            
            // Prod Incoming
            prod_wuster: document.getElementById('prod_wuster').value,
            prod_chrom: document.getElementById('prod_chrom').value,
            
            // Prod Line Chrom
            prod_chrom_machining: parseInt(document.getElementById('prod_chrom_machining').value) || 0,
            prod_chrom_finishing: parseInt(document.getElementById('prod_chrom_finishing').value) || 0,
            prod_chrom_remover: parseInt(document.getElementById('prod_chrom_remover').value) || 0,
            prod_chrom_total: parseInt(document.getElementById('prod_chrom_total').value) || 0,
            
            // Quality
            quality_item: document.getElementById('quality_item').value,
            quality_cek: document.getElementById('quality_cek').value,
            quality_ng: document.getElementById('quality_ng').value,
            quality_balik_material: document.getElementById('quality_balik_material').value,
            
            // Serialisasi list dinamis
            prod_step_assy_notes: serializeDynamicList(stepAssyListContainer, 'step-assy-item-name', 'step-assy-item-value'),
            prod_buka_cap_notes: serializeDynamicList(bukaCapListContainer, 'buka-cap-item-name', 'buka-cap-item-value'),
            prod_remover_notes: serializeDynamicList(removerListContainer, 'remover-item-name', 'remover-item-value'), 
            prod_touchup_notes: serializeDynamicList(touchUpAeroxListContainer, 'touchup-aerox-item-name', 'touchup-aerox-item-value'), 
            prod_verifikasi_notes: serializeDynamicList(verifikasiListContainer, 'verifikasi-item-name', 'verifikasi-item-value'), // TAMBAHAN

            // ================== MODIFIKASI SIMPAN DI SINI ==================
            // Textareas
            check_thickness_notes: document.getElementById('check_thickness_notes').value,
            check_adhesive_delivery_notes: document.getElementById('check_adhesive_delivery_notes').value, // TAMBAHAN
            check_adhesive_assy_notes: document.getElementById('check_adhesive_assy_notes').value // TAMBAHAN
            // ================ AKHIR MODIFIKASI SIMPAN ================
        };
    }

    /**
     * FUNGSI: Logika submit yang di-refactor
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
            resetFormAndState(); 
            
            await loadIncomingDrafts(); 
            currentPage = 1; 
            await loadIncomingHistory(); 
            
            setTimeout(() => { formMessageEl.textContent = ''; }, 3000);
        }
    }

    // Event listener "Simpan Laporan Final" (submit utama)
    incomingForm.onsubmit = async (event) => {
        event.preventDefault();
        await handleFormSubmit(false); 
    };

    // Event listener "Simpan Draft"
    saveDraftBtn.addEventListener('click', async () => {
        await handleFormSubmit(true); 
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
            await loadIncomingDrafts();
            await loadIncomingHistory(); 
        } catch (error) {
            console.error("Gagal memuat data:", error);
            if (historyListEl) historyListEl.innerHTML = `<tr><td colspan="5" style="color: red;">Gagal memuat riwayat.</td></tr>`;
            if (draftListEl) draftListEl.innerHTML = `<tr><td colspan="4" style="color: red;">Gagal memuat draft.</td></tr>`;
        }
    })();
});