// 1. Inisialisasi Klien Supabase
const SUPABASE_URL = 'https://fbfvhcwisvlyodwvmpqg.supabase.co'; // Ganti
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZnZoY3dpc3ZseW9kd3ZtcHFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTQ2MzQsImV4cCI6MjA3MjM5MDYzNH0.mbn9B1xEr_8kmC2LOP5Jv5O7AEIK7Fa1gxrqJ91WNx4'; // Ganti
// Inisialisasi klien Supabase
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =================================================================
// BAGIAN 2: FUNGSI GLOBAL & BERSAMA
// (Fungsi-fungsi ini aman ditaruh di luar)
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

// =================================================================
// BAGIAN 3: LOGIKA YANG BERJALAN SETELAH HALAMAN SIAP
// (PERBAIKAN: Dibungkus dengan DOMContentLoaded)
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
            event.preventDefault(); 
            const nik = document.getElementById('nik').value;
            const password = document.getElementById('password').value;
            const messageEl = document.getElementById('message');
            messageEl.textContent = 'Mencoba login...'; // Pesan loading
            try {
                const { data: karyawanData, error: nikError } = await _supabase.from('karyawan').select('email').eq('nik', nik).single(); 
                if (nikError || !karyawanData) throw new Error('NIK tidak terdaftar.');
                const { data: authData, error: authError } = await _supabase.auth.signInWithPassword({ email: karyawanData.email, password: password });
                if (authError) throw new Error('Password salah.');
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
    // === PERUBAHAN DI BLOK INI ===
    // -----------------------------------------------------------------
    const homePage = document.getElementById('dashboard-home');
    if (homePage) {
        (async () => {
            console.log("Home: Initializing...");
            // Langsung cek session saat halaman dimuat
            const session = await getActiveUserSession();
            // Jika TIDAK ADA session, tampilkan alert dan redirect
            if (!session) {
                alert('Anda harus login terlebih dahulu!');
                window.location.href = 'login.html'; // Pastikan ini halaman login Anda
                return;
            }
            
            // 1. Tangkap data karyawan saat memuat info sidebar
            const karyawanData = await loadSharedDashboardData(session.user);
            
            // 2. Cari elemen h2 yang baru kita beri ID
            const welcomeMessageEl = document.getElementById('welcome-message');
            
            // 3. Update teksnya
            if (welcomeMessageEl && karyawanData && karyawanData.nama_lengkap) {
                // Jika data karyawan ada, sapa dengan nama lengkap
                welcomeMessageEl.textContent = `SELAMAT DATANG PAK ${karyawanData.nama_lengkap}!`;
            } else if (welcomeMessageEl && session.user.email) {
                // Jika tidak ada, sapa dengan email (fallback)
                welcomeMessageEl.textContent = `Selamat Datang, ${session.user.email}!`;
            }
            // Jika tidak ada data sama sekali, h2 akan tetap "Selamat Datang!"
            
        })();
        // === AKHIR BAGIAN YANG DIKEMBALIKAN ===
    }

}); // <-- Akhir dari pembungkus DOMContentLoaded