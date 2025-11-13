document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMEN DOM ---
    const monthFilter = document.getElementById('monthFilter');
    const totalQtyText = document.getElementById('totalQtyText');
    const chartTitle = document.getElementById('chartTitle');
    const downloadButton = document.getElementById('downloadChartButton');
    const ctx = document.getElementById('byPeopleChart').getContext('2d');
    let byPeopleChart;
    let masterData = { people: new Map() }; // Cache untuk master data

    /**
     * Inisialisasi halaman
     */
    const initializePage = async () => {
        // Muat data master DULU
        await loadMasterDataCache();
        
        populateMonthFilter();
        const selectedMonth = monthFilter.value;
        await loadReportData(selectedMonth);

        monthFilter.addEventListener('change', () => loadReportData(monthFilter.value));
        downloadButton.addEventListener('click', downloadChart);
    };

    // ==========================================================
    // === FUNGSI LOOPING (PAGINASI) ===
    // ==========================================================
    async function loadAllDataWithPagination(query) {
        let allData = [];
        let from = 0;
        const pageSize = 1000; 
        console.log("Memulai 'looping' untuk mengambil semua data (laporan per people)...");
        while (true) {
            const { data, error } = await query.range(from, from + pageSize - 1);
            if (error) {
                console.error("Error saat 'looping' data Supabase:", error);
                return null; 
            }
            if (data) allData = allData.concat(data);
            if (!data || data.length < pageSize) break; 
            from += pageSize;
        }
        console.log(`Selesai 'looping', total data diambil: ${allData.length} baris.`);
        return allData;
    }

    // ==========================================================
    // === FUNGSI MASTER DATA CACHE ===
    // ==========================================================
    async function loadMasterDataCache() {
        console.log("Memuat cache master data people (dengan looping)...");
        const peopleQuery = _supabase.from('master_people').select('id, nama');
        const peopleData = await loadAllDataWithPagination(peopleQuery);
        
        if (peopleData) {
            peopleData.forEach(p => masterData.people.set(p.id, p.nama));
        }
        console.log("Cache master data people selesai dimuat.");
    }


    /**
     * Mengisi dropdown filter bulan dengan 12 bulan terakhir.
     */
    const populateMonthFilter = () => {
        // (Fungsi ini tidak perlu diubah, sudah benar)
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
            // =======================================================
            // === PERUBAHAN DI SINI: Query ke production_log ===
            // =======================================================
            console.log("Mengambil data dari production_log...");
            const query = _supabase
                .from('production_log') // <-- NAMA TABEL DIGANTI
                .select('person_id, qty_jam_1, qty_jam_2, qty_jam_3, qty_jam_4, qty_jam_5, qty_jam_6, qty_jam_7, qty_jam_8, qty_jam_9') // <-- Ambil data rinci
                .gte('tanggal', startDate)
                .lte('tanggal', endDate);
            
            const data = await loadAllDataWithPagination(query); // <-- Pakai looping
            // =======================================================

            if (data === null) {
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
     * @param {Array} rawData - Data dari Supabase (dari production_log).
     */
    const processAndRenderData = (rawData) => {
        if (!rawData || rawData.length === 0) {
            totalQtyText.textContent = 'Total Bulan Ini: 0 Pcs';
            if (byPeopleChart) byPeopleChart.destroy();
            return;
        }

        // =======================================================
        // === PERUBAHAN DI SINI: Logika perhitungan diubah ===
        // =======================================================
        const summary = {};
        let grandTotal = 0;
        
        rawData.forEach(item => {
            // 1. Hitung total qty dari data per jam
            const totalQty = (item.qty_jam_1 || 0) + (item.qty_jam_2 || 0) + (item.qty_jam_3 || 0) +
                             (item.qty_jam_4 || 0) + (item.qty_jam_5 || 0) + (item.qty_jam_6 || 0) +
                             (item.qty_jam_7 || 0) + (item.qty_jam_8 || 0) + (item.qty_jam_9 || 0);
                             
            // 2. Dapatkan nama orang dari cache master data
            const personName = masterData.people.get(item.person_id) || 'Tidak Diketahui';
            
            // 3. Jumlahkan totalnya
            if (summary[personName]) {
                summary[personName] += totalQty;
            } else {
                summary[personName] = totalQty;
            }
            grandTotal += totalQty;
        });
        // =======================================================

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

        // ==========================================================
        // === TAMBAHAN UNTUK TINGGI GRAFIK DINAMIS ===
        // ==========================================================
        const chartWrapper = ctx.canvas.parentElement; 
        const labelsCount = labels.length; 
        const heightPerLabel = 30; // 30px per nama
        const baseHeight = 100; 
        let newHeight = (labelsCount * heightPerLabel) + baseHeight;
        const minHeight = 400; 
        if (newHeight < minHeight) {
            newHeight = minHeight;
        }
        chartWrapper.style.height = `${newHeight}px`;
        // ==========================================================

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
                        right: 50 
                    }
                },
                plugins: {
                    legend: {
                        display: false 
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'end',
                        formatter: (value) => value.toLocaleString('id-ID'),
                        color: textColor 
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Total Kuantitas (Pcs)',
                            color: textColor 
                        },
                        ticks: {
                            color: textColor 
                        },
                        grid: {
                            color: gridColor 
                        }
                    },
                    y: {
                        ticks: {
                            color: textColor, 
                            font: {
                                weight: '500'
                            }
                        },
                        grid: {
                            display: false 
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
        
        const canvas = byPeopleChart.canvas;
        const newCanvas = document.createElement('canvas');
        newCanvas.width = canvas.width;
        newCanvas.height = canvas.height;
        const newCtx = newCanvas.getContext('2d');
        
        const bgColor = getComputedStyle(document.body).getPropertyValue('--card-bg').trim() || '#FFFFFF';
        newCtx.fillStyle = bgColor;
        newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
        
        newCtx.drawImage(canvas, 0, 0);

        const link = document.createElement('a');
        const selectedMonthText = monthFilter.options[monthFilter.selectedIndex].text.replace(/\s+/g, '_');
        link.download = `laporan_assy_cap_per_people_${selectedMonthText}.png`;
        link.href = newCanvas.toDataURL('image/png'); 
        link.click();
    };

    // --- Jalankan Aplikasi ---
    initializePage();
});