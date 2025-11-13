// ==========================================================
// KODE FINAL DAN LENGKAP - dashboard-assy-cap.js
// (Perbaikan 1000 Baris "Looping" + Timezone + Realtime + PERBAIKAN TYPO)
// (Ver_2 - Menggunakan _supabase dari app.js)
// ==========================================================

// Variabel Global
let fullLogData = [];
let filteredData = []; // Data yang sudah difilter untuk ditampilkan
let currentPage = 1;
const rowsPerPage = 10;
let showAll = false;
let dailyChart;

// Event Listeners Utama
document.addEventListener('DOMContentLoaded', initializeDashboard);

// ==========================================================
// --- FUNGSI BARU UNTUK "LOOPING" (PAGINASI) ---
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

    console.log("Memulai 'looping' untuk mengambil semua data...");

    while (true) {
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
// --- AKHIR FUNGSI BARU ---
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

    // Inisialisasi data dan modal
    await populateMonthFilter();
    await loadDashboardData();
    await populateSelectOptionsForModal();
    setupEditModalListeners();

    // Listener Realtime
    console.log("Menyiapkan listener realtime Supabase...");
    // ==========================================================
    // --- PERBAIKAN VARIABEL ---
    // ==========================================================
    const channel = _supabase.channel('public:hasil_assy_cap') 
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hasil_assy_cap' },
        (payload) => {
          console.log('Perubahan database terdeteksi!', payload);
          const selectedMonth = document.getElementById('monthFilter').value;
          
          const data = payload.new ? payload.new : (payload.old ? payload.old : {});
          const dateOfChange = data.tanggal;

          if (dateOfChange) {
            const changedMonthKey = dateOfChange.substring(0, 7); // '2025-10'
            
            if (changedMonthKey === selectedMonth) {
              console.log('Data di bulan aktif berubah. Memuat ulang data...');
              loadDashboardData();
            }

            const monthFilter = document.getElementById('monthFilter');
            let found = false;
            for (let i = 0; i < monthFilter.options.length; i++) {
              if (monthFilter.options[i].value === changedMonthKey) {
                found = true;
                break;
              }
            }
            
            if (!found) {
              console.log('Bulan baru terdeteksi. Memuat ulang filter bulan...');
              populateMonthFilter(); 
            }
            
          } else {
            console.log('Perubahan tidak terdeteksi tanggalnya, memuat ulang data...');
            loadDashboardData();
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Berhasil terhubung ke Realtime Supabase untuk tabel hasil_assy_cap!');
        } else {
          console.log('Koneksi realtime Supabase gagal. Status:', status);
        }
      });
}

async function populateMonthFilter() {
    const monthFilter = document.getElementById('monthFilter');
    const currentValue = monthFilter.value;
    monthFilter.innerHTML = '<option value="">Memuat...</option>';
    
    // ==========================================================
    // --- PERBAIKAN VARIABEL (Ini yang error di gambar Anda) ---
    // ==========================================================
    // 1. Buat query
    const query = _supabase.from('hasil_assy_cap').select('tanggal'); 
    // 2. Gunakan "looping" untuk mengambil SEMUA tanggal
    const data = await loadAllDataWithPagination(query);
    // --- AKHIR PERBAIKAN ---

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

    // ==========================================================
    // --- PERBAIKAN VARIABEL ---
    // ==========================================================
    // 1. Buat query
    const query = _supabase.from('hasil_assy_cap')
        .select('*')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
    
    // 2. Gunakan "looping" untuk mengambil SEMUA data di bulan ini
    const data = await loadAllDataWithPagination(query);
    // --- AKHIR PERBAIKAN ---
    
    if (data === null) { // Cek jika 'looping' gagal
        console.error("Gagal memuat data dashboard.");
        return;
    }
    
    fullLogData = data || [];
    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    const filters = {};
    document.querySelectorAll('.table-filter-input').forEach(input => {
        filters[input.dataset.filter] = input.value.toLowerCase();
    });

    filteredData = fullLogData.filter(item => {
        return Object.keys(filters).every(key => {
            const itemValue = String(item[key] || '').toLowerCase();
            return itemValue.includes(filters[key]);
        });
    });
    
    currentPage = 1;
    renderTable();
    renderChart(filteredData);
}

