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
cd manajemen-harga-akrilik
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
Aplikasi bisa langsung dibuka pada *browser* favorit Anda (biasanya tersedia pada [http://localhost:5173/](http://localhost:5173/)).

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
