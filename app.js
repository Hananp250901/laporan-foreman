// =================================================================
// BAGIAN 1: Inisialisasi Klien Supabase
// =================================================================
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co'; // Ganti
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4'; // Ganti
// Inisialisasi klien Supabase
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =================================================================
// BAGIAN 2: FUNGSI GLOBAL & BERSAMA
// =================================================================

async function getActiveUserSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    return session;
}

async function loadSharedDashboardData(currentUser) {
    const userInfoEl = document.getElementById('user-info');
    if (!userInfoEl) return null; // Tidak error jika elemen tidak ada
    
    const { data: karyawanData, error } = await _supabase
        .from('karyawan').select('nama_lengkap, nik, jabatan').eq('user_id', currentUser.id).single();
    
    if (karyawanData) {
        userInfoEl.innerHTML = `<h4>${karyawanData.nama_lengkap}</h4><p>NIK: ${karyawanData.nik}</p>`;
        return karyawanData;
    } else {
        // Fallback jika data karyawan tidak ada tapi user ada
        userInfoEl.innerHTML = `<h4>${currentUser.email}</h4><p>Data profil tidak ditemukan</p>`;
        return null;
    }
}

// Daftarkan plugin datalabels secara global
if (window.ChartDataLabels) {
    Chart.register(ChartDataLabels);
} else {
    console.warn("ChartDataLabels plugin not found. Make sure the script is included.");
}

