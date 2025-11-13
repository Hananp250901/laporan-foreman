// ==========================================================
// KODE FINAL DAN LENGKAP - dashboard-assy-cap.js
// VERSI DATA SINKRON + 4 GRAFIK CHIEF (MODEL WUSTER)
// ==========================================================

// Variabel Global
let fullLogData = [];
let filteredData = []; 
let currentPage = 1;
const rowsPerPage = 10;
let showAll = false;
let dailyChart;
let chiefChartInstances = {}; // <-- Variabel baru untuk 4 chart chief
let masterData = { people: new Map(), parts: new Map() }; 

// Event Listeners Utama
document.addEventListener('DOMContentLoaded', initializeDashboard);

// ==========================================================
// --- FUNGSI LOOPING (PAGINASI) ---
// ==========================================================
async function loadAllDataWithPagination(query) {
    let allData = [];
    let from = 0;
    const pageSize = 1000; 
    console.log("Memulai 'looping' untuk mengambil semua data dashboard...");
    while (true) {
        const { data, error } = await query.range(from, from + pageSize - 1);
        if (error) {
            console.error("Error saat 'looping' data Supabase:", error);
            return null; 
        }
        if (data) {
            allData = allData.concat(data);
        }
        if (!data || data.length < pageSize) {
            break; 
        }
        from += pageSize;
    }
    console.log(`Selesai 'looping', total data diambil: ${allData.length} baris.`);
    return allData;
}
// ==========================================================
// --- AKHIR FUNGSI LOOPING ---
// ==========================================================


async function initializeDashboard() {
    // Listener untuk filter tabel
    document.querySelectorAll('.table-filter-input').forEach(input => {
        input.addEventListener('keyup', applyFiltersAndRender);
    });

    // Listener untuk elemen utama
    document.getElementById('monthFilter').addEventListener('change', loadDashboardData);
    document.getElementById('downloadCsvButton').addEventListener('click', exportToCSV);
    document.getElementById('downloadDailyChartButton').addEventListener('click', downloadChartImage);
    
    // Listener untuk Pagination
    document.getElementById('prevPageButton').addEventListener('click', () => changePage(-1));
    document.getElementById('nextPageButton').addEventListener('click', () => changePage(1));
    document.getElementById('togglePaginationButton').addEventListener('click', () => {
        showAll = !showAll;
        document.getElementById('togglePaginationButton').textContent = showAll ? "Tampilkan Halaman" : "Tampilkan Semua";
        currentPage = 1;
        renderTable();
    });

    // Inisialisasi data
    await populateMonthFilter();
    await loadMasterDataCache(); 
    await loadDashboardData(); 

    // Listener Realtime
    const channel = _supabase.channel('public:production_log')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'production_log' },
        (payload) => {
          console.log('Perubahan database terdeteksi!', payload);
          const selectedMonth = document.getElementById('monthFilter').value;
          const data = payload.new ? payload.new : (payload.old ? payload.old : {});
          const dateOfChange = data.tanggal;

          if (dateOfChange && dateOfChange.substring(0, 7) === selectedMonth) {
              console.log('Data di bulan aktif berubah. Memuat ulang data...');
              loadDashboardData();
          } else if (!dateOfChange) {
              loadDashboardData();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Berhasil terhubung ke Realtime Supabase untuk tabel production_log!');
        }
      });
}

async function loadMasterDataCache() {
    console.log("Memuat cache master data (dengan looping)...");
    
    // Ambil data people (dengan looping)
    const peopleQuery = _supabase.from('master_people').select('id, nama, shift'); 
    const peopleData = await loadAllDataWithPagination(peopleQuery);
    
    if (peopleData) {
        peopleData.forEach(p => masterData.people.set(p.id, { nama: p.nama, shift: p.shift }));
    }
    
    // Ambil data parts (dengan looping)
    const partsQuery = _supabase.from('master_assy_cap').select('id, nama_part, part_number');
    const partsData = await loadAllDataWithPagination(partsQuery);
    
    if (partsData) {
        partsData.forEach(p => masterData.parts.set(p.id, { nama_part: p.nama_part, part_number: p.part_number }));
    }
    
    console.log("Cache master data selesai dimuat.");
}

