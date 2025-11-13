// Variabel Global
let fullLogData = [];
let currentPage = 1;
const rowsPerPage = 20;
let showAll = false;
let monthChoices = null; // Variabel BARU untuk Choices.js Bulan
let peopleChoices = null; // Variabel untuk Choices.js People
Chart.register(ChartDataLabels);

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Fungsi Utama
async function initializeDashboard() {
    // Pindahkan listener ke sini agar baru aktif setelah DOM siap
    document.getElementById('monthFilter').addEventListener('change', loadDashboardData);
    document.getElementById('peopleFilter').addEventListener('change', loadDashboardData);
    document.getElementById('downloadCsvButton').addEventListener('click', exportToCSV);
    document.getElementById('downloadChartButton').addEventListener('click', downloadChartImage);
    document.getElementById('prevPageButton').addEventListener('click', () => {
        if (currentPage > 1) { currentPage--; displayLogPage(); }
    });
    document.getElementById('nextPageButton').addEventListener('click', () => {
        const totalPages = Math.ceil(fullLogData.length / rowsPerPage);
        if (currentPage < totalPages) { currentPage++; displayLogPage(); }
    });
    document.getElementById('togglePaginationButton').addEventListener('click', () => {
        showAll = !showAll;
        const button = document.getElementById('togglePaginationButton');
        button.textContent = showAll ? "Tampilkan Halaman" : "Tampilkan Semua";
        if (!showAll) currentPage = 1;
        displayLogPage();
    });

    populateMonthFilter(); // Sudah termasuk init Choices.js
    await populatePeopleFilter(); // Sudah termasuk init Choices.js
    await loadDashboardData();
}

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

    console.log("Memulai 'looping' untuk mengambil semua data (laporan harian)...");

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


function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthText = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        const option = document.createElement('option');
        option.value = monthValue;
        option.textContent = monthText;
        monthFilter.appendChild(option);
    }
    
    // Inisialisasi Choices.js untuk filter Bulan
    if (monthChoices) monthChoices.destroy();
    monthChoices = new Choices(monthFilter, {
        searchEnabled: false, 
        itemSelectText: 'Tekan untuk memilih',
        allowHTML: false,
        shouldSort: false, 
    });
}

async function populatePeopleFilter() {
    const peopleFilter = document.getElementById('peopleFilter');
    
    const { data, error } = await _supabase
        .from('master_people')
        .select('nama')
        .order('nama', { ascending: true });

    if (error || !data) {
        console.error("Gagal mengambil daftar people:", error);
        return;
    }

    peopleFilter.innerHTML = '<option value="">Semua People</option>';
    data.forEach(person => {
        const option = document.createElement('option');
        option.value = person.nama;
        option.textContent = person.nama;
        peopleFilter.appendChild(option);
    });
    
    if (peopleChoices) peopleChoices.destroy();
    
    peopleChoices = new Choices(peopleFilter, {
        searchEnabled: true,
        itemSelectText: 'Tekan untuk memilih',
        allowHTML: false,
        placeholder: true,
        placeholderValue: 'Cari atau pilih nama...',
        removeItemButton: false, 
    });
    
    peopleChoices.setChoiceByValue('');
}


async function loadDashboardData() {
    // Mengambil nilai dari Choices.js
    const selectedMonth = monthChoices ? monthChoices.getValue(true) : '';
    const selectedPerson = peopleChoices ? peopleChoices.getValue(true) : ''; 
    
    if (!selectedMonth) return; 

    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // 1. Buat query-nya
    let query = _supabase
        .from('hasil_assy_cap')
        .select('*')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true }); // .order() harus di sini

    if (selectedPerson) {
        query = query.eq('people', selectedPerson);
    }

    // =======================================================
    // === PERUBAHAN DI SINI: Menggunakan fungsi looping ===
    // =======================================================
    // const { data, error } = await query; // <-- Kode lama
    const data = await loadAllDataWithPagination(query); // <-- Kode BARU
    // =======================================================

    if (data === null) { // Cek jika 'looping' gagal
        console.error("Gagal memuat data (looping error).");
        return;
    }
    
    fullLogData = data; // data sudah pasti array (bisa kosong) atau null
    currentPage = 1;
    displayLogPage();
    renderChart(data);
}


function displayLogPage() {
    const tableBody = document.getElementById('logTableBody');
    // Urutkan data: Tanggal terbaru di atas
    fullLogData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    
    const dataToDisplay = showAll ? fullLogData : fullLogData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    let html = '';
    dataToDisplay.forEach(item => {
        // Ambil tanggal dari string 'YYYY-MM-DD'
        const tglParts = item.tanggal.split('-');
        // Buat objek Date sebagai UTC untuk menghindari masalah timezone
        const tgl = new Date(Date.UTC(tglParts[0], tglParts[1] - 1, tglParts[2]));
        
        const formattedDate = tgl.toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            timeZone: 'UTC' // Pastikan formatnya konsisten
        });
        
        html += `<tr>
            <td>${formattedDate}</td>
            <td>${item.shift}</td>
            <td>${item.part_name}</td>
            <td>${item.part_number}</td>
            <td>${item.qty.toLocaleString('id-ID')}</td>
        </tr>`;
    });
    tableBody.innerHTML = html || '<tr><td colspan="5" style="text-align: center;">Tidak ada data yang cocok.</td></tr>';
    
    // Update kontrol paginasi
    const totalFiltered = fullLogData.length;
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPageButton');
    const nextBtn = document.getElementById('nextPageButton');
    
    if (showAll) {
        pageInfo.textContent = `${totalFiltered} Baris Ditampilkan`;
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        const totalPages = Math.ceil(totalFiltered / rowsPerPage) || 1;
        pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage >= totalPages;
        prevBtn.style.display = 'inline-block';
        nextBtn.style.display = 'inline-block';
    }
}