// =================================================================
// BAGIAN 3: LOGIKA YANG BERJALAN SETELAH HALAMAN SIAP
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // === BLOK GLOBAL (JALAN DI SEMUA HALAMAN) ===
    // =================================================================
    
    // 1. Cek Sesi & Muat Data User (Dipindahkan ke atas)
    (async () => {
        const session = await getActiveUserSession();
        if (!session) {
            // Jika kita TIDAK di halaman login, tendang ke login
            if (!document.querySelector('.login-container')) { 
                alert('Anda harus login terlebih dahulu!');
                window.location.href = 'index.html';
                return;
            }
        } else {
            // Jika kita SUDAH login, panggil fungsi untuk memuat data user
            // Ini akan jalan di semua halaman yang ada <div id="user-info">
            await loadSharedDashboardData(session.user);
        }
    })(); // Fungsi ini langsung dijalankan

    // 2. Logika Sidebar (Berlaku di semua halaman, sesuai style.css)
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('overlay');
    
    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                // Logic Mobile: Tambah/hapus class 'active' di sidebar & overlay
                sidebar.classList.toggle('active');
                overlay.classList.toggle('active');
            } else {
                // Logic Desktop: Tambah/hapus class 'sidebar-collapsed' di BODY
                document.body.classList.toggle('sidebar-collapsed');
            }
        });

        // Tombol overlay untuk menutup di mobile
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // 3. Logika Dropdown Menu (Berlaku di semua halaman)
    const dropdownToggles = document.querySelectorAll(".sidebar-nav .dropdown .dropdown-toggle");
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener("click", function(e) {
            e.preventDefault(); 
            const parentNavLink = this.closest(".nav-link.dropdown");
            
            document.querySelectorAll(".sidebar-nav .dropdown.active").forEach(otherDropdown => {
                if (otherDropdown !== parentNavLink) {
                    otherDropdown.classList.remove("active");
                }
            });
            parentNavLink.classList.toggle("active");
        });
    });

    // 4. Otomatis Buka Dropdown Aktif (Berlaku di semua halaman)
    const activeSubmenuLink = document.querySelector(".submenu a.active");
    if (activeSubmenuLink) {
        const parentDropdown = activeSubmenuLink.closest(".nav-link.dropdown");
        if (parentDropdown) {
            parentDropdown.classList.add("active");
        }
    }

    // 5. Logika Logout (Berlaku di semua halaman)
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.onclick = async (e) => {
            e.preventDefault();
            await _supabase.auth.signOut();
            window.location.href = 'index.html';
        };
    }
    // =================================================================
    // === AKHIR DARI BLOK GLOBAL ===
    // =================================================================


    // -----------------------------------------------------------------
    // A. LOGIKA HALAMAN LOGIN (hanya jalan di index.html)
    // -----------------------------------------------------------------
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async (event) => {
            event.preventDefault();
            const nik = document.getElementById('nik').value;
            const password = document.getElementById('password').value;
            const messageEl = document.getElementById('message');
            messageEl.textContent = 'Mencoba login...';
            try {
                const { data: karyawanData, error: nikError } = await _supabase.from('karyawan').select('email').eq('nik', nik).single();
                if (nikError || !karyawanData) throw new Error('NIK tidak terdaftar.');
                const { data: authData, error: authError } = await _supabase.auth.signInWithPassword({ email: karyawanData.email, password: password });
                if (authError) throw new Error('Password salah.');
                window.location.href = 'dashboard.html';
            } catch (error) {
                messageEl.textContent = error.message;
            }
        };
    }

    // -----------------------------------------------------------------
    // B. LOGIKA HALAMAN HOME (hanya jalan di dashboard.html)
    // -----------------------------------------------------------------
    const homePage = document.getElementById('dashboard-home');
    if (homePage) {

        // --- Variabel Global untuk Halaman Home ---
        let allWusterData = []; 
        let chartInstances = { 'chart-1': null, 'chart-2': null, 'chart-3': null };
        
        // --- Fungsi Logika Grafik (processData, renderHybridChart, dll.) ---
        
        async function fetchWusterDataForChart() {
            const { data, error } = await _supabase
                .from('laporan_wuster')
                .select('*') 
                .or('status.eq.published,status.is.null')
                .order('tanggal', { ascending: true });

            if (error) {
                console.error("Error fetching Wuster data:", error);
                document.querySelectorAll('.chart-loading').forEach(el => el.textContent = 'Error: Gagal ambil data.');
                return [];
            }
            return data;
        }

        function populateMonthFilter(data) {
            const monthFilterEl = document.getElementById('month-filter');
            if (!monthFilterEl) return;
            const months = new Set(data.map(item => item.tanggal ? item.tanggal.substring(0, 7) : null).filter(Boolean));
            const sortedMonths = [...months].sort().reverse();
            const currentMonth = new Date().toISOString().substring(0, 7);
            
            monthFilterEl.innerHTML = '';
            sortedMonths.forEach(month => {
                const option = document.createElement('option');
                option.value = month;
                const [year, mon] = month.split('-');
                option.textContent = new Date(year, mon - 1, 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' });
                if (month === currentMonth) option.selected = true;
                monthFilterEl.appendChild(option);
            });
            if (!monthFilterEl.value && sortedMonths.length > 0) monthFilterEl.value = sortedMonths[0];
        }

        function processData(filteredData, chiefName) {
            const colorMap = {
                'SUBAGYO': { isi: 'rgba(255, 206, 86, 0.7)', total: 'rgb(255, 206, 86)' },
                'YANTO H': { isi: 'rgba(153, 102, 255, 0.7)', total: 'rgb(153, 102, 255)' },
                'SARNO': { isi: 'rgba(75, 192, 75, 0.7)', total: 'rgb(75, 192, 75)' },
                'default': { isi: 'rgba(54, 162, 235, 0.7)', total: 'rgb(54, 162, 235)' }
            };
            let selectedColor = colorMap['default'];
            const normalizedName = chiefName ? chiefName.trim().toUpperCase() : 'default';
            if (normalizedName.startsWith('SUBAGYO')) selectedColor = colorMap['SUBAGYO'];
            else if (normalizedName.startsWith('YANTO')) selectedColor = colorMap['YANTO H'];
            else if (normalizedName.startsWith('SARNO')) selectedColor = colorMap['SARNO'];

            const dailyData = new Map();
            filteredData.forEach(item => {
                const day = new Date(item.tanggal).getUTCDate(); 
                if (!dailyData.has(day)) dailyData.set(day, { isi: 0, kosong: 0, total: 0, target: 0 });
                const data = dailyData.get(day);
                data.isi += item.perf_wuster_isi || 0;
                data.kosong += item.perf_wuster_kosong || 0;
                data.total += (item.perf_wuster_isi || 0) + (item.perf_wuster_kosong || 0);
                let dailyTarget = 0;
                if (item.jam_kerja === '7 Jam') dailyTarget = 1680;
                else if (item.jam_kerja === '5 Jam') dailyTarget = 1200;
                data.target += dailyTarget;
            });

            if (dailyData.size === 0) return null;

            const sortedDays = [...dailyData.keys()].sort((a, b) => a - b);
            const labels = sortedDays.map(String);
            const dataIsi = sortedDays.map(day => dailyData.get(day).isi);
            const dataKosong = sortedDays.map(day => dailyData.get(day).kosong);
            const dataTotalBar = sortedDays.map(day => dailyData.get(day).total);
            const dataTarget = sortedDays.map(day => dailyData.get(day).target);

            return {
                labels: labels,
                datasets: [
                    { type: 'bar', label: 'HANGER ISI', data: dataIsi, backgroundColor: selectedColor.isi, stack: 'A', datalabels: { color: '#ffffff', anchor: 'center', align: 'center', font: { weight: 'bold' }, display: ctx => ctx.dataset.data[ctx.dataIndex] > 0 } },
                    { type: 'bar', label: 'HANGER KOSONG', data: dataKosong, backgroundColor: 'rgba(201, 203, 207, 0.7)', stack: 'A', datalabels: { color: '#333333', anchor: 'center', align: 'center', font: { weight: 'bold' }, display: ctx => ctx.dataset.data[ctx.dataIndex] > 0 } },
                    { type: 'line', label: 'TOTAL HANGER', data: dataTotalBar, dataTarget: dataTarget, borderColor: selectedColor.total, borderWidth: 3, tension: 0.1, datalabels: { display: ctx => ctx.dataset.data[ctx.dataIndex] > 0, formatter: (val, ctx) => { const target = ctx.dataset.dataTarget[ctx.dataIndex]; return target > 0 ? `${(val / target * 100).toFixed(1)} %` : 'N/A'; }, color: '#ffffffff', anchor: 'end', align: 'end', offset: -8, font: { weight: 'bold', size: 11 } } },
                    { type: 'line', label: 'TARGET', data: dataTarget, borderColor: 'rgba(255, 99, 132, 0.8)', borderWidth: 2, borderDash: [5, 5], pointRadius: 0, tension: 0.1, datalabels: { display: false } }
                ]
            };
        }

        function renderHybridChart(canvasId, chartData, loadingId, instanceKey) {
            const ctx = document.getElementById(canvasId)?.getContext('2d');
            const loadingMessageEl = document.getElementById(loadingId);
            if (!ctx || !loadingMessageEl) return;
            if (chartInstances[instanceKey]) chartInstances[instanceKey].destroy();

            if (!chartData) {
                loadingMessageEl.textContent = 'Tidak ada data untuk chief ini.';
                loadingMessageEl.style.display = 'block';
                return;
            }
            loadingMessageEl.style.display = 'none'; 

            chartInstances[instanceKey] = new Chart(ctx, {
                type: 'bar', data: chartData,
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        title: { display: false },
                        tooltip: { mode: 'index', intersect: false, callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) label += ': '; if (context.dataset.type === 'line') { if (context.parsed.y === null || context.parsed.y === 0) return null; const total = context.parsed.y; label += total; if (context.dataset.dataTarget) { const target = context.dataset.dataTarget[context.dataIndex]; if (target > 0) label += ` (${(total / target * 100).toFixed(1)}%)`; } } else { if (context.parsed.y === 0) return null; label += context.formattedValue; } return label; } } },
                        datalabels: { display: false }
                    },
                    scales: { x: { stacked: true, title: { display: true, text: 'Tanggal' } }, y: { beginAtZero: true, title: { display: true, text: 'Jumlah Hanger' } } }
                }
            });
        }
        
        function updateAllCharts() {
            const selectedMonth = document.getElementById('month-filter').value;
            if (!selectedMonth) return;
            const monthlyData = allWusterData.filter(item => item.tanggal && item.tanggal.startsWith(selectedMonth));
            const chiefNames = [...new Set(monthlyData.map(d => d.chief_name).filter(Boolean))].slice(0, 3);

            for (let i = 0; i < 3; i++) {
                const chiefName = chiefNames[i]; 
                const chartId = `chart-${i + 1}`, loadingId = `loading-chart-${i + 1}`, titleId = `title-chart-${i + 1}`;
                const titleEl = document.getElementById(titleId);
                if (chiefName && titleEl) {
                    titleEl.textContent = `Performa Wuster - ${chiefName}`;
                    const chiefData = monthlyData.filter(d => d.chief_name === chiefName);
                    const chartData = processData(chiefData, chiefName);
                    renderHybridChart(chartId, chartData, loadingId, chartId);
                } else if (titleEl) {
                    titleEl.textContent = 'Tidak Ada Data';
                    renderHybridChart(chartId, null, loadingId, chartId); 
                }
            }
        }

        // --- Logika Eksekusi Saat Halaman Dashboard Dimuat ---
        (async () => {
            // Cek sesi dan muat data user sudah dijalankan di luar
            // Jadi kita langsung ke logika halaman ini
            try {
                allWusterData = await fetchWusterDataForChart();
                if (allWusterData.length > 0) {
                    populateMonthFilter(allWusterData);
                    updateAllCharts();
                    const monthFilterEl = document.getElementById('month-filter');
                    if(monthFilterEl) monthFilterEl.onchange = updateAllCharts;
                } else {
                    console.warn("Tidak ada data Wuster yang diterima.");
                }
            } catch (error) {
                 console.error("Gagal total memuat dashboard:", error);
                 document.getElementById('loading-chart-1').textContent = 'Gagal memuat data.';
            }
        })();
    }

    // PENANDA VERSI BARU
    console.log("app.js versi 'GABUNGAN V3 (GLOBAL SESSION)' BERHASIL DIMUAT.");

}); // <-- Akhir dari pembungkus DOMContentLoaded