async function populateMonthFilter() {
    // ... (Tidak ada perubahan di fungsi ini) ...
    const monthFilter = document.getElementById('monthFilter');
    const currentValue = monthFilter.value;
    monthFilter.innerHTML = '<option value="">Memuat...</option>';
    
    const query = _supabase.from('production_log').select('tanggal'); 
    const data = await loadAllDataWithPagination(query);

    if (data === null || !data || data.length === 0) {
        monthFilter.innerHTML = '<option value="">Tidak ada data</option>';
        return;
    }

    const availableMonths = new Set(data.map(item => item.tanggal.substring(0, 7))); 
    monthFilter.innerHTML = '';
    
    const sortedMonths = Array.from(availableMonths).sort((a, b) => new Date(b) - new Date(a));
    
    let latestMonth = '';
    sortedMonths.forEach((monthKey, index) => {
        if (index === 0) latestMonth = monthKey;
        
        const [year, month] = monthKey.split('-');
        const date = new Date(year, month - 1);
        const option = document.createElement('option');
        option.value = monthKey;
        option.textContent = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        monthFilter.appendChild(option);
    });
    
    if (currentValue && availableMonths.has(currentValue)) {
        monthFilter.value = currentValue;
    } else if (latestMonth) {
        monthFilter.value = latestMonth;
    }
}

async function loadDashboardData() {
    const selectedMonth = document.getElementById('monthFilter').value;
    if (!selectedMonth) {
        fullLogData = [];
        applyFiltersAndRender();
        return;
    };

    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const query = _supabase.from('production_log')
        .select(`
            id, tanggal, shift, 
            qty_jam_1, qty_jam_2, qty_jam_3, 
            qty_jam_4, qty_jam_5, qty_jam_6, 
            qty_jam_7, qty_jam_8, qty_jam_9,
            person_id, part_id, chief_name
        `) 
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
    
    const data = await loadAllDataWithPagination(query);
    
    if (data === null) { 
        console.error("Gagal memuat data dashboard.");
        return;
    }
    
    fullLogData = data.map(item => {
        const totalQty = (item.qty_jam_1 || 0) + (item.qty_jam_2 || 0) + (item.qty_jam_3 || 0) +
                         (item.qty_jam_4 || 0) + (item.qty_jam_5 || 0) + (item.qty_jam_6 || 0) +
                         (item.qty_jam_7 || 0) + (item.qty_jam_8 || 0) + (item.qty_jam_9 || 0);
        
        const personInfo = masterData.people.get(item.person_id) || null;
        const partInfo = masterData.parts.get(item.part_id) || { nama_part: 'Part Hilang', part_number: 'N/A' };
        
        let filterGroup = 'unknown'; 
        if (personInfo && personInfo.shift === 'NONSHIFT') {
            filterGroup = 'nonshift';
        } else if (item.chief_name) {
            filterGroup = item.chief_name; 
        }

        return {
            id: item.id,
            tanggal: item.tanggal,
            shift: item.shift,
            people: personInfo ? personInfo.nama : 'Nama Hilang',
            part_name: partInfo.nama_part,
            part_number: partInfo.part_number,
            qty: totalQty,
            filterGroup: filterGroup 
        };
    });
    
    // 1. Terapkan filter (teks) dan render tabel
    applyFiltersAndRender();
    
    // 2. Render chart harian (HANYA difilter oleh filter TEKS)
    renderChart(filteredData);
    
    // ==========================================================
    // === LOGIKA BARU UNTUK 4 GRAFIK CHIEF ===
    // ==========================================================
    // 3. Render 4 chart chief (HANYA difilter oleh BULAN, jadi pakai 'fullLogData')
    
    // Bagi data mentah (fullLogData) menjadi 4 grup
    const dataYanto = fullLogData.filter(d => d.filterGroup === 'YANTO H');
    const dataSubagyo = fullLogData.filter(d => d.filterGroup === 'SUBAGYO');
    const dataSarno = fullLogData.filter(d => d.filterGroup === 'SARNO');
    const dataNonshift = fullLogData.filter(d => d.filterGroup === 'nonshift');

    // Render 4 chart terpisah
    renderWusterStyleChart('chiefChartYanto', dataYanto, 'YANTO H', 'rgb(153, 102, 255)');
    renderWusterStyleChart('chiefChartSubagyo', dataSubagyo, 'SUBAGYO', 'rgb(255, 206, 86)');
    renderWusterStyleChart('chiefChartSarno', dataSarno, 'SARNO', 'rgb(75, 192, 75)');
    renderWusterStyleChart('chiefChartNonshift', dataNonshift, 'NONSHIFT', 'rgba(82, 4, 4, 1)');
    // ==========================================================
}

