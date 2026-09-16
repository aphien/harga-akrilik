# 🧮 Manajemen & Kalkulator Harga Akrilik

Aplikasi web modern yang dirancang untuk mempermudah perhitungan harga jual akrilik berdasarkan dimensi (panjang & lebar) dan ketebalannya. Dilengkapi dengan sistem manajemen harga yang dinamis berbasis database (Supabase) dan memiliki tampilan antarmuka yang ramah pengguna.

---

## ✨ Fitur Utama

- **Kalkulator Akurat:** Hitung harga akrilik secara otomatis berdasarkan ukuran yang diinput oleh pengguna.
- **Sistem Harga Dinamis (Manajemen CRUD):** Tambah, ubah, atau hapus daftar harga akrilik (berdasarkan ketebalan, tipe potongan, atau jenis pembelian grosir/eceran).
- **Integrasi Database:** Menyimpan dan mengambil data daftar harga secara *real-time* langsung menggunakan **Supabase**.
- **Mode Gelap Tersedia (Dark Mode):** Desain UI modern yang mendukung mode terang dan gelap dan dapat diganti secara instan (toggle).
- **Antarmuka Responsif:** Adaptif dan optimal jika diakses menggunakan perangkat *desktop* maupun perangkat *mobile*.

---

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun dengan *stack* teknologi modern untuk performa maksimal:
- **Frontend Framework:** React + Vite
- **Bahasa Pemrograman:** TypeScript
- **Styling:** CSS & TailwindCSS (Tergantung integrasi utilitas proyek)
- **Database & Backend as a Service:** Supabase

---

## 🚀 Cara Instalasi dan Menjalankan Proyek (Lokal)

Ikuti instruksi berikut untuk menjalankan program ini di komputer lokal Anda.

### 1. Prasyarat
- Anda wajib sudah meng-install **Node.js** di komputer/laptop Anda.
- Siapkan *Project* & Database di [Supabase](https://supabase.com).

### 2. Kloning Repository
```bash
git clone https://github.com/aphien/harga-akrilik.git
cd harga-akrilik
```

### 3. Install Dependensi (Library)
```bash
npm install
```

### 4. Konfigurasi Database (Supabase)
1. Buat tabel di *database* Supabase menggunakan *script* SQL yang tersedia pada file `supabase-schema.sql`.
2. Ubah file `.env.example` menjadi `.env` di direktori utama, lalu isikan kredensial Supabase Anda:
   ```env
   VITE_SUPABASE_URL=https://proyek-anda.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ... (masukkan kunci publik anonim dari Supabase)
   ```

### 5. Jalankan Server Pengembangan (Development)
```bash
npm run dev
```
Aplikasi bisa langsung dibuka pada *browser* Anda (default port: [http://localhost:3000/](http://localhost:3000/)).

---

## 📱 Tampilan Mobile & Fitur Unggulan

Aplikasi telah dioptimalkan khusus untuk kenyamanan perangkat *smartphone* / *tablet*:
- **Floating Action Button (FAB):** Tombol bulat "+ Tambah Data" melayang di kanan bawah layar untuk penambahan data cepat dengan satu jempol.
- **Toggle Mode Tampilan Mobile:** Pilihan antara **Mode Kartu (Card)** yang elegan atau **Tabel Geser (Scrollable Compact Table)** dengan kolom ketebalan terkunci (*sticky*).
- **Kalkulator Mobile & Salin Rincian:** Input numerik ramah sentuhan serta tombol **Salin Rincian** ke *clipboard* untuk langsung ditempel ke chat WhatsApp pelanggan.
- **Filter Ketebalan pada Perbandingan Harga:** *Carousel pill* pemilih ketebalan ("Semua", "2 mm", "3 mm", dll.) untuk membandingkan harga antar supplier tanpa perlu scrolling panjang.
- **Modal Adaptif (Bottom Sheet):** Formulir modal otomatis beradaptasi menjadi *bottom sheet drawer* di layar kecil agar nyaman digunakan bersama keyboard virtual.

---

## ⏰ Otomatisasi Keep-Alive Supabase (Mencegah Database Down/Pause)

Supabase Free Tier otomatis terhibernasi (*paused*) jika tidak ada request API selama 7 hari. Proyek ini dilengkapi dengan 2 sistem otomatisasi:

### 1. Cloud Cron (GitHub Actions) — *Otomatis 24/7 di Cloud*
File alur kerja telah disediakan di `.github/workflows/supabase-keep-alive.yml`. Setiap kali repositori ini di-*push* ke GitHub:
- GitHub Actions akan otomatis melakukan ping database setiap 6 jam (`0 */6 * * *`).
- Berjalan gratis di cloud tanpa membutuhkan komputer/laptop Anda menyala.

### 2. Script Lokal & Server Daemon
Anda juga dapat menjalankan ping secara lokal atau pada VPS/server hosting:
```bash
# Ping sekali langsung (one-shot):
npm run keep-alive

# Jalankan sebagai daemon latar belakang (otomatis berulang setiap 6 jam):
npm run keep-alive:daemon

# Atau jadwalkan via crontab (Linux/macOS):
crontab -e
# Tambahkan baris ini (misal berjalan setiap hari pukul 08:00):
0 8 * * * cd /path/ke/harga-akrilik && npm run keep-alive >> /tmp/keep-alive.log 2>&1
```

---

## 📦 Menyiapkan Versi Produksi (Build)

Jika Anda ingin menggelar (deploy) proyek ini ke *server hosting*/Vercel/Netlify/Niagahoster:
```bash
npm run build
```
Proses ini akan menghasilkan folder `dist/` yang berisi kumpulan file *client-side* siap rilis.

---

## 💡 Panduan Penggunaan
1. **Atur Daftar Harga Terlebih Dahulu:** Pertama pastikan Anda mengisi data harga per cm/m² pada panel kelola harga. Semua akan otomatis masuk ke Supabase.
2. **Gunakan Kalkulator:** Masukkan ketebalan akrilik yang diinginkan, kemudian isi panjang dan lebarnya. Aplikasi akan otomatis mengkalkulasikan estimasi total harga jual berdasarkan database harga yang sudah Anda tentukan.

---
**Dibuat untuk Manajemen Percetakan Karya Veteran © 2026**
