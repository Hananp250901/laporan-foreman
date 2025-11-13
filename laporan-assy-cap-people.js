document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMEN DOM ---
    const monthFilter = document.getElementById('monthFilter');
    const totalQtyText = document.getElementById('totalQtyText');
    const chartTitle = document.getElementById('chartTitle');
    const downloadButton = document.getElementById('downloadChartButton');
    const ctx = document.getElementById('byPeopleChart').getContext('2d');
    let byPeopleChart;

    /**
     * Inisialisasi halaman
     */
    const initializePage = () => {
        populateMonthFilter();
        const selectedMonth = monthFilter.value;
        loadReportData(selectedMonth);

        monthFilter.addEventListener('change', () => loadReportData(monthFilter.value));
        downloadButton.addEventListener('click', downloadChart);
    };

    // ==========================================================
    // === FUNGSI BARU UNTUK "LOOPING" (PAGINASI) ===
    // ==========================================================
    /**
     * Mengambil SEMUA data dari query Supabase, mengatasi limit 1000 baris
     * dengan cara "looping" (paginasi).
     * @param {object} query - Query Supabase (cth: _supabase.from('...').select('...'))
     * @returns {Array|null} Array berisi semua data, atau null jika ada error.
     */
    async function loadAllDataWithPagination(query) {
        let allData = [];
        let from = 0;
        const pageSize = 1000; // Ukuran "loop" per request, sesuai limit Supabase

        console.log("Memulai 'looping' untuk mengambil semua data (laporan per people)...");

        while (true) {
            // .range() harus dipanggil di akhir query-nya
            const { data, error } = await query.range(from, from + pageSize - 1);

            if (error) {
                console.error("Error saat 'looping' data Supabase:", error);
                return null; // Kembalikan null jika ada error
            }

            if (data) {
                allData = allData.concat(data);
            }

            // Jika data yang kembali lebih sedikit dari ukuran loop, berarti ini halaman terakhir
            if (!data || data.length < pageSize) {
                break; // Hentikan "looping"
            }

            // Siapkan untuk "loop" berikutnya
            from += pageSize;
        }
        
        console.log(`Selesai 'looping', total data diambil: ${allData.length} baris.`);
        return allData;
    }
    // ==========================================================
    // === AKHIR FUNGSI BARU ===
    // ==========================================================


    /**
     * Mengisi dropdown filter bulan dengan 12 bulan terakhir.
     */
    const populateMonthFilter = () => {
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthText = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
            
            const option = document.createElement('option');
            option.value = monthValue;
            option.textContent = monthText;
            if (i === 0) option.selected = true;
            monthFilter.appendChild(option);
        }
    };

    /**
     * Memuat, mengolah, dan menampilkan data laporan.
     * @param {string} monthYear - Bulan dan tahun (format: YYYY-MM).
     */
    const loadReportData = async (monthYear) => {
        const [year, month] = monthYear.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${lastDay}`;
        
        try {
            // 1. Buat query-nya
            const query = _supabase
                .from('hasil_assy_cap')
                .select('people, qty') 
                .gte('tanggal', startDate)
                .lte('tanggal', endDate);

            // =======================================================
            // === PERUBAHAN DI SINI: Menggunakan fungsi looping ===
            // =======================================================
            // const { data, error } = await _supabase... // <-- Kode lama
            const data = await loadAllDataWithPagination(query); // <-- Kode BARU
            // =======================================================

            if (data === null) { // Cek jika 'looping' gagal
                throw new Error("Gagal mengambil data dari database (looping error).");
            }

            processAndRenderData(data);

        } catch (error) {
            console.error('Error fetching report data:', error.message);
            alert('Gagal memuat data laporan.');
        }
    };

    /**
     * Mengolah data mentah, menghitung total, dan memanggil fungsi render.
     * @param {Array} rawData - Data dari Supabase.
     */
    const processAndRenderData = (rawData) => {
        if (!rawData || rawData.length === 0) {
            totalQtyText.textContent = 'Total Bulan Ini: 0 Pcs';
            if (byPeopleChart) byPeopleChart.destroy();
            return;
        }

        // 1. Agregasi data: jumlahkan qty per 'people'
        const summary = {};
        let grandTotal = 0;
        rawData.forEach(item => {
            // Tambahkan pengecekan untuk data null/kosong
            const person = item.people || 'Tidak Diketahui';
            if (summary[person]) {
                summary[person] += item.qty;
            } else {
                summary[person] = item.qty;
            }
            grandTotal += item.qty;
        });

        // 2. Ubah objek summary menjadi array agar bisa diurutkan
        const summaryArray = Object.keys(summary).map(name => ({
            name: name,
            total: summary[name]
        }));

        // 3. Urutkan array dari total terbesar ke terkecil
        summaryArray.sort((a, b) => b.total - a.total);

        // Update Teks Total
        totalQtyText.textContent = `Total Bulan Ini: ${grandTotal.toLocaleString('id-ID')} Pcs`;

        // Render chart dengan data yang sudah diolah
        renderChart(summaryArray);
    };

    /**
     * Merender diagram batang horizontal.
     * @param {Array} chartData - Data yang sudah diolah dan diurutkan.
     */
    const renderChart = (chartData) => {
        const selectedMonthText = monthFilter.options[monthFilter.selectedIndex].text;
        
        chartTitle.textContent = `Peringkat Hasil Assy cap - ${selectedMonthText}`;

        const labels = chartData.map(item => item.name);
        const data = chartData.map(item => item.total);

        if (byPeopleChart) {
            byPeopleChart.destroy();
        }

        // Mendapatkan warna teks dari CSS Variable (untuk dark mode)
        const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#000';
        const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color') || 'rgba(128, 128, 128, 0.2)';


        byPeopleChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Hasil (Pcs)',
                    data: data,
                    backgroundColor: 'rgba(0, 94, 255, 0.7)',
                    borderColor: 'rgba(0, 94, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Membuat chart jadi horizontal
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        right: 50 // Beri ruang ekstra di kanan untuk datalabels
                    }
                },
                plugins: {
                    legend: {
                        display: false // Sembunyikan legenda
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        formatter: (value) => value.toLocaleString('id-ID'),
                        color: textColor // Gunakan warna teks dari dark mode
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Total Kuantitas (Pcs)',
                            color: textColor // Gunakan warna teks dari dark mode
                        },
                        ticks: {
                            color: textColor // Gunakan warna teks dari dark mode
                        },
                        grid: {
                            color: gridColor // Garis grid abu-abu transparan
                        }
                    },
                    y: {
                        ticks: {
                            color: textColor, // Gunakan warna teks dari dark mode
                            font: {
                                weight: 100
                            }
                        },
                        grid: {
                            display: false // Sembunyikan grid di sumbu Y
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    };

    /**
     * Fungsi untuk mengunduh chart sebagai gambar PNG.
     */
    const downloadChart = () => {
        if (!byPeopleChart) return;
        
        // Buat canvas baru dengan background putih
        const canvas = byPeopleChart.canvas;
        const newCanvas = document.createElement('canvas');
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        const newCtx = newCanvas.getContext('2d');
        
        // Set background (bukan putih, tapi warna background card)
        const bgColor = getComputedStyle(document.body).getPropertyValue('--card-bg').trim() || '#FFFFFF';
        newCtx.fillStyle = bgColor;
        newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
        
        // Gambar chart di atas background
        newCtx.drawImage(canvas, 0, 0);

        // Buat link download
        const link = document.createElement('a');
        const selectedMonthText = monthFilter.options[monthFilter.selectedIndex].text.replace(/\s+/g, '_');
        link.download = `laporan_assy_cap_per_people_${selectedMonthText}.png`;
        link.href = newCanvas.toDataURL('image/png'); // Gunakan canvas baru
        link.click();
    };

    // --- Jalankan Aplikasi ---
    initializePage();
});