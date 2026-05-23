var butt = document.getElementsByClassName("atas_tombol")[0];
var menu = document.getElementsByClassName("atas_menu")[0];

butt.addEventListener("click", function(){
    menu.classList.toggle("show");
});

/**
 * script.js - Logika Jadwal Sholat Masjid Al-Muthma'innah
 */

async function getJadwalSholat() {
    // Koordinat Jakarta (Bisa diganti sesuai koordinat spesifik masjid)
    const lat = -6.2088;
    const lng = 106.8456;
    const method = 11; // Method Kemenag RI

    try {
        const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${method}`);
        const data = await response.json();
        const timings = data.data.timings;

        // Map ID HTML ke data dari API
        const jadwal = {
            fajr: timings.Fajr,
            dhuhr: timings.Dhuhr,
            asr: timings.Asr,
            maghrib: timings.Maghrib,
            isha: timings.Isha
        };

        const sekarang = new Date();
        const jamSekarang = sekarang.getHours() * 100;
        const menitSekarang = sekarang.getMinutes();
        const waktuTotalSekarang = jamSekarang + menitSekarang;

        let activeId = "";

        // Update teks di HTML dan cari waktu yang sedang aktif
        Object.keys(jadwal).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerText = jadwal[id];

                // Hitung waktu untuk menentukan class .active
                const [jam, menit] = jadwal[id].split(':').map(Number);
                const waktuTotalJadwal = jam * 100 + menit;

                if (waktuTotalSekarang >= waktuTotalJadwal) {
                    activeId = id;
                }
            }
        });

        // Jika lewat tengah malam sebelum Subuh, yang aktif tetap Isya
        if (!activeId) activeId = 'isha';

        // Terapkan class .active pada parent (card-sholat)
        updateActiveClass(activeId);

    } catch (error) {
        console.error("Gagal memuat jadwal sholat:", error);
    }
}

function updateActiveClass(id) {
    // Hapus class active dari semua kartu
    document.querySelectorAll('.card-sholat').forEach(card => {
        card.classList.remove('active');
    });

    // Tambah class active ke kartu yang sesuai
    const activeElement = document.getElementById(id);
    if (activeElement) {
        activeElement.parentElement.classList.add('active');
    }
}

// Jalankan fungsi saat DOM selesai dimuat
document.addEventListener('DOMContentLoaded', getJadwalSholat);