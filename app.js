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
    userInfoEl.innerHTML = `<h4>Memuat Nama...</h4>`; // Pesan loading awal
    try {
        const { data: karyawanData, error } = await _supabase
            .from('karyawan').select('nama_lengkap, nik').eq('user_id', currentUser.id).single();
        // Abaikan error 'not found' (PGRST116), tapi log error lain
        if (error && error.code !== 'PGRST116') {
           console.error("Error fetching karyawan data:", error);
           userInfoEl.innerHTML = `<h4>${currentUser.email}</h4><p>Gagal memuat profil</p>`;
           return null;
        }

        if (karyawanData) {
            userInfoEl.innerHTML = `<h4>${karyawanData.nama_lengkap}</h4><p>NIK: ${karyawanData.nik}</p>`;
            return karyawanData; // Kembalikan data karyawan jika ditemukan
        } else {
            // Jika tidak ada data karyawan, tampilkan email
            userInfoEl.innerHTML = `<h4>${currentUser.email}</h4><p>Profil belum lengkap</p>`;
            return null; // Kembalikan null jika data tidak ditemukan
        }
    } catch (fetchError) {
         // Tangani error jaringan atau lainnya
         console.error("Exception fetching karyawan data:", fetchError);
         userInfoEl.innerHTML = `<h4>${currentUser.email}</h4><p>Gagal memuat profil</p>`;
         return null;
    }
}

