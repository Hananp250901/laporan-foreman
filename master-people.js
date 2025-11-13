// --- AMBIL ELEMEN DARI DOM ---
const addForm = document.getElementById('addPeopleForm');
const namaPeopleInput = document.getElementById('namaPeople');
const tableBody = document.getElementById('peopleTableBody');

// --- FUNGSI UTAMA ---

/**
 * Mengambil semua data dari tabel master_people dan menampilkannya.
 */
async function fetchPeople() {
    try {
        // MENGGUNAKAN _supabase (dari app.js)
        const { data, error } = await _supabase
            .from('master_people')
            .select('*')
            .order('nama', { ascending: true });

        if (error) throw error;

        renderTable(data);
    } catch (error) {
        console.error('Error fetching people:', error.message);
        alert('Gagal memuat data people.');
    }
}

/**
 * Menampilkan data ke dalam tabel HTML.
 * @param {Array} people - Array objek orang dari Supabase.
 */
function renderTable(people) {
    tableBody.innerHTML = ''; // Kosongkan tabel sebelum mengisi

    if (people.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="2" style="text-align: center;">Belum ada data people.</td></tr>';
        return;
    }

    people.forEach(person => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${person.nama}</td>
            <td>
                <button class="action-btn delete-btn" onclick="deletePerson(${person.id})">Hapus</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * Menangani penambahan data baru dari form.
 * @param {Event} event - Event submit form.
 */
async function handleAddSubmit(event) {
    event.preventDefault();

    const newName = namaPeopleInput.value.trim();

    if (!newName) {
        alert('Nama People tidak boleh kosong.');
        return;
    }

    try {
        // MENGGUNAKAN _supabase (dari app.js)
        const { error } = await _supabase
            .from('master_people')
            .insert([{ nama: newName }]);

        if (error) throw error;

        alert('Nama baru berhasil ditambahkan!');
        addForm.reset(); // Kosongkan form
        fetchPeople(); // Muat ulang data di tabel
    } catch (error) {
        console.error('Error adding new person:', error.message);
        alert('Gagal menambahkan nama baru.');
    }
}

/**
 * Menghapus data berdasarkan ID.
 * @param {number} id - ID dari baris yang akan dihapus.
 */
async function deletePerson(id) {
    if (!confirm('Anda yakin ingin menghapus nama ini?')) {
        return; // Batalkan jika pengguna menekan 'Cancel'
    }

    try {
        // MENGGUNAKAN _supabase (dari app.js)
        const { error } = await _supabase
            .from('master_people')
            .delete()
            .eq('id', id);

        if (error) throw error;

        alert('Nama berhasil dihapus.');
        fetchPeople(); // Muat ulang data di tabel
    } catch (error) {
        console.error('Error deleting person:', error.message);
        alert('Gagal menghapus nama.');
    }
}

// --- INISIALISASI ---

// Event listener untuk form tambah data
addForm.addEventListener('submit', handleAddSubmit);

// Muat data pertama kali saat halaman dibuka
document.addEventListener('DOMContentLoaded', fetchPeople);

// Membuat fungsi deletePerson bisa diakses dari HTML
window.deletePerson = deletePerson;