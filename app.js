// 1. Inisialisasi Klien Supabase
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

// === PERUBAHAN DI SINI ===
// Daftarkan plugin datalabels secara global
if (window.ChartDataLabels) {
    Chart.register(ChartDataLabels);
} else {
    console.warn("ChartDataLabels plugin not found. Make sure the script is included.");
}
// === AKHIR PERUBAHAN ===


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
    // B. LOGIKA HALAMAN HOME (dashboard.html)
    // -----------------------------------------------------------------
    const homePage = document.getElementById('dashboard-home');
    if (homePage) {

        // --- FUNGSI BARU UNTUK GRAFIK ---

        async function fetchWusterDataForChart() {
            console.log("Fetching Wuster data for chart...");
            const { data, error } = await _supabase
                .from('laporan_wuster')
                .select('tanggal, shift, perf_wuster_isi, perf_wuster_kosong')
                .or('status.eq.published,status.is.null') // Ambil yg published atau yg lama
                .order('tanggal', { ascending: true })
                .order('shift', { ascending: true }); // Urutkan agar mudah diproses

            if (error) {
                console.error("Error fetching Wuster data:", error);
                return null;
            }
            console.log("Wuster data fetched:", data);
            return data;
        }

        function processChartData(data) {
            if (!data || data.length === 0) return null;

            // 1. Kelompokkan data per tanggal
            const dataByDate = {};
            data.forEach(item => {
                const date = item.tanggal;
                if (!date) return; // Lewati jika tanggal null

                if (!dataByDate[date]) {
                    dataByDate[date] = {
                        1: { isi: 0, kosong: 0 }, 2: { isi: 0, kosong: 0 },
                        3: { isi: 0, kosong: 0 }, 4: { isi: 0, kosong: 0 },
                    };
                }
                if (item.shift >= 1 && item.shift <= 4) {
                    dataByDate[date][item.shift].isi += item.perf_wuster_isi || 0;
                    dataByDate[date][item.shift].kosong += item.perf_wuster_kosong || 0;
                }
            });

            // 2. Siapkan label (tanggal unik)
            const labels = Object.keys(dataByDate).sort(); // Urutkan tanggal

            // 3. Siapkan datasets
            const datasets = [];
            const shiftColors = {
                1: 'rgba(54, 162, 235, 0.7)',  2: 'rgba(255, 99, 132, 0.7)',
                3: 'rgba(75, 192, 192, 0.7)',  4: 'rgba(255, 206, 86, 0.7)'
            };
             const shiftColorsDarker = { // Warna lebih gelap untuk border/label
                 1: 'rgb(54, 162, 235)',  2: 'rgb(255, 99, 132)',
                 3: 'rgb(75, 192, 192)',  4: 'rgb(255, 206, 86)'
             };

            // Hanger Isi
            for (let shift = 1; shift <= 4; shift++) {
                datasets.push({
                    label: `Shift ${shift} - Isi`,
                    data: labels.map(date => dataByDate[date][shift]?.isi || 0),
                    backgroundColor: shiftColors[shift],
                    borderColor: shiftColorsDarker[shift], // Tambahkan border
                    borderWidth: 1,                      // Ketebalan border
                    stack: 'isi'
                });
            }

            // Hanger Kosong
            for (let shift = 1; shift <= 4; shift++) {
                datasets.push({
                    label: `Shift ${shift} - Kosong`,
                    data: labels.map(date => dataByDate[date][shift]?.kosong || 0),
                    backgroundColor: shiftColors[shift],
                    borderColor: shiftColorsDarker[shift], // Tambahkan border
                    borderWidth: 1,                      // Ketebalan border
                    stack: 'kosong'
                });
            }
             console.log("Processed chart data:", { labels, datasets });
            return { labels, datasets };
        }

        function renderWusterChart(chartData) {
            const ctx = document.getElementById('wusterChart')?.getContext('2d');
            const loadingMessageEl = document.getElementById('chart-loading-message');

            if (!ctx) {
                 console.error("Canvas element not found!");
                 if(loadingMessageEl) loadingMessageEl.textContent = 'Gagal memuat elemen grafik.';
                 return;
            }
             if (!chartData) {
                  console.error("No data to render chart!");
                  if(loadingMessageEl) loadingMessageEl.textContent = 'Tidak ada data performa wuster untuk ditampilkan.';
                  return;
             }

             if (loadingMessageEl) loadingMessageEl.style.display = 'none'; // Sembunyikan pesan loading

            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: chartData.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: false },
                        tooltip: { mode: 'index', intersect: false },
                        // === PERUBAHAN DI SINI: Konfigurasi Datalabels ===
                        datalabels: {
                            color: '#ffffff', // Warna teks label (putih)
                            // Atur posisi anchor (di tengah bar)
                            anchor: 'center',
                            // Atur posisi align (di tengah bar)
                            align: 'center',
                             // Tampilkan label hanya jika nilainya > 0
                            display: function(context) {
                                return context.dataset.data[context.dataIndex] > 0;
                            },
                            font: {
                                weight: 'bold'
                            },
                             // Format angka jika perlu (misal ribuan pakai titik)
                            // formatter: function(value, context) {
                            //    return value.toLocaleString('id-ID');
                            // }
                        }
                        // === AKHIR PERUBAHAN ===
                    },
                    scales: {
                        x: {
                            stacked: true,
                            title: { display: true, text: 'Tanggal' }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            title: { display: true, text: 'Jumlah Hanger' }
                        }
                    }
                }
            });
             console.log("Chart rendered successfully.");
        }

        // --- AKHIR FUNGSI BARU ---


        setTimeout(() => {
            (async () => {
                const session = await getActiveUserSession();
                if (!session) {
                    alert('Anda harus login terlebih dahulu!');
                    window.location.href = 'index.html'; // Pastikan ini halaman login Anda
                    return;
                }

                // Muat data user dan sapaan selamat datang
                const karyawanData = await loadSharedDashboardData(session.user);
                const welcomeMessageEl = document.getElementById('welcome-message');
                if (welcomeMessageEl && karyawanData && karyawanData.nama_lengkap) {
                    welcomeMessageEl.textContent = `Selamat Datang, ${karyawanData.nama_lengkap}!`;
                } else if (welcomeMessageEl && session.user.email) {
                    welcomeMessageEl.textContent = `Selamat Datang, ${session.user.email}!`;
                }

                // Muat dan tampilkan grafik
                try {
                    const wusterData = await fetchWusterDataForChart();
                    const chartData = processChartData(wusterData);
                    renderWusterChart(chartData);
                } catch (error) {
                     console.error("Failed to load and render chart:", error);
                     const loadingMessageEl = document.getElementById('chart-loading-message');
                     if (loadingMessageEl) loadingMessageEl.textContent = 'Gagal memuat data grafik.';
                }

            })();
        }, 150);
    }

}); // <-- Akhir dari pembungkus DOMContentLoaded