function applyFiltersAndRender() {
    const filters = {};
    document.querySelectorAll('.table-filter-input').forEach(input => {
        filters[input.dataset.filter] = input.value.toLowerCase();
    });

    // Filter berdasarkan TULISAN di kolom filter
    filteredData = fullLogData.filter(item => {
        return Object.keys(filters).every(key => {
            const itemValue = String(item[key] || '').toLowerCase();
            return itemValue.includes(filters[key]);
        });
    });
    
    currentPage = 1;
    renderTable(); 
    
    // Panggil renderChart dari sini agar chart harian juga ikut terfilter
    renderChart(filteredData);
}


function parseLocalDate(dateString) {
    const parts = dateString.split('-');
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function renderTable() {
    // ... (Tidak ada perubahan di fungsi ini) ...
    const tableBody = document.getElementById('logTableBody');
    filteredData.sort((a, b) => parseLocalDate(b.tanggal) - parseLocalDate(a.tanggal) || a.shift - b.shift);
    const dataToDisplay = showAll ? filteredData : filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    tableBody.innerHTML = dataToDisplay.map(item => {
        const tgl = parseLocalDate(item.tanggal);
        const formattedDate = tgl.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        return `
        <tr>
            <td>${formattedDate}</td>
            <td>${item.shift}</td>
            <td>${item.people}</td>
            <td>${item.part_name}</td>
            <td>${item.part_number}</td>
            <td>${item.qty.toLocaleString('id-ID')}</td>
            <td>
                <button class="action-btn delete-btn" onclick="deleteLog(${item.id})">Delete</button>
            </td>
        </tr>`
    }).join('') || '<tr><td colspan="7">Tidak ada data yang cocok.</td></tr>';
    updatePaginationControls();
}

function renderChart(data) {
    const ctx = document.getElementById('dailyUsageChart').getContext('2d');
    const selectedMonthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex]?.text || 'Bulan';
    document.getElementById('dailyChartTitle').textContent = `Monitoring Hasil Assy Cap - ${selectedMonthText}`;
    const totalElement = document.getElementById('dailyChartTotal');
    if (dailyChart) dailyChart.destroy();
    
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#333';
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color') || 'rgba(0, 0, 0, 0.1)';

    const totalQty = data.reduce((sum, item) => sum + item.qty, 0);
    totalElement.textContent = `Total Hasil (Filter): ${totalQty.toLocaleString('id-ID')} Pcs`;

    if (!data || data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }

    // Agregasi (SHIFT -> CHIEF)
    const usageByDate = new Map();
    data.forEach(item => {
        if (!usageByDate.has(item.tanggal)) {
            usageByDate.set(item.tanggal, { 
                'YANTO H': 0, 
                'SARNO': 0, 
                'SUBAGYO': 0, 
                'nonshift': 0,
                'unknown': 0 
            });
        }
        const dailyRecord = usageByDate.get(item.tanggal);
        
        if (dailyRecord.hasOwnProperty(item.filterGroup)) {
            dailyRecord[item.filterGroup] += item.qty;
        } else {
             dailyRecord['unknown'] += item.qty; 
        }
    });

    const sortedDates = Array.from(usageByDate.keys()).sort((a, b) => parseLocalDate(a) - parseLocalDate(b));
    
    const labels = sortedDates.map(dateKey => {
        const tgl = parseLocalDate(dateKey); 
        return tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    });
    
    // Data series baru
    const yantoData = sortedDates.map(date => usageByDate.get(date)['YANTO H'] || 0);
    const sarnoData = sortedDates.map(date => usageByDate.get(date)['SARNO'] || 0);
    const subagyoData = sortedDates.map(date => usageByDate.get(date)['SUBAGYO'] || 0);
    const nonshiftData = sortedDates.map(date => usageByDate.get(date)['nonshift'] || 0);
    
    const totalData = sortedDates.map(date => 
        (usageByDate.get(date)['YANTO H'] || 0) + 
        (usageByDate.get(date)['SARNO'] || 0) + 
        (usageByDate.get(date)['SUBAGYO'] || 0) +
        (usageByDate.get(date)['nonshift'] || 0) +
        (usageByDate.get(date)['unknown'] || 0)
    );

    dailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            // ==========================================================
            // === PERUBAHAN URUTAN STACK (SESUAI SHIFT) ===
            // ==========================================================
            datasets: [
                // NONSHIFT (Paling Bawah)
                { label: 'NONSHIFT', data: nonshiftData, backgroundColor: 'rgba(82, 4, 4, 1)' },
                // YANTO H (Shift 1)
                { label: 'YANTO H', data: yantoData, backgroundColor: 'rgb(153, 102, 255)' },
                // SARNO (Shift 2)
                { label: 'SARNO', data: sarnoData, backgroundColor: 'rgb(75, 192, 75)' },
                // SUBAGYO (Shift 3 - Paling Atas)
                { label: 'SUBAGYO', data: subagyoData, backgroundColor: 'rgb(255, 206, 86)' },
                
                // Ini garis total hariannya (tetap ada)
                { 
                    type: 'line', 
                    label: 'Total Harian', 
                    data: totalData, 
                    borderColor: '#e74c3c', 
                    tension: 0.1, 
                    order: -1 
                }
            ]
            // ==========================================================
            // === AKHIR PERUBAHAN DATASETS ===
            // ==========================================================
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: textColor 
                    }
                },
                datalabels: {
                    // Tampilkan semua angka (numpuk)
                    display: (context) => context.dataset.data[context.dataIndex] > 0,
                    formatter: (value) => value.toLocaleString('id-ID'),
                    anchor: (context) => context.dataset.type === 'line' ? 'end' : 'center',
                    align: (context) => context.dataset.type === 'line' ? 'top' : 'center',
                    color: (context) => context.dataset.type === 'line' ? textColor : '#ffffff', 
                    offset: (context) => context.dataset.type === 'line' ? -10 : 0, 
                    font: { weight: 'bold' }
                }
            },
            scales: { 
                x: { stacked: true, ticks: { color: textColor }, grid: { color: gridColor } }, 
                y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Pcs)', color: textColor }, ticks: { color: textColor }, grid: { color: gridColor } } 
            }
        },
        plugins: [ChartDataLabels]
    });
}