function renderChart(data) {
    const ctx = document.getElementById('usageChart').getContext('2d');
    
    // Mengambil label teks dari Choices.js
    const monthText = monthChoices ? monthChoices.getValue().label : '';
    const personName = peopleChoices ? peopleChoices.getValue().label : 'Semua People';
    
    document.getElementById('chartTitle').textContent = `Analisis Harian ${personName || 'Semua People'} - ${monthText}`;
    const totalElement = document.getElementById('chartTotal');

    if (window.myDailyChart) window.myDailyChart.destroy();
    
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#333';
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color') || 'rgba(0, 0, 0, 0.1)';

    if (data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Arial, sans-serif";
        ctx.fillStyle = textColor; 
        ctx.textAlign = "center";
        ctx.fillText("Tidak ada data untuk orang ini di bulan terpilih.", ctx.canvas.width / 2, ctx.canvas.height / 2);
        totalElement.textContent = 'Total Hasil: 0 Pcs';
        return;
    }

    const totalQty = data.reduce((sum, item) => sum + item.qty, 0);
    totalElement.textContent = `Total Hasil: ${totalQty.toLocaleString('id-ID')} Pcs`;

    const dailyUsage = new Map();
    data.forEach(item => {
        dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty);
    });

    const labels = [], dailyData = [];
    // Urutkan berdasarkan tanggal
    const sorted = new Map([...dailyUsage.entries()].sort((a, b) => new Date(a[0]) - new Date(b[0])));
    
    sorted.forEach((total, dateKey) => {
        // Proses tanggal dengan cara yang sama seperti di tabel
        const tglParts = dateKey.split('-');
        const tgl = new Date(Date.UTC(tglParts[0], tglParts[1] - 1, tglParts[2]));
        labels.push(tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' }));
        dailyData.push(total);
    });

    window.myDailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { 
                    label: 'Total (Bar)', 
                    data: dailyData, 
                    backgroundColor: 'rgba(75, 192, 192, 0.7)', 
                    order: 1 
                },
                { 
                    label: 'Total (Garis)', 
                    data: dailyData, 
                    type: 'line', 
                    borderColor: '#FFCE56', 
                    tension: 0.3, 
                    order: 0, 
                    datalabels: { display: false } 
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                datalabels: {
                    anchor: 'end', align: 'top', 
                    formatter: (v) => v > 0 ? v.toLocaleString('id-ID') : '',
                    color: textColor, 
                    font: { weight: 'bold' }
                }
            },
            scales: { 
                y: { 
                    beginAtZero: true, 
                    title: { display: true, text: 'Total Kuantitas (Pcs)', color: textColor },
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { display: false }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}


function exportToCSV() {
    const header = "Tanggal,Shift,People,Part Name,Part Number,Qty (Pcs)\r\n";
    let csv = header;
    fullLogData.forEach(item => {
        // Proses tanggal dengan cara yang sama seperti di tabel
        const tglParts = item.tanggal.split('-');
        const tgl = new Date(Date.UTC(tglParts[0], tglParts[1] - 1, tglParts[2]));
        const formattedDate = tgl.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' });
        
        csv += `${formattedDate},${item.shift},"${item.people}","${item.part_name}","${item.part_number}",${item.qty}\r\n`;
    });
    
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + csv));
    
    const monthText = (monthChoices ? monthChoices.getValue().label : '').replace(/ /g, "_");
    const personName = (peopleChoices ? peopleChoices.getValue().label : 'Semua_People') || 'Semua_People';
    
    link.setAttribute("download", `Laporan_Harian_${personName.replace(/ /g, "_")}_${monthText}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function downloadChartImage() {
    const canvas = document.getElementById('usageChart');
    if (!canvas) return;

    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    const newCtx = newCanvas.getContext('2d');
    
    const bgColor = getComputedStyle(document.body).getPropertyValue('--card-bg').trim() || '#FFFFFF';
    newCtx.fillStyle = bgColor;
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    
    newCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.href = newCanvas.toDataURL('image/png');
    
    const monthText = (monthChoices ? monthChoices.getValue().label : '').replace(/ /g, "_");
    const personName = (peopleChoices ? peopleChoices.getValue().label : 'Semua_People') || 'Semua_People';
    
    link.download = `Grafik_Harian_${personName.replace(/ /g, "_")}_${monthText}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}