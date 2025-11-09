document.addEventListener('DOMContentLoaded', function() {
    
    // Set tanggal hari ini
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggal').value = today;

    // --- PERUBAHAN 1: Definisi Slot Waktu & Target ---
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
    
    // Nilai target 'Start' dan 'End' dari gambar Anda
    const targetValues = {
        '7': [ // 8 slots
            { start: 0, end: 224 },
            { start: 224, end: 448 },
            { start: 448, end: 672 },
            { start: 672, end: 896 },
            { start: 896, end: 1120 },
            { start: 1120, end: 1344 },
            { start: 1344, end: 1568 },
            { start: 1568, end: 1792 }
        ],
        '5': [ // 5 slots (asumsi polanya sama)
            { start: 0, end: 224 },
            { start: 224, end: 448 },
            { start: 448, end: 672 },
            { start: 672, end: 896 },
            { start: 896, end: 1120 }
        ]
    };
    // --- AKHIR PERUBAHAN 1 ---
    
    const jamKerjaEl = document.getElementById('jam-kerja');
    const shiftEl = document.getElementById('shift');
    const productionTable = document.getElementById('production-table').getElementsByTagName('tbody')[0];

    /**
     * Membuat satu sel input di dalam baris
     */
    function createInputCell(row, type = 'number') {
        const cell = row.insertCell();
        const input = document.createElement('input');
        input.type = type;
        input.value = '';
        input.className = 'table-input';
        cell.appendChild(input);
    }

    // --- PERUBAHAN 2: Fungsi populateProductionTable ---
    /**
     * Mengisi ulang seluruh tabel produksi berdasarkan slot dan target
     * @param {string[]} slots - Array berisi string jam (e.g., ['08:00-09:00', ...])
     * @param {object[]} targets - Array berisi objek target (e.g., [{start: 0, end: 224}, ...])
     */
    function populateProductionTable(slots, targets) {
        productionTable.innerHTML = ''; // Kosongkan tabel dulu
        
        slots.forEach((slot, index) => {
            const row = productionTable.insertRow();
            // Ambil data target untuk baris ini
            const target = targets[index] || { start: '', end: '' };
            
            // 0. NO
            let cell = row.insertCell();
            cell.textContent = index + 1;
            
            // 1. Hourly
            cell = row.insertCell();
            cell.textContent = slot;
            
            // --- KOLOM BARU (Teks, bukan input) ---
            // 2. Target Start
            cell = row.insertCell();
            cell.textContent = target.start;
            
            // 3. Target End
            cell = row.insertCell();
            cell.textContent = target.end;
            // --- AKHIR KOLOM BARU ---
            
            // 4. Hange Start (input)
            createInputCell(row, 'number');
            // 5. Hange Finish (input)
            createInputCell(row, 'number');
            // 6. GAP (input)
            createInputCell(row, 'number');
            // 7. ACC. GAP (input)
            createInputCell(row, 'number');
            // 8. FILLED (input)
            createInputCell(row, 'number');
            // 9. ACC. FILLED (input)
            createInputCell(row, 'number');
            // 10. EMPETT (input)
            createInputCell(row, 'number');
            // 11. ACC. EMPETY (input)
            createInputCell(row, 'number');
            // 12. LOSS (input)
            createInputCell(row, 'number');
            // 13. ACC. LOSS (input)
            createInputCell(row, 'number');
            // 14. TROUBLE REASON (input)
            createInputCell(row, 'text');
        });
    }
    // --- AKHIR PERUBAHAN 2 ---

    /**
     * Fungsi utama yang dipanggil saat dropdown berubah
     */
    function updateTableLogic() {
        const jamKerja = jamKerjaEl.value;
        const shift = shiftEl.value;
        
        // Cari slot yang sesuai
        const slotsToUse = timeSlots[jamKerja] ? timeSlots[jamKerja][shift] || [] : [];
        // Ambil juga nilai target yang sesuai
        const targetsToUse = targetValues[jamKerja] || [];
        
        // Panggil fungsi untuk mengisi ulang tabel dengan kedua data
        populateProductionTable(slotsToUse, targetsToUse);
    }
    
    jamKerjaEl.addEventListener('change', updateTableLogic);
    shiftEl.addEventListener('change', updateTableLogic);

    
    // Event listener untuk tombol Simpan Data
    document.getElementById('btn-save').addEventListener('click', function() {
        alert('Data berhasil disimpan!');
    });
    
    // Event listener untuk tombol Generate PDF
    document.getElementById('btn-generate-pdf').addEventListener('click', function() {
        generatePDF();
    });
    
    // --- PERUBAHAN 3: Fungsi generatePDF ---
    function generatePDF() {
        if (!window.jspdf) {
            alert('Gagal memuat library PDF. Pastikan Anda terhubung ke internet.');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        // Judul
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('DEPARTEMENT', 20, 20);
        doc.setFontSize(14);
        doc.text('PAINTING PRODUCTION DAILY CONTROL', 20, 28);
        doc.setFontSize(12);
        doc.text('LOGS TIME & PERFORMANCE MONITORING (OTRAPER)', 20, 34);
        
        // Informasi Umum
        const tanggal = document.getElementById('tanggal').value;
        const shift = document.getElementById('shift').value;
        const jamKerja = document.getElementById('jam-kerja').selectedOptions[0].text;
        const ct = document.getElementById('c-t').value;
        const efisiensi = document.getElementById('efisiensi').value;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Tanggal: ${tanggal}`, 20, 45);
        doc.text(`Jam Kerja: ${jamKerja}`, 60, 45);
        doc.text(`Shift: ${shift}`, 120, 45);
        doc.text(`C/T: ${ct}`, 160, 45);
        doc.text(`Efisiensi: ${efisiensi}`, 190, 45);
        
        // Header PDF diperbarui
        const tableColumn = [
            "NO", "Hourly", "Start", "End", // Kolom target
            "H. Start", "H. Finish", 
            "GAP", "ACC. GAP", "FILLED", "ACC. FILLED", 
            "EMPTY", "ACC. EMPTY", "LOSS", "ACC. LOSS", 
            "TROUBLE REASON"
        ];
        
        const tableRows = [];
        
        // Ambil data dari tabel
        const rows = productionTable.getElementsByTagName('tr');
        for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].getElementsByTagName('td');
            const rowData = [];
            
            // Total kolom sekarang 15
            // 4 kolom pertama adalah teks, 11 sisanya adalah input
            
            rowData.push(cells[0].textContent); // NO
            rowData.push(cells[1].textContent); // Hourly
            rowData.push(cells[2].textContent); // Target Start
            rowData.push(cells[3].textContent); // Target End
            
            // Loop untuk 11 input (dari sel ke-4 sampai ke-14)
            for (let j = 4; j < 15; j++) {
                const input = cells[j].querySelector('input');
                rowData.push(input ? input.value : '');
            }
            tableRows.push(rowData);
        }
        
        // Buat tabel di PDF
        doc.autoTable({
            startY: 50,
            head: [tableColumn],
            body: tableRows,
            theme: 'grid',
            styles: { fontSize: 6, cellPadding: 1 },
            headStyles: { fillColor: [44, 62, 80], fontSize: 6 },
            margin: { left: 10, right: 10 }
        });
        
        // Komentar dan catatan
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Komentar & Catatan:', 20, finalY);
        
        const comment = document.getElementById('comment').value;
        doc.setFont(undefined, 'normal');
        doc.text(comment || '-', 20, finalY + 7);
        
        // Data tambahan (summary grid)
        const logsTime = document.getElementById('logs-time').value;
        const irMt = document.getElementById('ir-mt').value;
        const hanger = document.getElementById('hanger').value;
        const tgrn = document.getElementById('tgrn').value;
        const calcium = document.getElementById('calcium').value;
        const magsTrg = document.getElementById('mags-trg').value;
        const valstar = document.getElementById('valstar').value;
        const hangerIsi = document.getElementById('hanger-isi').value;
        const fres = document.getElementById('fres').value;
        const hangerNosun = document.getElementById('hanger-nosun').value;
        const remp = document.getElementById('remp').value;
        const total = document.getElementById('total').value;
        const ivs = document.getElementById('ivs').value;
        
        doc.text(`Logs Time: ${logsTime}`, 20, finalY + 17);
        doc.text(`IR/Mt: ${irMt}`, 60, finalY + 17);
        doc.text(`Hanger: ${hanger}`, 100, finalY + 17);
        doc.text(`TGRN: ${tgrn}`, 140, finalY + 17);
        doc.text(`Calcium: ${calcium}`, 180, finalY + 17);
        doc.text(`8 - Mags-Trg: ${magsTrg}`, 220, finalY + 17);
        
        doc.text(`Valstar: ${valstar}`, 20, finalY + 24);
        doc.text(`Hanger ISI: ${hangerIsi}`, 60, finalY + 24);
        doc.text(`FRes: ${fres}`, 100, finalY + 24);
        doc.text(`Hanger Nosun: ${hangerNosun}`, 140, finalY + 24);
        doc.text(`REMP: ${remp}`, 180, finalY + 24);
        doc.text(`TOTAL: ${total}`, 220, finalY + 24);
        doc.text(`IVs: ${ivs}`, 20, finalY + 31);
        
        // Simpan PDF
        doc.save(`Laporan_Produksi_${tanggal}_Shift_${shift}.pdf`);
    }
    // --- AKHIR PERUBAHAN 3 ---
});