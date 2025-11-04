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
    if (!userInfoEl) return null;
    const { data: karyawanData, error } = await _supabase
        .from('karyawan').select('nama_lengkap, nik').eq('user_id', currentUser.id).single();
    if (karyawanData) {
        userInfoEl.innerHTML = `<h4>${karyawanData.nama_lengkap}</h4><p>NIK: ${karyawanData.nik}</p>`;
        return karyawanData;
    } else {
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

    // Logika UI Global (Berlaku di semua halaman)
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.onclick = async () => {
            await _supabase.auth.signOut();
            window.location.href = 'index.html';
        };
    }

    // Logika Sidebar (toggle, overlay, resize)
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (menuToggle && sidebar && overlay) {
        menuToggle.onclick = () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.add('active');
                overlay.classList.add('active');
            } else {
                document.body.classList.toggle('sidebar-collapsed');
            }
        };
        overlay.onclick = () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        };
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    }

    // -----------------------------------------------------------------
    // A. LOGIKA HALAMAN LOGIN (login.html)
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
    // B. LOGIKA HALAMAN HOME (dashboard.html) - DITULIS ULANG
    // -----------------------------------------------------------------
    const homePage = document.getElementById('dashboard-home');
    if (homePage) {

        // --- Variabel Global untuk Halaman Home ---
        let allWusterData = []; // Cache untuk menyimpan semua data dari Supabase
        let chartInstances = { // ID diubah
            'chart-1': null,
            'chart-2': null,
            'chart-3': null
        };
        
        // --- Fungsi Logika Grafik (BARU) ---

        /**
         * 1. Mengambil semua data wuster dari database
         */
        async function fetchWusterDataForChart() {
            const { data, error } = await _supabase
                .from('laporan_wuster')
                // *** REVISI: TAMBAHKAN 'chief_name' ***
                .select('tanggal, shift, chief_name, perf_wuster_isi, perf_wuster_kosong')
                .or('status.eq.published,status.is.null')
                .order('tanggal', { ascending: true });

            if (error) {
                console.error("Error fetching Wuster data:", error);
                return [];
            }
            return data;
        }

        /**
         * 2. Mengisi dropdown filter bulan berdasarkan data yang ada
         */
        function populateMonthFilter(data) {
            const monthFilterEl = document.getElementById('month-filter');
            if (!monthFilterEl) return;

            const months = new Set();
            data.forEach(item => {
                if (item.tanggal) {
                    const month = item.tanggal.substring(0, 7); // Format "YYYY-MM"
                    months.add(month);
                }
            });

            const sortedMonths = [...months].sort().reverse();
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            let defaultSelected = false;
            
            monthFilterEl.innerHTML = '';
            sortedMonths.forEach(month => {
                const option = document.createElement('option');
                option.value = month;
                const [year, mon] = month.split('-');
                const d = new Date(year, mon - 1, 1);
                option.textContent = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
                
                if (month === currentMonth) {
                    option.selected = true;
                    defaultSelected = true;
                }
                
                monthFilterEl.appendChild(option);
            });

            if (!defaultSelected && sortedMonths.length > 0) {
                monthFilterEl.value = sortedMonths[0];
            }
        }

        /**
         * 3. Memproses data mentah menjadi format Chart.js
         * (Fungsi ini sekarang lebih generik, tidak peduli shift atau chief)
         */
        function processData(filteredData, daysInMonth) {
            
            const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            const dataIsi = new Array(daysInMonth).fill(0);
            const dataKosong = new Array(daysInMonth).fill(0);
            const dataTotalBar = new Array(daysInMonth).fill(0);

            // Loop semua data yang sudah difilter (misal, cuma data 'Budi')
            filteredData.forEach(item => {
                const day = new Date(item.tanggal).getUTCDate(); 
                const index = day - 1; 

                if (index >= 0 && index < daysInMonth) {
                    dataIsi[index] += item.perf_wuster_isi || 0; 
                    dataKosong[index] += item.perf_wuster_kosong || 0;
                }
            });
            
            // Isi array dataTotalBar
            for (let i = 0; i < daysInMonth; i++) {
                dataTotalBar[i] = dataIsi[i] + dataKosong[i];
            }

            const hasData = dataIsi.some(d => d > 0) || dataKosong.some(d => d > 0);
            
            if (!hasData) {
                return null; 
            }

            return {
                labels: labels,
                datasets: [
                    {
                        type: 'bar',
                        label: 'HANGER ISI', 
                        data: dataIsi, 
                        backgroundColor: 'rgba(54, 162, 235, 0.7)', // Biru
                        stack: 'A', // Tumpukan Grup A
                        datalabels: {
                            color: '#ffffff',
                            anchor: 'center',  
                            align: 'center',
                            font: { weight: 'bold' },
                            display: function(context) {
                                return context.dataset.data[context.dataIndex] > 0;
                            }
                        }
                    },
                    {
                        type: 'bar',
                        label: 'HANGER KOSONG',
                        data: dataKosong,
                        backgroundColor: 'rgba(201, 203, 207, 0.7)', // Abu-abu
                        borderColor: 'rgb(201, 203, 207)',
                        stack: 'A', // Tumpukan Grup A
                        datalabels: {
                            color: '#333333',
                            anchor: 'center',
                            align: 'center',
                            font: { weight: 'bold' },
                             display: function(context) {
                                return context.dataset.data[context.dataIndex] > 0;
                            }
                        }
                    },
                    {
                        type: 'line', 
                        label: 'TOTAL HANGER', 
                        data: dataTotalBar, 
                        borderColor: 'rgb(75, 192, 192)', // Hijau/Teal
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderWidth: 3,
                        pointRadius: 1, 
                        tension: 0.1,
                        datalabels: { display: false }
                    }
                ]
            };
        }

        /**
         * 4. Merender satu chart ke canvas
         */
        function renderHybridChart(canvasId, chartData, loadingId, instanceKey) {
            const ctx = document.getElementById(canvasId)?.getContext('2d');
            const loadingMessageEl = document.getElementById(loadingId);

            if (!ctx || !loadingMessageEl) {
                console.error(`Elemen ${canvasId} atau ${loadingId} tidak ditemukan.`);
                return;
            }

            if (chartInstances[instanceKey]) {
                chartInstances[instanceKey].destroy();
            }

            if (!chartData) {
                loadingMessageEl.textContent = 'Tidak ada data untuk chief ini.';
                loadingMessageEl.style.display = 'block';
                return;
            }
            
            loadingMessageEl.style.display = 'none'; 

            chartInstances[instanceKey] = new Chart(ctx, {
                type: 'bar', 
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: false },
                        tooltip: { 
                            mode: 'index', 
                            intersect: false,
                        },
                        datalabels: {
                            display: false 
                        }
                    },
                    scales: {
                        x: {
                            stacked: true, 
                            title: { display: true, text: 'Tanggal' }
                        },
                        y: {
                            stacked: true, // WAJIB TRUE agar bar menumpuk
                            beginAtZero: true,
                            title: { display: true, text: 'Jumlah Hanger' }
                        }
                    }
                }
            });
        }
        
        /**
         * 5. Fungsi utama untuk mengupdate semua chart (DITULIS ULANG)
         */
        function updateAllCharts() {
            const selectedMonth = document.getElementById('month-filter').value;
            if (!selectedMonth) {
                 console.warn("Tidak ada bulan terpilih.");
                 return;
            }
            
            const monthlyData = allWusterData.filter(item => 
                item.tanggal && item.tanggal.startsWith(selectedMonth)
            );

            const [year, month] = selectedMonth.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();

            // *** REVISI: CARI NAMA CHIEF DARI DATA ***
            // 1. Ambil semua nama chief dari data bulan ini
            // 2. filter(Boolean) untuk hapus nama yg null atau ""
            // 3. new Set(...) untuk ambil unik-nya saja
            // 4. ...new Set(...) ubah Set jadi array
            // 5. .slice(0, 3) ambil 3 nama pertama
            const chiefNames = [...new Set(monthlyData.map(d => d.chief_name).filter(Boolean))].slice(0, 3);

            // Loop 3 kali (untuk 3 slot chart)
            for (let i = 0; i < 3; i++) {
                const chiefName = chiefNames[i]; // Ambil nama (e.g., 'Budi')
                
                // Siapkan ID elemen HTML
                const chartId = `chart-${i + 1}`;       // e.g., 'chart-1'
                const loadingId = `loading-chart-${i + 1}`; // e.g., 'loading-chart-1'
                const titleId = `title-chart-${i + 1}`;   // e.g., 'title-chart-1'
                const titleEl = document.getElementById(titleId);

                if (chiefName && titleEl) {
                    // Jika ada nama chief untuk slot ini
                    titleEl.textContent = `Performa Wuster - ${chiefName}`;
                    
                    // Filter data hanya untuk chief ini
                    const chiefData = monthlyData.filter(d => d.chief_name === chiefName);
                    
                    // Proses data chief
                    const chartData = processData(chiefData, daysInMonth);
                    
                    // Render grafiknya
                    renderHybridChart(chartId, chartData, loadingId, chartId);
                
                } else if (titleEl) {
                    // Jika tidak ada nama chief (misal, cuma ada 2 chief)
                    titleEl.textContent = 'Tidak Ada Data';
                    renderHybridChart(chartId, null, loadingId, chartId); // Tampilkan pesan 'Tidak ada data'
                }
            }
        }


        // --- Logika Eksekusi Saat Halaman Dashboard Dimuat ---
        (async () => {
            const session = await getActiveUserSession();
            if (!session) {
                alert('Anda harus login terlebih dahulu!');
                window.location.href = 'index.html';
                return;
            }

            const karyawanData = await loadSharedDashboardData(session.user);
            const welcomeMessageEl = document.getElementById('welcome-message');
            if (welcomeMessageEl && karyawanData && karyawanData.nama_lengkap) {
                welcomeMessageEl.textContent = `Selamat Datang, ${karyawanData.nama_lengkap}!`;
            } else if (welcomeMessageEl && session.user.email) {
                welcomeMessageEl.textContent = `Selamat Datang, ${session.user.email}!`;
            }

            try {
                allWusterData = await fetchWusterDataForChart();
                populateMonthFilter(allWusterData);
                updateAllCharts();

                const monthFilterEl = document.getElementById('month-filter');
                if(monthFilterEl) {
                    monthFilterEl.onchange = updateAllCharts;
                }

            } catch (error) {
                 console.error("Gagal memuat data dashboard:", error);
                 document.getElementById('loading-chart-1').textContent = 'Gagal memuat data.';
                 document.getElementById('loading-chart-2').textContent = 'Gagal memuat data.';
                 document.getElementById('loading-chart-3').textContent = 'Gagal memuat data.';
            }

        })();
    }

}); // <-- Akhir dari pembungkus DOMContentLoaded