// ==========================================================
// === FUNGSI BARU UNTUK 4 GRAFIK CHIEF (MODEL WUSTER) ===
// (FUNGSI INI DI-TIMPA/REPLACE)
// ==========================================================
/**
 * Membuat chart harian (model Wuster) untuk satu chief
 * @param {string} canvasId - ID dari elemen <canvas>
 * @param {Array} data - Data yang sudah di-filter untuk chief ini
 * @param {string} chiefName - Nama Chief (cth: "YANTO H")
 * @param {string} color - Warna (cth: "rgba(153, 102, 255, 1)")
 */
function renderWusterStyleChart(canvasId, data, chiefName, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    // Hancurkan chart lama jika ada
    if (chiefChartInstances[canvasId]) {
        chiefChartInstances[canvasId].destroy();
    }
    
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-primary') || '#333';
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color') || 'rgba(0, 0, 0, 0.1)';

    // Olah data: Agregasi per tanggal, per shift
    const usageByDate = new Map();
    data.forEach(item => {
        if (!usageByDate.has(item.tanggal)) usageByDate.set(item.tanggal, { '1': 0, '2': 0, '3': 0 });
        const dailyRecord = usageByDate.get(item.tanggal);
        dailyRecord[item.shift] = (dailyRecord[item.shift] || 0) + item.qty;
    });

    const sortedDates = Array.from(usageByDate.keys()).sort((a, b) => parseLocalDate(a) - parseLocalDate(b));
    
    const labels = sortedDates.map(dateKey => {
        const tgl = parseLocalDate(dateKey); 
        return tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    });
    
    const shift1Data = sortedDates.map(date => usageByDate.get(date)['1'] || 0);
    const shift2Data = sortedDates.map(date => usageByDate.get(date)['2'] || 0);
    const shift3Data = sortedDates.map(date => usageByDate.get(date)['3'] || 0);
    const totalData = sortedDates.map(date => (usageByDate.get(date)['1'] || 0) + (usageByDate.get(date)['2'] || 0) + (usageByDate.get(date)['3'] || 0));

    // Render chart
    chiefChartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                // ==========================================================
                // === PERUBAHAN DI SINI (WARNA STACK DISAMAKAN) ===
                // ==========================================================
                { 
                    label: 'Shift 1', 
                    data: shift1Data, 
                    // Ambil 'color' (warna chief), ganti transparansi jadi 0.9
                    backgroundColor: color.replace('1)', '0.9)') 
                },
                { 
                    label: 'Shift 2', 
                    data: shift2Data, 
                    // Ambil 'color' (warna chief), ganti transparansi jadi 0.7
                    backgroundColor: color.replace('1)', '0.7)') 
                },
                { 
                    label: 'Shift 3', 
                    data: shift3Data, 
                    // Ambil 'color' (warna chief), ganti transparansi jadi 0.5
                    backgroundColor: color.replace('1)', '0.5)') 
                },
                // ==========================================================
                // === AKHIR PERUBAHAN ===
                // ==========================================================
                { 
                    type: 'line', 
                    label: 'Total Harian', 
                    data: totalData, 
                    borderColor: color, // Garis tetap solid
                    tension: 0.1, 
                    order: -1 
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor }
                },
                title: {
                    display: false 
                },
                datalabels: {
                    display: (context) => context.dataset.type === 'line' && context.dataset.data[context.dataIndex] > 0,
                    formatter: (value) => value.toLocaleString('id-ID'),
                    anchor: 'end',
                    align: 'top',
                    color: textColor,
                    offset: -10,
                    font: { weight: 'bold' }
                }
            },
            scales: { 
                x: { stacked: true, ticks: { color: textColor }, grid: { color: gridColor } }, 
                y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Pcs)', color: textColor }, ticks: { color: textColor }, grid: { color: gridColor } } 
            }
        },
        plugins: [ChartDataLabels]
    });
}
// ==========================================================
// === AKHIR FUNGSI BARU ===
// ==========================================================


