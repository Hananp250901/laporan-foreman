// Variabel Global
let fullLogData = [];
let currentPage = 1;
const rowsPerPage = 20;
let showAll = false;
let monthChoices = null; 
let peopleChoices = null; 
let masterData = { people: new Map(), parts: new Map() }; // Cache untuk master data
Chart.register(ChartDataLabels);

// Event Listeners
document.addEventListener('DOMContentLoaded', initializeDashboard);

// ==========================================================
// === FUNGSI LOOPING (PAGINASI) ===
// ==========================================================
async function loadAllDataWithPagination(query) {
    let allData = [];
    let from = 0;
    const pageSize = 1000; 
    console.log("Memulai 'looping' untuk mengambil semua data (laporan harian)...");
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
    console.log("Memuat cache master data (people & parts)...");
    
    const peopleQuery = _supabase.from('master_people').select('id, nama');
    const peopleData = await loadAllDataWithPagination(peopleQuery);
    if (peopleData) {
        peopleData.forEach(p => masterData.people.set(p.id, p.nama));
    }
    
    const partsQuery = _supabase.from('master_assy_cap').select('id, nama_part, part_number');
    const partsData = await loadAllDataWithPagination(partsQuery);
    if (partsData) {
        partsData.forEach(p => masterData.parts.set(p.id, { nama_part: p.nama_part, part_number: p.part_number }));
    }
    
    console.log("Cache master data selesai dimuat.");
}


// Fungsi Utama
async function initializeDashboard() {
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

    // Muat master data DULU
    await loadMasterDataCache(); 
    
    populateMonthFilter(); 
    await populatePeopleFilter(); // <-- Diubah jadi 'await'
    await loadDashboardData();
}

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
    
    // Data sudah diambil dari cache
    const data = Array.from(masterData.people.values());
    data.sort(); // Urutkan nama

    if (!data || data.length === 0) {
        console.error("Gagal mengambil daftar people dari cache.");
        return;
    }

    peopleFilter.innerHTML = '<option value="">Semua People</option>';
    data.forEach(personName => {
        const option = document.createElement('option');
        option.value = personName;
        option.textContent = personName;
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
    const selectedMonth = monthChoices ? monthChoices.getValue(true) : '';
    const selectedPersonName = peopleChoices ? peopleChoices.getValue(true) : ''; 
    
    if (!selectedMonth) return; 

    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    // =======================================================
    // === PERUBAHAN DI SINI: Query ke production_log ===
    // =======================================================
    let query = _supabase
        .from('production_log') // <-- NAMA TABEL DIGANTI
        .select(`
            id, tanggal, shift, person_id, part_id,
            qty_jam_1, qty_jam_2, qty_jam_3, 
            qty_jam_4, qty_jam_5, qty_jam_6, 
            qty_jam_7, qty_jam_8, qty_jam_9
        `)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true }); 
    
    // Filter berdasarkan NAMA orang, bukan ID
    // (Kita harus cari ID orangnya dulu dari cache)
    if (selectedPersonName) {
        let personId = null;
        for (const [id, nama] of masterData.people.entries()) {
            if (nama === selectedPersonName) {
                personId = id;
                break;
            }
        }
        if (personId) {
            query = query.eq('person_id', personId);
        } else {
             console.warn(`Nama ${selectedPersonName} tidak ditemukan ID-nya.`);
             query = query.eq('person_id', -1); // Paksa tidak ada data
        }
    }
    
    const data = await loadAllDataWithPagination(query); // <-- Pakai looping
    // =======================================================

    if (data === null) {
        console.error("Gagal memuat data (looping error).");
        return;
    }

    // =======================================================
    // === PERUBAHAN DI SINI: Mapping data mentah ===
    // =======================================================
    fullLogData = data.map(item => {
        // 1. Hitung total qty
        const totalQty = (item.qty_jam_1 || 0) + (item.qty_jam_2 || 0) + (item.qty_jam_3 || 0) +
                         (item.qty_jam_4 || 0) + (item.qty_jam_5 || 0) + (item.qty_jam_6 || 0) +
                         (item.qty_jam_7 || 0) + (item.qty_jam_8 || 0) + (item.qty_jam_9 || 0);
        
        // 2. Ambil nama/part dari cache
        const personName = masterData.people.get(item.person_id) || 'Nama Hilang';
        const partInfo = masterData.parts.get(item.part_id) || { nama_part: 'Part Hilang', part_number: 'N/A' };
        
        // 3. Kembalikan data yang sudah "matang"
        return {
            id: item.id,
            tanggal: item.tanggal,
            shift: item.shift,
            people: personName,
            part_name: partInfo.nama_part,
            part_number: partInfo.part_number,
            qty: totalQty
        };
    });
    // =======================================================
    
    currentPage = 1;
    displayLogPage();
    renderChart(fullLogData); // Kirim data yang sudah di-map
}


function displayLogPage() {
    const tableBody = document.getElementById('logTableBody');
    
    // Data sudah di-map, tinggal di-sort
    fullLogData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal) || a.shift - b.shift);
    
    const dataToDisplay = showAll ? fullLogData : fullLogData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    let html = '';
    dataToDisplay.forEach(item => {
        // item.tanggal sudah pasti ada
        const tglParts = item.tanggal.split('-');
        const tgl = new Date(Date.UTC(tglParts[0], tglParts[1] - 1, tglParts[2]));
        const formattedDate = tgl.toLocaleDateString('id-ID', { 
            day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
        });
        
        // Data sudah matang
        html += `<tr>
            <td>${formattedDate}</td>
            <td>${item.shift}</td>
            <td>${item.part_name}</td>
            <td>${item.part_number}</td>
            <td>${item.qty.toLocaleString('id-ID')}</td>
        </tr>`;
    });
    // Perbaiki colspan jadi 5 (karena kolom people tidak ada lagi di tabel ini)
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

    // Data untuk chart (data sudah di-map)
    const dailyUsage = new Map();
    data.forEach(item => {
        dailyUsage.set(item.tanggal, (dailyUsage.get(item.tanggal) || 0) + item.qty);
    });

    const labels = [], dailyData = [];
    const sorted = new Map([...dailyUsage.entries()].sort((a, b) => new Date(a[0]) - new Date(b[0])));
    
    sorted.forEach((total, dateKey) => {
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
                legend: {
                    labels: { color: textColor }
                },
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
    
    // Data sudah matang
    fullLogData.forEach(item => {
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