/**
 * Mem-parsing string 'YYYY-MM-DD' dengan aman sebagai tanggal LOKAL.
 */
function parseLocalDate(dateString) {
    const parts = dateString.split('-');
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function renderTable() {
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
                <button class="action-btn edit-btn" onclick="editLog(${item.id})">Edit</button>
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
    const totalQty = data.reduce((sum, item) => sum + item.qty, 0);
    totalElement.textContent = `Total Hasil Bulan Ini: ${totalQty.toLocaleString('id-ID')} Pcs`;

    if (!data || data.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }

    const usageByDate = new Map();
    data.forEach(item => {
        if (!usageByDate.has(item.tanggal)) usageByDate.set(item.tanggal, { '1': 0, '2': 0, '3': 0 });
        const dailyRecord = usageByDate.get(item.tanggal);
        dailyRecord[item.shift] = (dailyRecord[item.shift] || 0) + item.qty;
    });

    const sortedDates = Array.from(usageByDate.keys()).sort((a, b) => parseLocalDate(a) - parseLocalDate(b));
    
    const labels = sortedDates.map(dateKey => {
        const tgl = parseLocalDate(dateKey); // Gunakan parser yang aman
        return tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    });
    
    const shift1Data = sortedDates.map(date => usageByDate.get(date)['1'] || 0);
    const shift2Data = sortedDates.map(date => usageByDate.get(date)['2'] || 0);
    const shift3Data = sortedDates.map(date => usageByDate.get(date)['3'] || 0);
    const totalData = sortedDates.map(date => (usageByDate.get(date)['1'] || 0) + (usageByDate.get(date)['2'] || 0) + (usageByDate.get(date)['3'] || 0));

    dailyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Shift 1', data: shift1Data, backgroundColor: '#36A2EB' },
                { label: 'Shift 2', data: shift2Data, backgroundColor: '#FFCE56' },
                { label: 'Shift 3', data: shift3Data, backgroundColor: '#4BC0C0' },
                { type: 'line', label: 'Total Harian', data: totalData, borderColor: '#e74c3c', tension: 0.1, order: -1 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                datalabels: {
                    display: (context) => context.dataset.data[context.dataIndex] > 0,
                    formatter: (value) => value.toLocaleString('id-ID'),
                    anchor: (context) => context.dataset.type === 'line' ? 'end' : 'center',
                    align: (context) => context.dataset.type === 'line' ? 'top' : 'center',
                    color: (context) => context.dataset.type === 'line' ? '#333' : '#ffffff',
                    offset: -10, font: { weight: 'bold' }
                }
            },
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Total Kuantitas (Pcs)' } } }
        },
        plugins: [ChartDataLabels]
    });
}

function updatePaginationControls() {
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
    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    if (direction === 1 && currentPage < totalPages) currentPage++;
    else if (direction === -1 && currentPage > 1) currentPage--;
    renderTable();
}

