> [!NOTE]
> **Dokumentasi Dwibahasa / Bilingual Documentation**
> - Read this documentation in **English**: [README.md](file:///c:/Personal%20Finance/README.md)
> - Panduan Instalasi Lengkap: [INSTALLATION.id.md](file:///c:/Personal%20Finance/INSTALLATION.id.md) | [INSTALLATION.md](file:///c:/Personal%20Finance/INSTALLATION.md)
> - Panduan Pengguna (User Guide): [TUTORIAL.md](file:///c:/Personal%20Finance/TUTORIAL.md) (ID) | [TUTORIAL.en.md](file:///c:/Personal%20Finance/TUTORIAL.en.md) (EN)

# FinanceFlow — PWA Manajemen Keuangan Pribadi Cerdas & Offline-First

FinanceFlow adalah aplikasi web progresif (PWA) yang mengutamakan privasi, bekerja sepenuhnya secara offline (offline-first), dan dirancang untuk mencatat keuangan pribadi, arus kas, portofolio aset & investasi, target tabungan, serta estimasi pajak penghasilan tanpa ketergantungan pada server database pihak ketiga (zero vendor lock-in).

Aplikasi ini memadukan penyimpanan database reaktif lokal di peramban (Dexie.js / IndexedDB), input transaksi multi-modal (suara, OCR struk belanja, chat asisten AI, bot Telegram), mesin AI failover 3-tingkat (Groq, Google Gemini, OpenRouter), serta sinkronisasi awan otomatis menggunakan Google Drive `appDataFolder` yang privat dan terenkripsi.

---

## Fitur Utama & Kemampuan Sistem

### 1. Pencatatan Transaksi Multi-Modal
- **Input Cepat (Quick-Add)**: Formulir inline cepat dengan pintasan keyboard, saran kategori otomatis, dan pencatatan transfer antar-rekening yang mulus.
- **Asisten AI Percakapan (Smart AI Chat)**: Catat transaksi menggunakan bahasa Indonesia santai atau bahasa Inggris (contoh: *"Makan siang 35rb di warteg bca"*), ditenagai mesin fallback 3-tier (Groq, Gemini, OpenRouter).
- **OCR Struk Belanja & Riwayat Mutasi**: Menggunakan Tesseract.js dan Gemini Multimodal untuk mengekstrak transaksi dari foto struk fisik maupun tangkapan layar (screenshot) mutasi m-banking / e-wallet secara massal.
- **Input Suara (Voice Input)**: Integrasi Web Speech API dengan layar persetujuan privasi eksplisit, dukungan penuh bahasa Indonesia, dan ekstraksi nominal cerdas via AI.
- **Kotak Masuk Bot Telegram (Inbox)**: Catat pengeluaran saat bepergian melalui bot Telegram pribadi; pesan ditampung aman oleh worker edge (`financeflow-relay` dengan Cloudflare KV) dengan enkripsi end-to-end berbasis PIN.

### 2. Estimator Pajak Penghasilan Pribadi (PPh 21 / PPh 23 Indonesia)
- **Arsitektur Dual-Ledger**: Memisahkan nilai **Penghasilan Bruto Kena Pajak** dari **Penerimaan Bersih Kas (Netto)**, menjaga pembukuan rekening bank tetap akurat tanpa mengurangi nilai bruto untuk pelaporan pajak.
- **Preset Perlakuan Pajak Platform**:
  - *Pajak Dipotong Pihak Lain*: Mencatat bukti potong / kredit pajak otomatis (misal: Komisi Shopee Affiliate yang dipotong PPh 21 langsung).
  - *Belum Dipotong (Hitung Mandiri)*: Mencatat penghasilan bruto yang pajaknya perlu disetor sendiri (misal: TikTok Affiliate, jasa freelance langsung).
  - *Bukan Objek Pajak / Tidak Berlaku*: Transfer internal antar-rekening, penggantian dana (reimbursement), hadiah/hibah.
- **Parameter Pajak yang Dapat Disesuaikan**:
  - Prinsip single-PTKP gabungan untuk penghasilan gaji kantor dan penghasilan sampingan.
  - Pilihan bracket PTKP: TK/0 (Rp 54 Juta) hingga K/3 (Rp 72 Juta).
  - Tarif progresif PPh 21 UU HPP (5% hingga 35% di atas Rp 5 Miliar).
  - Kolom khusus penghasilan gaji tetap dari pemberi kerja untuk perhitungan pajak gabungan yang presisi.
  - Penegasan disclaimer legal bahwa kalkulator ini adalah alat estimasi pribadi dan bukan SPT resmi.

### 3. Target Finansial (Financial Goals) & Proyeksi Kecepatan
- **Pelacakan Target Cerdas**: Bar progres visual yang membandingkan saldo saat ini vs nominal target.
- **Proyeksi Kecepatan Simpanan (90-Day Velocity)**: Menghitung estimasi tanggal tercapainya target secara dinamis berdasarkan rata-rata simpanan bersih riil 90 hari terakhir, bukan garis lurus statis yang tidak realistis.
- **Dua Mode Pelacakan**:
  - *Mode Rekening Khusus (Dedicated Account)*: Progres dihitung otomatis dari pertumbuhan saldo rekening tabungan yang dikhususkan.
  - *Mode Setoran Manual*: Progres dicatat melalui kontribusi eksplisit (direkomendasikan jika rekening juga digunakan untuk pengeluaran sehari-hari).

### 4. Pelacakan Investasi & Aset Non-Kas
- **Portofolio Multi-Aset**: Pencatatan khusus untuk Saham, Reksadana, Kripto, Emas / Logam Mulia, dan Properti / Real Estat.
- **Valuasi Hibrida**:
  - Pembaruan valuasi berkala manual dilengkapi grafik riwayat nilai dari waktu ke waktu.
  - Sinkronisasi harga terkini otomatis untuk aset kripto utama melalui API publik CoinGecko.
- **Kekayaan Bersih Terpadu (Net Worth)**: Menghitung total kekayaan bersih riil (Kas Likuid + Nilai Aset Investasi - Saldo Sisa Utang).

### 5. Proyeksi Arus Kas (Cash Flow Forecasting)
- **Prediksi Saldo 3 hingga 6 Bulan**: Mensimulasikan saldo harian di masa depan dengan memperhitungkan saldo saat ini, tagihan berulang, cicilan utang aktif, dan kecepatan belanja diskresioner.
- **Peringatan Saldo Habis (Depletion Alert)**: Mendeteksi tanggal kritis ketika saldo rekening tertentu atau total likuiditas diproyeksikan turun di bawah nol.
- **Indikator Batas Belanja Aman (Safe-to-Spend)**: Menghitung anggaran belanja harian yang aman setelah menyisihkan kewajiban tagihan dan cicilan wajib.

### 6. Sinkronisasi Cloud & Harmoni Multi-Perangkat
- **Sinkronisasi Google Drive Privat**: Menyimpan cadangan data terenkripsi di folder tersembunyi `appDataFolder` (`drive.appdata`), tidak dapat dilihat di Google Drive biasa.
- **Kunci Akun Google & Identitas Perangkat**: Mencegah tercampurnya data antar-pengguna dengan mengunci sinkronisasi pada satu akun Google yang telah disetujui.
- **Deteksi Duplikasi Lintas Perangkat**: Algoritma pencocokan cerdas (fuzzy matching) yang mendeteksi transaksi kembar yang dicatat di perangkat berbeda saat offline.
- **Resolusi Konflik Data**: Vector clock dan mekanisme last-write-wins dengan dukungan penandaan hapus (tombstone).

### 7. Privasi Zero-Knowledge & Portabilitas Data
- **Enkripsi Sisi Klien**: Seluruh data keuangan, PIN proteksi, dan API key tersimpan lokal di IndexedDB peramban Anda.
- **Pelaporan Crash Anonim Opt-In**: Laporan diagnostik teknis ke worker `financeflow-telemetry` menerapkan filter ketat 7 kolom allow-list (**tanpa data keuangan apapun**) dengan retensi otomatis 30 hari di Cloudflare KV.
- **Hak untuk Dilupakan (Right-to-be-Forgotten)**: Fitur hapus data 2-tingkat (reset database lokal + pembersihan permanen `appDataFolder` di Google Drive).
- **Ekspor Data Mandiri**: Ekspor arsip ZIP tanpa dependency eksternal yang memuat seluruh database JSON dan file gambar struk asli.

### 8. Motivasi & Gamifikasi
- **Skor Kesehatan Finansial (0–100)**: Penilaian dinamis berdasarkan rasio tabungan, disiplin anggaran, ketersediaan dana darurat, dan konsistensi pencatatan.
- **Streak & Lencana Prestasi**: Melacak streak pencatatan harian berturut-turut dan membuka berbagai lencana pencapaian.
- **FinanceFlow Wrapped**: Tampilan visual interaktif kilas balik pengeluaran bulanan dan tahunan bergaya Spotify Wrapped.

---

## Tumpukan Teknologi & Arsitektur

| Komponen | Teknologi | Deskripsi Peran |
| :--- | :--- | :--- |
| **Framework Frontend** | React 19 + TypeScript 5.7 | Arsitektur komponen modern dan hooks reaktif |
| **Gaya & Ikonografi** | Tailwind CSS 3.4 + Lucide React | Tampilan responsif elegan dengan nuansa dark mode |
| **Database Klien** | Dexie.js 4.0 (IndexedDB) | Database lokal reaktif dengan **Skema v8** (23 tabel) |
| **Build & PWA** | Vite 6 + `vite-plugin-pwa` | Kompilasi kilat, service worker offline, installable di HP/PC |
| **Komputasi Edge** | Cloudflare Workers & Pages | Hosting statis edge dan worker serverless |
| **Penyimpanan Edge** | Cloudflare KV | `INBOX_KV` (relay Telegram) & `CRASH_REPORTS_KV` (telemetri) |
| **Cloud Sync** | Google Drive API v3 | Sinkronisasi privat berbasis scope terisolasi `appDataFolder` |
| **Inferensi AI** | Groq, Gemini, OpenRouter | Mesin fallback 3-tier dengan pemantauan limit token otomatis |
| **OCR Lokal Klien** | Tesseract.js | Pemindaian teks struk langsung di peramban saat offline |
| **Pengujian Otomatis** | `tsx` + `fake-indexeddb` | 27 rangkaian pengujian integrasi otomatis |

---

## Indeks Dokumentasi

Pelajari seluruh panduan dwibahasa yang telah disiapkan:

| Dokumen | Versi Bahasa Indonesia | Versi Bahasa Inggris |
| :--- | :--- | :--- |
| **Panduan Instalasi & Deployment** | [INSTALLATION.id.md](file:///c:/Personal%20Finance/INSTALLATION.id.md) | [INSTALLATION.md](file:///c:/Personal%20Finance/INSTALLATION.md) |
| **Buku Panduan Pengguna (Tutorial)** | [TUTORIAL.md](file:///c:/Personal%20Finance/TUTORIAL.md) | [TUTORIAL.en.md](file:///c:/Personal%20Finance/TUTORIAL.en.md) |
| **Arsitektur Sistem** | [ARCHITECTURE.id.md](file:///c:/Personal%20Finance/ARCHITECTURE.id.md) | [ARCHITECTURE.md](file:///c:/Personal%20Finance/ARCHITECTURE.md) |
| **Topologi Jaringan & Deployment** | [TOPOLOGY.id.md](file:///c:/Personal%20Finance/TOPOLOGY.id.md) | [TOPOLOGY.md](file:///c:/Personal%20Finance/TOPOLOGY.md) |

---

## Memulai Cepat (Pengembangan Lokal)

```bash
# 1. Clone repositori
git clone https://github.com/your-username/financeflow.git
cd financeflow

# 2. Pasang dependencies (tanpa perlu .env!)
npm install

# 3. Jalankan server lokal
npm run dev

# 4. Jalankan pengujian otomatis (27 test suites)
npm test

# 5. Bangun aset produksi
npm run build
```

Untuk petunjuk lengkap pengaturan Google Drive Sync, Cloudflare Workers, dan Bot Telegram, silakan baca [INSTALLATION.id.md](file:///c:/Personal%20Finance/INSTALLATION.id.md).

---

## Lisensi

Proyek ini dilisensikan di bawah Lisensi MIT — lihat file LICENSE untuk rincian selengkapnya.
