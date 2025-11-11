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
        .from('karyawan').select('nama_lengkap, nik, jabatan').eq('user_id', currentUser.id).single();
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
            // Ambil SEMUA kolom (*). Ini sudah otomatis mengambil 'jam_kerja'
            const { data, error } = await _supabase
                .from('laporan_wuster')
                .select('*') 
                .or('status.eq.published,status.is.null')
                .order('tanggal', { ascending: true });

            if (error) {
                console.error("Error fetching Wuster data:", error);
                const loadingEls = document.querySelectorAll('.chart-loading');
                loadingEls.forEach(el => {
                    el.textContent = `Error: ${error.message}. Gagal mengambil data.`;
                    el.style.color = 'red';
                });
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
         */
        function processData(filteredData, chiefName) {
            
            const colorMap = {
                'SUBAGYO': {
                    isi: 'rgba(255, 206, 86, 0.7)', // Kuning
                    total: 'rgb(255, 206, 86)'
                },
                'YANTO H': {
                    isi: 'rgba(153, 102, 255, 0.7)', // Ungu
                    total: 'rgb(153, 102, 255)'
                },
                'SARNO': {
                    isi: 'rgba(75, 192, 75, 0.7)', // Hijau
                    total: 'rgb(75, 192, 75)'      
                },
                'default': {
                    isi: 'rgba(54, 162, 235, 0.7)', // Biru (Default)
                    total: 'rgb(54, 162, 235)'
                }
            };

            const normalizedName = chiefName ? chiefName.trim().toUpperCase() : 'default';
            let selectedColor;
            
            if (normalizedName.startsWith('SUBAGYO')) {
                selectedColor = colorMap['SUBAGYO'];
            } else if (normalizedName.startsWith('YANTO')) { 
                selectedColor = colorMap['YANTO H'];
            } else if (normalizedName.startsWith('SARNO')) {
                selectedColor = colorMap['SARNO'];
            } else {
                selectedColor = colorMap['default'];
            }

            // 1. Buat Map untuk mengagregasi data per hari
            const dailyData = new Map();

            filteredData.forEach(item => {
                const day = new Date(item.tanggal).getUTCDate(); 

                if (!dailyData.has(day)) {
                    dailyData.set(day, {
                        isi: 0,
                        kosong: 0,
                        total: 0,
                        target: 0
                    });
                }

                const data = dailyData.get(day);
                
                data.isi += item.perf_wuster_isi || 0;
                data.kosong += item.perf_wuster_kosong || 0;
                data.total += (item.perf_wuster_isi || 0) + (item.perf_wuster_kosong || 0);
                
                let dailyTarget = 0;
                if (item.jam_kerja === '7 Jam') {
                    dailyTarget = 1680;
                } else if (item.jam_kerja === '5 Jam') {
                    dailyTarget = 1200;
                }
                data.target += dailyTarget;
            });

            if (dailyData.size === 0) {
                return null; // Tidak ada data, hentikan
            }

            // 2. Ubah Map menjadi array-array untuk Chart.js
            const sortedDays = [...dailyData.keys()].sort((a, b) => a - b);
            
            const labels = [];
            const dataIsi = [];
            const dataKosong = [];
            const dataTotalBar = [];
            const dataTarget = [];

            sortedDays.forEach(day => {
                const data = dailyData.get(day);
                labels.push(day); 
                dataIsi.push(data.isi);
                dataKosong.push(data.kosong);
                dataTotalBar.push(data.total);
                dataTarget.push(data.target);
            });


            return {
                labels: labels,
                datasets: [
                    // ** DATASET UNTUK BAR HANGER ISI **
                    {
                        type: 'bar',
                        label: 'HANGER ISI', 
                        data: dataIsi, 
                        backgroundColor: selectedColor.isi,
                        stack: 'A', // Tumpukan A
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
                    // ** DATASET UNTUK BAR HANGER KOSONG **
                    {
                        type: 'bar',
                        label: 'HANGER KOSONG',
                        data: dataKosong,
                        backgroundColor: 'rgba(201, 203, 207, 0.7)', 
                        borderColor: 'rgb(201, 203, 207)',
                        stack: 'A', // Tumpukan A
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
                    // ** INI DATASET UNTUK GARIS & PERSENTASE **
                    {
                        type: 'line',
                        label: 'TOTAL HANGER', 
                        data: dataTotalBar,
                        dataTarget: dataTarget, // Selipkan data target
                        borderColor: selectedColor.total, 
                        backgroundColor: selectedColor.total.replace('rgb', 'rgba').replace(')', ', 0.2)'),
                        borderWidth: 3,
                        pointRadius: 1, 
                        tension: 0.1,
                        datalabels: { 
                             display: function(context) {
                                const value = context.dataset.data[context.dataIndex];
                                return value > 0; 
                            },
                            formatter: function(value, context) {
                                const index = context.dataIndex;
                                const target = context.dataset.dataTarget[index]; 
                                if (target > 0) {
                                    const percent = (value / target) * 100;
                                    return percent.toFixed(1) + ' %';
                                }
                                return 'N/A';
                            },
                            color: '#ffffffff', 
                            anchor: 'end',    
                            align: 'end',     
                            offset: -8,       
                            font: { 
                                weight: 'bold',
                                size: 11
                            }
                        }
                    },
                    // ** DATASET GARIS TARGET BARU **
                    {
                        type: 'line',
                        label: 'TARGET',
                        data: dataTarget,
                        borderColor: 'rgba(255, 99, 132, 0.8)', // Merah
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderWidth: 2,
                        borderDash: [5, 5], // Garis putus-putus
                        pointRadius: 0, 
                        tension: 0.1,
                        datalabels: {
                            display: false 
                        }
                    }
                ]
            };
        }

        /**
         * 4. Merender satu chart ke canvas
         * *** FUNGSI INI YANG DIPERBAIKI ***
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
                type: 'bar', // Tipe utama adalah 'bar'
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: false },
                        tooltip: { 
                            mode: 'index', 
                            intersect: false,
                             callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    
                                    if (context.dataset.type === 'line') {
                                        if (context.parsed.y === null || context.parsed.y === 0) {
                                            return null; 
                                        }
                                        
                                        const total = context.parsed.y;
                                        label += total;

                                        if (context.dataset.dataTarget) {
                                            const index = context.dataIndex;
                                            const target = context.dataset.dataTarget[index]; 
                                            
                                            if (target > 0) {
                                                const percent = (total / target) * 100;
                                                label += ` (${percent.toFixed(1)}%)`;
                                            }
                                        }
                                    } else { 
                                        if (context.parsed.y === 0) {
                                            return null; 
                                        }
                                        label += context.formattedValue;
                                    }
                                    return label;
                                }
                            }
                        },
                        datalabels: {
                            display: false // Matikan datalabels global
                        }
                    },
                    scales: {
                        x: {
                            stacked: true, // Tumpuk di sumbu X (untuk bar)
                            title: { display: true, text: 'Tanggal' }
                        },
                        // === AWAL PERBAIKAN ===
                        y: { 
                            // stacked: true, <-- BARIS INI DIHAPUS
                            beginAtZero: true,
                            title: { display: true, text: 'Jumlah Hanger' }
                        }
                        // === AKHIR PERBAIKAN ===
                    }
                }
            });
        }
        
        /**
         * 5. Fungsi utama untuk mengupdate semua chart
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

            const chiefNames = [...new Set(monthlyData.map(d => d.chief_name).filter(Boolean))].slice(0, 3);

            for (let i = 0; i < 3; i++) {
                const chiefName = chiefNames[i]; 
                
                const chartId = `chart-${i + 1}`;       
                const loadingId = `loading-chart-${i + 1}`; 
                const titleId = `title-chart-${i + 1}`;   
                const titleEl = document.getElementById(titleId);

                if (chiefName && titleEl) {
                    titleEl.textContent = `Performa Wuster - ${chiefName}`;
                    const chiefData = monthlyData.filter(d => d.chief_name === chiefName);
                    
                    // Argumen daysInMonth dihapus
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
                
                if (allWusterData.length > 0) {
                    populateMonthFilter(allWusterData);
                    updateAllCharts();

                    const monthFilterEl = document.getElementById('month-filter');
                    if(monthFilterEl) {
                        monthFilterEl.onchange = updateAllCharts;
                    }
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
    console.log("app.js versi 'FIX STACKED LINE' BERHASIL DIMUAT.");

}); // <-- Akhir dari pembungkus DOMContentLoaded