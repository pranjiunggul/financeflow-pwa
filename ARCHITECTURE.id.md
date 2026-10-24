> [!NOTE]
> **Dokumentasi Dwibahasa / Bilingual Documentation**
> - Read this system architecture in **English**: [ARCHITECTURE.md](file:///c:/Personal%20Finance/ARCHITECTURE.md)
> - Kembali ke Dokumentasi Utama: [README.id.md](file:///c:/Personal%20Finance/README.id.md)

# FinanceFlow — Arsitektur Sistem & Spesifikasi Teknis

Dokumen ini menguraikan arsitektur perangkat lunak, model data, protokol sinkronisasi, infrastruktur komputasi edge, dan batasan keamanan yang diimplementasikan di FinanceFlow.

---

## 1. Ikhtisar Arsitektur Tingkat Tinggi

FinanceFlow menerapkan arsitektur **Offline-First, Zero-Backend**. Aplikasi utama berjalan sepenuhnya di dalam peramban (browser) pengguna, dengan database IndexedDB lokal sebagai sumber kebenaran data (*source of truth*). Layanan cloud eksternal (Google Drive, Cloudflare Workers, API AI) hanya berfungsi sebagai simpul edge pendukung dan bukan server database terpusat.

```mermaid
graph TD
    subgraph Client ["Klien Peramban (PWA)"]
        UI["React 19 Reactive UI (useLiveQuery)"]
        DB[("Dexie.js IndexedDB (Skema v8 - 23 Tabel)")]
        SyncService["Mesin Sinkronisasi & Deteksi Duplikat"]
        AIEngine["Mesin Fallback AI 3-Tingkat"]
        TaxEngine["Mesin Dual-Ledger Pajak PPh"]
        TelemetryClient["Pelapor Crash Tersanitasi (Filter 7 Kolom)"]
    end

    subgraph Edge ["Infrastruktur Cloudflare Edge"]
        RelayWorker["financeflow-relay (Worker)"]
        RelayKV[("Cloudflare KV: INBOX_KV")]
        TelemWorker["financeflow-telemetry (Worker)"]
        TelemKV[("Cloudflare KV: CRASH_REPORTS_KV (TTL 30 Hari)")]
    end

    subgraph External ["Ekosistem Cloud Eksternal"]
        GDrive["Google Drive (appDataFolder)"]
        Telegram["API Telegram Bot"]
        AIProviders["API AI: Groq / Gemini / OpenRouter"]
        CoinGecko["API Publik CoinGecko (Harga Kripto)"]
    end

    UI <--> DB
    UI --> AIEngine
    UI --> TaxEngine
    SyncService <--> DB
    SyncService <-->|"Sync Inkremental Terenkripsi"| GDrive

    AIEngine -->|"Streaming Prompt / OCR"| AIProviders
    UI -->|"Valuasi Kripto Terkini"| CoinGecko

    Telegram -->|"Webhook"| RelayWorker
    RelayWorker --> RelayKV
    SyncService <-->|"Tarik Pesan Inbox"| RelayWorker

    TelemetryClient -->|"Log Crash Allow-list"| TelemWorker
    TelemWorker --> TelemKV
```

---

## 2. Arsitektur Database (Dexie Skema v8)

FinanceFlow mengelola seluruh data lokal menggunakan **Dexie.js 4.0** di atas IndexedDB peramban. Database telah berevolusi hingga **Skema Versi 8**, memuat **23 tabel relasional** lengkap dengan migrasi otomatis bertingkat yang menjamin data pengguna tidak hilang saat versi aplikasi diperbarui.

### 2.1 Peta Lengkap Tabel & Indeks Database

| Nama Tabel | Primary Key | Indeks Utama & Multi-Entry | Fungsi Utama |
| :--- | :--- | :--- | :--- |
| `accounts` | `id` | `name, type, currency, isArchived, updatedAt` | Rekening bank, dompet tunai, e-wallet, kartu |
| `categories` | `id` | `name, type, isDefault, isArchived, updatedAt` | Taksonomi kategori pengeluaran dan pemasukan |
| `transactions` | `id` | `accountId, categoryId, date, type, isTaxable, taxTreatment, syncStatus, isExcludedFromBudget, isRecurring, updatedAt` | Buku besar transaksi utama (ledger) |
| `budgets` | `id` | `categoryId, month, period, updatedAt` | Target anggaran per kategori dan periode |
| `recurring_bills` | `id` | `accountId, categoryId, frequency, nextDueDate, isActive, updatedAt` | Langganan dan tagihan rutin terjadwal |
| `debt_items` | `id` | `type, lenderOrBorrower, isSettled, dueDate, updatedAt` | Pinjaman, piutang, dan pelacakan jatuh tempo |
| `user_settings` | `key` | `updatedAt` | Preferensi pengguna, hash PIN, API key terenkripsi |
| `sync_meta` | `id` | `key, updatedAt` | Vector clock, riwayat sinkronisasi, catatan tombstone |
| `monthly_snapshots` | `month` | `totalIncome, totalExpenses, netSavings, updatedAt` | Rekapitulasi histori performa bulanan |
| `ai_rate_limits` | `id` | `provider, model, resetAt, updatedAt` | Metadata pelacakan batas penggunaan token per provider AI |
| `audit_log` | `id` | `entity, entityId, action, timestamp` | Catatan audit trail lokal yang tahan manipulasi |
| `telegram_inbox` | `id` | `chatId, status, date, updatedAt` | Antrean penampungan transaksi dari bot Telegram |
| `receipt_scans` | `id` | `transactionId, status, scannedAt, updatedAt` | Riwayat pemindaian OCR dan token teks hasil ekstraksi |
| `fx_rates` | `currency` | `baseCurrency, date, updatedAt` | Cache nilai tukar mata uang asing |
| `sync_duplicates` | `id` | `status, candidateCount, transactionIds, detectedAt, updatedAt` | Hasil deteksi transaksi kembar lintas perangkat |
| `subscription_patterns`| `id` | `merchantName, estimatedAmount, frequency, status, updatedAt` | Pola langganan berulang yang terdeteksi otomatis |
| `ai_chat_sessions` | `id` | `title, updatedAt` | Riwayat sesi percakapan dengan asisten AI |
| `receipt_attachments`| `id` | `transactionId, mimeType, createdAt` | File gambar struk asli terkompresi (Blob/Base64) |
| `financial_goals` | `id` | `status, targetDate, linkedAccountId, updatedAt` | Target tabungan dengan kalkulasi proyeksi kecepatan |
| `investment_assets` | `id` | `type, symbol, currency, isArchived, updatedAt` | Aset saham, reksadana, kripto, emas, dan properti |
| `asset_valuations` | `id` | `assetId, date, updatedAt` | Log riwayat nilai valuasi berkala per aset |
| `achievements` | `id` | `category, unlockedAt, updatedAt` | Status lencana prestasi dan gamifikasi finansial |

---

## 3. Mesin Dual-Ledger Estimator Pajak PPh Indonesia

Estimator Pajak PPh menyelesaikan persoalan mendasar dalam pencatatan keuangan: **memisahkan penerimaan bruto kena pajak dari arus kas riil di rekening bank**.

Ketika seorang kreator afiliasi menerima komisi Shopee sebesar Rp 10.000.000, Shopee otomatis memotong PPh 21 sebesar Rp 250.000 dan mentransfer nilai bersih Rp 9.750.000 ke rekening bank. Jika hanya dicatat Rp 9.750.000, pelaporan pajak akan kekurangan nilai bruto. Sebaliknya, jika dicatat Rp 10.000.000 di rekening, saldo bank akan selisih lebih Rp 250.000 dari kenyataan mutasi bank.

### 3.1 Alur Dual-Ledger

```
[Pemberi Penghasilan: Shopee / Kantor]
       │
       ├── Penghasilan Bruto Kena Pajak: Rp 10.000.000 ─┐ (Masuk Sub-sistem Pajak)
       │                                               │
       ├── Bukti Potong (Kredit PPh 21): Rp 250.000 ────┼──> Pengurang PPh Terutang
       │                                               │
       └── Kas Bersih Diterima: Rp 9.750.000           │
               │                                       │
               ▼                                       ▼
       [Buku Besar Rekening Bank]           [Kalkulator Pajak Tahunan]
       (Saldo bertambah: +Rp 9.750.000)     - Akumulasi Bruto Tahunan
                                            - Gabung Gaji Pokok Kantor (Baseline)
                                            - Kurangkan Single PTKP (TK/0 - K/3)
                                            - Hitung PKP (Penghasilan Kena Pajak)
                                            - Terapkan Tarif Progresif (5%-35%)
                                            - Kurangkan Kredit Bukti Potong
                                            - Hasil: Kurang / Lebih Bayar PPh
```

### 3.2 Implementasi Prinsip Single-PTKP
Berdasarkan ketentuan perpajakan Indonesia (UU HPP), PTKP (Penghasilan Tidak Kena Pajak) hanya boleh dikurangkan **satu kali untuk total penghasilan seorang wajib pajak dalam satu tahun pajak**, menggabungkan gaji tetap kantor dan penghasilan sampingan.

Mesin pajak mengimplementasikan aturan ini melalui kolom opsional: `otherIncomeTaxAccounted` (Gaji kantor yang sudah dipotong PPh 21 oleh pemberi kerja).
1. $\text{Total Bruto} = \sum(\text{Bruto Transaksi Sampingan}) + \text{Gaji Pokok Kantor}$
2. $\text{PKP Gabungan} = \max(0, \text{Total Bruto} - \text{PTKP})$
3. $\text{Total PPh Terutang} = \text{HitungTarifProgresif}(\text{PKP Gabungan})$
4. $\text{Sisa Pajak Disetor} = \max(0, \text{Total PPh} - \text{Total Bukti Potong} - \text{PPh 21 Gaji Kantor})$

---

## 4. Protokol Sinkronisasi Cloud & Keamanan Multi-Perangkat

FinanceFlow tidak menggunakan server database terpusat, melainkan langsung menyinkronkan data ke Google Drive pengguna melalui folder terisolasi `appDataFolder`.

```mermaid
sequenceDiagram
    autonumber
    actor Pengguna
    participant PWA as Klien FinanceFlow
    participant IDB as IndexedDB (Lokal)
    participant GDrive as Google Drive (appDataFolder)

    Pengguna->>PWA: Otorisasi Akun Google
    PWA->>PWA: Periksa Identitas Perangkat & Kunci Akun
    alt Akun Cocok dengan Pemilik Terdaftar
        PWA->>GDrive: Ambil manifest sinkronisasi & vector clock remote
        GDrive-->>PWA: Snapshot remote & data tombstone
        PWA->>PWA: Deteksi transaksi kembar lintas perangkat (fuzzy match)
        PWA->>IDB: Rekonsiliasi perubahan (Last-Write-Wins)
        PWA->>GDrive: Unggah perubahan inkremental lokal
        PWA-->>Pengguna: Tanda hijau "Synced Just Now"
    else Terdeteksi Perbedaan Akun Google
        PWA-->>Pengguna: Hentikan sinkronisasi & tampilkan Peringatan Akun Terkunci
    end
```

### 4.1 Batasan Keamanan Sinkronisasi
- **Kunci Akun Google (Account Lock)**: Akun Google pertama yang dihubungkan akan menjadi pemilik sah database. Jika pengguna mencoba login dengan akun Google yang berbeda, sinkronisasi otomatis ditolak untuk mencegah kontaminasi data antar-pengguna.
- **Deteksi Transaksi Kembar**: Transaksi yang dibuat saat offline di dua perangkat berbeda dalam rentang waktu 60 menit dengan nominal dan kategori serupa akan dicatat dalam tabel `sync_duplicates` agar pengguna dapat memilih apakah transaksi tersebut duplikat atau sah.
- **Pembersihan Data Hapus (Tombstone)**: Data yang dihapus diberi tanda `isDeleted: true` dan disebarkan ke perangkat lain. Catatan tombstone yang berusia lebih dari 90 hari akan dibersihkan otomatis saat pemeliharaan berkala.

---

## 5. Mesin Fallback AI 3-Tingkat

Asisten AI (`ai.ts`) mengelola ekstraksi cerdas dari foto struk, instruksi chat, dan rekaman suara menggunakan sistem cascade 3-tingkat:

```mermaid
flowchart TD
    Req([Permintaan Pengguna / OCR]) --> Provider1{Tingkat 1: Groq\nLlama 3.3 70B}
    Provider1 -->|Sukses ~500ms| Resp([Kembalikan JSON Terstruktur])
    Provider1 -->|Rate Limit 429 / Gangguan| Provider2{Tingkat 2: Gemini\nGemini 2.5 Flash}
    Provider2 -->|Sukses| Resp
    Provider2 -->|Rate Limit 429 / Gangguan| Provider3{Tingkat 3: OpenRouter\nGateway Multi-Model}
    Provider3 -->|Sukses| Resp
    Provider3 -->|Semua Gangguan| FallbackOffline[Parser Heuristik Lokal / Offline]
    FallbackOffline --> Resp
```

### Keunggulan Desain AI:
- **Kunci Rahasia Zero-Build**: Kredensial API disimpan terenkripsi di IndexedDB peramban, tidak pernah ditulis di source code repositori.
- **Pemantauan Kesehatan**: Pengecekan latensi dan batas kuota berkala memastikan sistem otomatis memilih penyedia paling responsif.
- **Validasi Skema JSON**: Setiap respon AI divalidasi strukturnya sebelum dimasukkan ke dalam database.

---

## 6. Cloudflare Edge Workers & Telemetri Berprinsip Privasi

### 6.1 `financeflow-relay` (Relay Webhook Telegram)
- Menerima webhook HTTP POST dari API Bot Telegram.
- Menampung antrean pesan dan URL foto secara aman di Cloudflare KV (`INBOX_KV`).
- Menerapkan enkripsi muatan berbasis PIN rahasia pengguna, sehingga worker tidak dapat membaca isi pesan transaksi.
- Tidak pernah mencatat atau bersentuhan dengan API key bank atau AI milik pengguna.

### 6.2 `financeflow-telemetry` (Pelapor Crash Berprinsip Privasi)
- Pengiriman laporan diagnostik bersifat opt-in (sukarela).
- **Filter Ketat 7 Kolom (Allow-list)**: Menolak setiap data di luar 7 kolom teknis berikut:
  `errorName`, `errorMessage`, `componentStack`, `url`, `userAgent`, `timestamp`, `version`.
- **Jaminan Nol Data Finansial**: Nama transaksi, nama akun, saldo, nominal, dan API key secara matematis tidak dapat dikirimkan karena langsung dibuang oleh filter skema.
- **Penyimpanan Permanen KV dengan Auto-TTL**: Disimpan durabel di Cloudflare KV (`CRASH_REPORTS_KV`) dengan masa kedaluwarsa otomatis 30 hari (`expirationTtl: 2592000`).

---

## 7. Metrik Kinerja & Ukuran Bundle

- **Ukuran Bundle Awal**: ~320–330 kB gzip (mencakup pustaka Chart.js, ikon Lucide, dan Dexie).
- **Time to Interactive (TTI)**: < 600ms pada koneksi seluler standar 4G.
- **Latensi Kueri Database**: < 5ms untuk kueri berindeks menggunakan Dexie `useLiveQuery`.
- **Cakupan Pengujian Otomatis**: 27 test suite integrasi selesai dalam tempo < 15 detik.