function exportToCSV() {
    const data = filteredData;
    let csv = "Tanggal,Shift,People,Part Name,Part Number,Qty (Pcs)\r\n";
    data.forEach(item => {
        const tgl = parseLocalDate(item.tanggal);
        const formattedDate = tgl.toLocaleDateString('id-ID'); // Format CSV standar
        csv += `${formattedDate},${item.shift},"${item.people}","${item.part_name}","${item.part_number}",${item.qty}\r\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text.replace(/ /g, "_");
    link.download = `Laporan_Assy_Cap_${monthText}.csv`;
    link.click();
}

function downloadChartImage() {
    if (!dailyChart) return;
    const canvas = document.getElementById('dailyUsageChart');
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width; newCanvas.height = canvas.height;
    const newCtx = newCanvas.getContext('2d');
    newCtx.fillStyle = '#FFFFFF'; newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
    newCtx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    link.href = newCanvas.toDataURL('image/png');
    const monthText = document.getElementById('monthFilter').options[document.getElementById('monthFilter').selectedIndex].text.replace(/ /g, "_");
    link.download = `Grafik_Harian_Assy_Cap_${monthText}.png`;
    link.click();
}

// ==========================================================
// --- FUNGSI UNTUK EDIT DAN DELETE ---
// ==========================================================
async function populateSelectOptionsForModal() {
    // ==========================================================
    // --- PERBAIKAN VARIABEL ---
    // ==========================================================
    const peopleSelect = document.getElementById('editPeople');
    const { data: peopleData } = await _supabase.from('master_people').select('nama').order('nama');
    if (peopleData) peopleSelect.innerHTML = peopleData.map(p => `<option value="${p.nama}">${p.nama}</option>`).join('');

    const partNameSelect = document.getElementById('editPartName');
    
    // Kita juga harus "looping" di sini jika data master part-nya > 1000
    const query = _supabase.from('hasil_assy_cap').select('part_name, part_number');
    const partData = await loadAllDataWithPagination(query);
    // --- AKHIR PERBAIKAN ---

    if (partData === null) {
        console.error('Gagal ambil data part untuk modal:');
        return;
    }

    const uniqueParts = new Map();
    partData.forEach(p => {
        if (p.part_name && !uniqueParts.has(p.part_name)) {
            uniqueParts.set(p.part_name, p.part_number);
        }
    });

    const sortedParts = Array.from(uniqueParts.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    partNameSelect.innerHTML = sortedParts.map(([partName, partNumber]) => {
        return `<option value="${partName}" data-part-number="${partNumber || ''}">${partName}</option>`;
    }).join('');
    
    partNameSelect.addEventListener('change', function() {
        document.getElementById('editPartNumber').value = this.options[this.selectedIndex].dataset.partNumber || '';
    });
}

function setupEditModalListeners() {
    const modal = document.getElementById('editModal');
    const form = document.getElementById('editForm');
    modal.querySelector('.close-button').addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('cancelButton').addEventListener('click', () => modal.classList.add('hidden'));
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const updatedData = {
            tanggal: document.getElementById('editTanggal').value,
            shift: document.getElementById('editShift').value,
            people: document.getElementById('editPeople').value,
            part_name: document.getElementById('editPartName').value,
            part_number: document.getElementById('editPartNumber').value,
            qty: document.getElementById('editQty').value,
        };
        // ==========================================================
        // --- PERBAIKAN VARIABEL ---
        // ==========================================================
        const { error } = await _supabase.from('hasil_assy_cap').update(updatedData).eq('id', id);
        // --- AKHIR PERBAIKAN ---
        
        // --- INI ADALAH BARIS YANG DIPERBAIKI ---
        if (error) alert('Gagal memperbarui data: ' + error.message);
        // --- AKHIR PERBAIKAN ---
        
        else {
            alert('Data berhasil diperbarui!');
            modal.classList.add('hidden');
            await loadDashboardData();
        }
    });
}

async function editLog(id) {
    // ==========================================================
    // --- PERBAIKAN VARIABEL ---
    // ==========================================================
    const { data, error } = await _supabase.from('hasil_assy_cap').select('*').eq('id', id).single();
    // --- AKHIR PERBAIKAN ---
    
    if (error) { alert('Gagal mengambil data untuk diedit.'); return; }
    document.getElementById('editId').value = data.id;
    document.getElementById('editTanggal').value = data.tanggal;
    document.getElementById('editShift').value = data.shift;
    document.getElementById('editPeople').value = data.people;
    document.getElementById('editPartName').value = data.part_name;
    document.getElementById('editPartNumber').value = data.part_number;
    document.getElementById('editQty').value = data.qty;
    document.getElementById('editModal').classList.remove('hidden');
}

async function deleteLog(id) {
    if (!confirm('Anda yakin ingin menghapus data ini?')) return;
    
    // ==========================================================
    // --- PERBAIKAN VARIABEL ---
    // ==========================================================
    const { error } = await _supabase.from('hasil_assy_cap').delete().eq('id', id);
    // --- AKHIR PERBAIKAN ---

    if (error) alert('Gagal menghapus data: ' + error.message);
    else {
        alert('Data berhasil dihapus.');
        await loadDashboardData();
    }
}

// Membuat fungsi bisa diakses dari HTML onclick
window.editLog = editLog;
window.deleteLog = deleteLog;