// Daftarkan plugin datalabels secara global (jika librarynya ada)
// Ini aman ditaruh di sini karena hanya mendaftarkan jika librarynya sudah dimuat
if (window.ChartDataLabels) {
    Chart.register(ChartDataLabels);
} else {
    // Tidak perlu console warning, mungkin hanya halaman dashboard yg pakai
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
            window.location.href = 'index.html'; // Arahkan ke index setelah logout
        };
    }

    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (menuToggle && sidebar && overlay) {
        menuToggle.onclick = () => {
            // Logika untuk toggle sidebar di mobile vs desktop
            if (window.innerWidth <= 768) { // Mobile/Tablet
                sidebar.classList.add('active');
                overlay.classList.add('active');
            } else { // Desktop
                document.body.classList.toggle('sidebar-collapsed');
            }
        };
        // Logika untuk menutup sidebar di mobile via overlay
        overlay.onclick = () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        };
        // Logika saat resize window
        window.addEventListener('resize', () => {
            // Pastikan overlay & mobile sidebar tertutup jika layar jadi besar
            if (window.innerWidth > 768) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
            // Hapus class collapsed jika layar diperkecil lalu diperbesar lagi (opsional)
             if (window.innerWidth <= 768 && document.body.classList.contains('sidebar-collapsed')) {
                 document.body.classList.remove('sidebar-collapsed');
             }
        });
    }

    // -----------------------------------------------------------------
    // A. LOGIKA HALAMAN LOGIN (index.html)
    // -----------------------------------------------------------------
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = async (event) => {
            event.preventDefault(); // Mencegah submit form biasa
            const nik = document.getElementById('nik').value;
            const password = document.getElementById('password').value;
            const messageEl = document.getElementById('message');
            messageEl.textContent = 'Mencoba login...'; // Pesan loading
            try {
                // 1. Cari email berdasarkan NIK
                const { data: karyawanData, error: nikError } = await _supabase.from('karyawan').select('email').eq('nik', nik).single();
                // Handle jika NIK tidak ketemu atau ada error lain
                if (nikError || !karyawanData) {
                    throw new Error(nikError?.code === 'PGRST116' ? 'NIK tidak terdaftar.' : `Error NIK: ${nikError?.message}`);
                }
                // 2. Coba login dengan email & password
                const { error: authError } = await _supabase.auth.signInWithPassword({ email: karyawanData.email, password: password });
                // Handle jika password salah
                if (authError) {
                    throw new Error('Password salah.');
                }
                // 3. Jika berhasil, arahkan ke dashboard
                window.location.href = 'dashboard.html';
            } catch (error) {
                // Tangani semua jenis error (NIK tak ada, password salah, dll)
                console.error("Login error:", error);
                messageEl.textContent = error.message || 'Terjadi kesalahan saat login.';
            }
        };
    }

    // -----------------------------------------------------------------
    // B. LOGIKA HALAMAN HOME (dashboard.html)
    // -----------------------------------------------------------------
    const homePage = document.getElementById('dashboard-home');
    if (homePage) {

        // --- Fungsi Grafik ---
        async function fetchWusterDataForChart() {
            const { data, error } = await _supabase.from('laporan_wuster').select('tanggal, shift, perf_wuster_isi, perf_wuster_kosong').or('status.eq.published,status.is.null').order('tanggal', { ascending: true }).order('shift', { ascending: true });
            if (error) { console.error("Error fetching Wuster data:", error); return null; } return data;
        }
        function processChartData(data) {
             if (!data || data.length === 0) return null; const dataByDate = {}; data.forEach(item => { const date = item.tanggal; if (!date) return; if (!dataByDate[date]) { dataByDate[date] = { 1:{i:0,k:0}, 2:{i:0,k:0}, 3:{i:0,k:0}, 4:{i:0,k:0} }; } if (item.shift >= 1 && item.shift <= 4) { dataByDate[date][item.shift].i += item.perf_wuster_isi || 0; dataByDate[date][item.shift].k += item.perf_wuster_kosong || 0; }}); const labels = Object.keys(dataByDate).sort(); const datasets = []; const shiftColors = { 1: 'rgba(54, 162, 235, 0.7)', 2: 'rgba(255, 99, 132, 0.7)', 3: 'rgba(75, 192, 192, 0.7)', 4: 'rgba(255, 206, 86, 0.7)'}; const shiftBorders = { 1: 'rgb(54, 162, 235)', 2: 'rgb(255, 99, 132)', 3: 'rgb(75, 192, 192)', 4: 'rgb(255, 206, 86)'}; for (let shift = 1; shift <= 4; shift++) { datasets.push({ label: `Shift ${shift} - Isi`, data: labels.map(d => dataByDate[d][shift]?.i || 0), backgroundColor: shiftColors[shift], borderColor: shiftBorders[shift], borderWidth: 1, stack: 'isi'}); } for (let shift = 1; shift <= 4; shift++) { datasets.push({ label: `Shift ${shift} - Kosong`, data: labels.map(d => dataByDate[d][shift]?.k || 0), backgroundColor: shiftColors[shift], borderColor: shiftBorders[shift], borderWidth: 1, stack: 'kosong'}); } return { labels, datasets };
        }
        function renderWusterChart(chartData) {
             const ctx = document.getElementById('wusterChart')?.getContext('2d'); const loadingMessageEl = document.getElementById('chart-loading-message'); if (!ctx) { if(loadingMessageEl) loadingMessageEl.textContent = 'Gagal memuat elemen grafik.'; return; } if (!chartData) { if(loadingMessageEl) loadingMessageEl.textContent = 'Tidak ada data performa wuster.'; return; } if (loadingMessageEl) loadingMessageEl.style.display = 'none'; if (window.myWusterChart instanceof Chart) { window.myWusterChart.destroy(); } window.myWusterChart = new Chart(ctx, { type: 'bar', data: { labels: chartData.labels, datasets: chartData.datasets }, options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: false }, tooltip: { mode: 'index', intersect: false }, datalabels: { color: '#ffffff', anchor: 'center', align: 'center', display: (context) => context.dataset.data[context.dataIndex] > 0, font: { weight: 'bold' } } }, scales: { x: { stacked: true, title: { display: true, text: 'Tanggal', color: '#adb5bd' }, ticks: { color: '#adb5bd' }, grid: { color: '#444444' } }, y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Jumlah Hanger', color: '#adb5bd'}, ticks: { color: '#adb5bd' }, grid: { color: '#444444' } } }, color: '#adb5bd' } });
        }
        // --- Akhir Fungsi Grafik ---

        // === INILAH BAGIAN YANG DIKEMBALIKAN KE VERSI SIMPEL ===
        (async () => {
            console.log("Home: Initializing...");
            // Langsung cek session saat halaman dimuat
            const session = await getActiveUserSession();
            // Jika TIDAK ADA session, tampilkan alert dan redirect
            if (!session) {
                console.log("Home: No session found, redirecting to index.html...");
                alert('Anda harus login terlebih dahulu!');
                window.location.href = 'index.html'; // Redirect ke halaman login (index.html)
                return; // Hentikan eksekusi script selanjutnya di halaman ini
            }

            // Jika lolos cek session, lanjutkan inisialisasi
            console.log("Home: Session found, proceeding with initialization.");
            const currentUser = session.user;

            // Muat data user & tampilkan di sidebar + sapaan selamat datang
            const karyawanData = await loadSharedDashboardData(currentUser);
            const welcomeMessageEl = document.getElementById('welcome-message');
            if (welcomeMessageEl) {
                welcomeMessageEl.textContent = `Selamat Datang, ${karyawanData?.nama_lengkap || currentUser.email}!`;
            }

            // Muat & render grafik (jika ada)
            try {
                const wusterData = await fetchWusterDataForChart();
                const chartData = processChartData(wusterData);
                renderWusterChart(chartData);
            } catch (error) {
                 // Tangani jika gagal memuat grafik, tapi jangan hentikan halaman
                 console.error("Failed to load/render chart:", error);
                 const loadingMessageEl = document.getElementById('chart-loading-message');
                 if (loadingMessageEl) loadingMessageEl.textContent = 'Gagal memuat data grafik.';
            }
        })();
        // === AKHIR BAGIAN YANG DIKEMBALIKAN ===
    }

}); // <-- Akhir dari pembungkus DOMContentLoaded