function updatePaginationControls() {
    // ... (Tidak ada perubahan di fungsi ini) ...
    const totalFiltered = filteredData.length;
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

function changePage(direction) {
    // ... (Tidak ada perubahan di fungsi ini) ...
    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    if (direction === 1 && currentPage < totalPages) currentPage++;
    else if (direction === -1 && currentPage > 1) currentPage--;
    renderTable();
}

function exportToCSV() {
    // ... (Tidak ada perubahan di fungsi ini) ...
    const data = filteredData; 
    let csv = "Tanggal,Shift,People,Part Name,Part Number,Qty (Pcs)\r\n";
    data.forEach(item => {
        const tgl = parseLocalDate(item.tanggal);
        const formattedDate = tgl.toLocaleDateString('id-ID');
        csv += `${formattedDate},${item.shift},"${item.people}","${item.part_name}","${item.part_number}",${item.qty}\r\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text.replace(/ /g, "_");
    link.download = `Laporan_Assy_Cap_${monthText}.csv`;
    link.click();
}

function downloadChartImage() {
    // ... (Tidak ada perubahan di fungsi ini) ...
    if (!dailyChart) return;
    const canvas = document.getElementById('dailyUsageChart');
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width; newCanvas.height = canvas.height;
    const newCtx = newCanvas.getContext('2d');
    
    const bgColor = getComputedStyle(document.body).getPropertyValue('--card-bg').trim() || '#FFFFFF';
    newCtx.fillStyle = bgColor;
    newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    
    newCtx.drawImage(canvas, 0, 0);
    
    const link = document.createElement('a');
    link.href = newCanvas.toDataURL('image/png');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text.replace(/ /g, "_");
    link.download = `Grafik_Harian_Assy_Cap_${monthText}.png`;
    link.click();
}

async function deleteLog(id) {
    // ... (Tidak ada perubahan di fungsi ini) ...
    if (!confirm('Anda yakin ingin menghapus data ini? (Data per jam juga akan hilang)')) return;
    
    const { error } = await _supabase.from('production_log').delete().eq('id', id);

    if (error) alert('Gagal menghapus data: ' + error.message);
    else {
        alert('Data berhasil dihapus.');
        await loadDashboardData(); 
    }
}

window.deleteLog = deleteLog;