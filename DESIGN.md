# DESIGN.md — Sistem desain ONE PORTAL "rambu kota"

Dokumen ini adalah sumber kebenaran tampilan ONE PORTAL. Semua halaman hanya memakai token dan komponen di sini. Butuh token baru? Tambahkan ke dokumen ini dulu, lalu ke `src/app/globals.css`.

Pratinjau hidup: halaman [`/desain`](src/app/desain/page.tsx).

## 1. Konsep

ONE PORTAL harus terasa seperti papan informasi publik yang dirancang dengan baik: terbaca dari jauh, warnanya punya arti, tanpa hiasan. Sekitar 90% antarmuka polos. Kekhasan hanya muncul di lima momen (bagian 6).

Setiap keputusan diturunkan dari benda yang sudah dikenal warga Medan:

| Benda sehari-hari | Dipakai untuk | Alasan |
|---|---|---|
| Rambu lalu lintas | Palet warna dan pelat kategori | Orang sudah tahu kuning = perhatian, merah = bahaya, hijau = aman |
| Resi pengiriman kurir | Bukti laporan dan log lacak | Warga sudah terbiasa "cek resi" |
| Cap kantor kelurahan | Penanda "Selesai" | Tanda resmi bahwa sesuatu sudah disahkan |
| Aplikasi ojek online | Pemilih lokasi (peta digeser, pin tetap) | Pola yang sudah dikuasai pengguna HP |

Prinsip: tugas dulu; warna = arti; konten nyata adalah hiasannya; satu hal satu cara; untuk semua orang (lansia, HP murah, sinyal lemah, petugas di bawah terik).

## 2. Warna

Semua pasangan teks–latar lulus WCAG AA. Rasio dihitung terhadap putih #FFFFFF kecuali disebut lain.

| Token | Hex | Tailwind | Dipakai untuk | Kontras |
|---|---|---|---|---|
| aspal | #1E2226 | `aspal` | Teks utama, tombol utama, pelat kategori | 16,0:1 (14,4:1 di abu) |
| aspal-2 | #4A4F55 | `aspal-2` | Teks pendukung, status menunggu | 8,3:1 (7,4:1 di abu) |
| putih | #FFFFFF | `putih` | Latar utama, kolom isian | — |
| abu | #F2F3F1 | `abu` | Latar bagian/panel, latar chip | — |
| garis | #D5D8D4 | `garis` | Pemisah, border kartu | dekoratif (1,4:1) |
| garis-tegas | #6B7076 | `garis-tegas` | Border kolom isian, checkbox, radio | 5,0:1 (≥3:1 untuk komponen) |
| kuning-rambu | #FFC629 | `kuning` | Tombol "Lapor masalah", penanda "Perlu tindakan Anda", sorotan fokus | aspal di atas kuning 10,2:1 |
| biru-petunjuk | #1F57B8 | `biru` | Tautan (selalu bergaris bawah di dalam teks), status sedang dikerjakan | 6,7:1 (6,1:1 di abu) |
| hijau-selesai | #1F7A4A | `hijau` | Hanya status selesai | 5,3:1 (4,8:1 di abu) |
| oranye | #B85412 | `oranye` | Prioritas tinggi, laporan berulang | 4,9:1 (4,4:1 di abu: hanya untuk ikon, bukan teks) |
| merah | #B42318 | `merah` | Darurat, terlambat, error, aksi berbahaya | 6,6:1 (5,9:1 di abu); putih di atas merah 6,6:1 |
| medan-merah | #A3191E | `medan-merah` | Hanya logo "Medan Untuk Semua" dan hero beranda (bagian 6, momen 5) | putih di atas medan-merah 7,7:1 |
| medan-biru | #17216B | `medan-biru` | Hanya logo "Medan Untuk Semua" dan hero beranda | putih 14,3:1; kuning-rambu 9,4:1 |

Aturan:
- Kuning hanya untuk tiga hal di atas. Teks di atas kuning selalu aspal.
- Tombol: utama = aspal + teks putih; kedua = garis tepi aspal; ketiga = tautan biru. "Lapor masalah" satu-satunya tombol kuning.
- Warna tidak pernah berdiri sendiri: selalu disertai teks dan ikon/bentuk.
- Tidak dipakai: ungu/indigo/violet, gradien, glow, krem/beige, emerald, dark mode. Gantinya mode kontras tinggi (`data-kontras="tinggi"` pada `<html>`), yang menggelapkan aspal-2 dan garis-tegas serta menebalkan border.
- Palet bawaan Tailwind dimatikan (`--color-*: initial`), jadi `bg-indigo-500` dan sejenisnya tidak akan menghasilkan CSS.
- Kode warna mentah hanya boleh ada di `src/app/globals.css` dan `src/lib/design/tokens.ts` (untuk SVG, QR, peta, dan grafik yang tidak bisa membaca variabel CSS).

### Pemetaan status

Sama di chip, titik peta, timeline, dan grafik.

| Status (kode) | Label | Kelompok | Warna | Ikon |
|---|---|---|---|---|
| SUBMITTED | Diterima | menunggu ditangani | aspal-2 | Tray |
| VERIFIED | Diverifikasi | menunggu ditangani | aspal-2 | SealCheck |
| ASSIGNED | Ditugaskan | menunggu ditangani | aspal-2 | UserCirclePlus |
| IN_PROGRESS | Dikerjakan | sedang dikerjakan | biru | Wrench |
| UNDER_REVIEW | Peninjauan bukti | sedang dikerjakan | biru | Eye |
| RESOLVED | Selesai | selesai | hijau | CheckCircle |
| REJECTED | Ditolak | ditolak | merah | XCircle |
| FORWARDED | Diteruskan | dialihkan | aspal-2 | ArrowBendUpRight |
| MERGED | Digabungkan | dialihkan | aspal-2 | GitMerge |

Chip status: ikon berwarna + teks aspal di atas abu. Latar penuh hanya untuk:
- "Darurat": latar merah, teks putih, ikon Siren.
- "Perlu tindakan Anda": latar kuning, teks aspal, ikon HandPointing.

Prioritas: Darurat (latar penuh merah), Tinggi (ikon ArrowFatUp oranye), Sedang dan Rendah netral.
Laporan berulang: ikon Repeat oranye + teks "Laporan berulang".
SLA: Tepat waktu (netral, Clock), Hampir jatuh tempo (netral, HourglassHigh, teks tebal), Terlambat (merah, WarningCircle), Selesai tepat waktu (hijau, CheckCircle), Selesai terlambat (merah, WarningCircle).

## 3. Tipografi

- **Atkinson Hyperlegible Next** untuk semua teks. Dibuat Braille Institute untuk pembaca dengan penglihatan rendah, jadi cocok untuk warga lansia.
- **Atkinson Hyperlegible Mono** HANYA untuk kode laporan/area (`OP-2026-00182`), agar 0/O dan 1/I/l tidak tertukar saat kode dibacakan lewat telepon. Bukan untuk label, jam, atau hiasan. Kelas: `font-kode`.
- Font dimuat lewat `next/font/google` (di-host sendiri saat build, tanpa permintaan ke Google dari browser).

| Token | Ukuran | Line-height | Dipakai untuk |
|---|---|---|---|
| `text-publik` | 17 px (HP) → 18 px (≥1024 px) | 1,55 | Teks bacaan halaman publik (diatur di `<body>` layout publik) |
| `text-staf` | 16 px | 1,55 | Teks admin, supervisor, petugas |
| `text-kecil` | 15 px | 1,5 | Teks kecil publik (minimum) |
| `text-kecil-staf` | 14 px | 1,45 | Teks kecil staf (minimum) |
| `text-h3` | 20 → 22 px | 1,2 | Subjudul |
| `text-h2` | 24 → 30 px (clamp) | 1,2 | Judul bagian |
| `text-h1` | 30 → 40 px (clamp) | 1,2 | Judul halaman |
| `text-kode-besar` | 28 → 36 px (clamp) | 1,1 | Kode laporan di resi |

- Bobot: 400 teks, 600 label dan tombol (`font-semibold`), 700 judul (`font-bold`), 800 hanya untuk logo.
- Lebar baca maksimal ±68 karakter (`max-w-baca` = 68ch).
- Angka di tabel memakai `tabular-nums`. Belum diverifikasi apakah Atkinson Hyperlegible Next mendukung fitur `tnum`. Jika tidak, kolom angka memakai `font-kode` (satu-satunya pengecualian aturan Mono).
- Sentence case untuk judul, tombol, label, dan status ("Kirim laporan", "Peninjauan bukti"). Huruf kapital hanya untuk nama diri (ONE PORTAL, Medan Denai, Dinas SDABMBK).
- Tanpa: label kecil kapital berspasi di atas judul, satu kata berwarna/miring di dalam judul, teks gradien, serif.

## 4. Bentuk dan ruang

**Spasi** (kelipatan 4 px; Tailwind `--spacing: 4px`). Hanya langkah berikut yang dipakai untuk padding, margin, dan gap:

| px | 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96 |
|---|---|---|---|---|---|---|---|---|---|
| kelas | 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16 | 24 |

Rapatkan hal yang berkaitan, renggangkan antarbagian. Jangan padding seragam di mana-mana. Ukuran elemen (lebar/tinggi) seperti target sentuh 44 px (`min-h-11`) boleh di luar tabel ini.

**Lebar wadah**

| Token | Lebar | Untuk |
|---|---|---|
| `max-w-baca` | 68ch | Paragraf |
| `max-w-teks` | 720 px | Halaman bacaan (berita, kebijakan) |
| `max-w-daftar` | 960 px | Daftar dan form |
| `max-w-form` | 560 px | Form di tablet |
| (tanpa batas) | layar penuh | Dashboard dan peta |

**Radius**

| Token | Nilai | Untuk |
|---|---|---|
| `rounded-sm` | 4 px | Tombol, input, chip, pelat kategori, thumbnail bukti |
| `rounded-md` | 8 px | Kartu, panel, dialog, toast |
| `rounded-lg` | 12 px | HANYA sisi atas bottom sheet (`rounded-t-lg`) |
| `rounded-full` | — | HANYA avatar inisial dan titik status |

Tanpa tombol pil, tanpa radius besar di semua elemen.

**Garis dan bayangan**
- Kolom isian: border 2 px `garis-tegas`. Pemisah lain: border 1 px `garis`.
- Satu token bayangan, `shadow-lapis`, hanya untuk lapisan melayang (menu, dialog, sheet, popup peta, toast).

**Kartu** hanya untuk objek yang bisa diklik (laporan, layanan, tugas). Satu tingkat wadah: tanpa kartu di dalam kartu, tanpa garis warna di sisi kiri kartu.

## 5. Ikon, gambar, gerak

- Satu set ikon: Phosphor. Regular untuk UI, Fill untuk pelat kategori. Ikon hanya untuk navigasi, kategori, status, dan aksi; tidak menempel di setiap judul. Tanpa sparkles, roket, petir, perisai, atau panah di setiap tombol.
- Komponen server memakai `@phosphor-icons/react/ssr`.
- **Pelat kategori**: piktogram putih (Fill) di atas persegi aspal radius 4 px, seperti rambu.

| Kategori | Ikon |
|---|---|
| Jalan rusak | RoadHorizon |
| Drainase & genangan/banjir | Waves |
| Sampah | Trash |
| Lampu jalan mati | Lightbulb |
| Air bersih | Drop |
| Fasilitas umum & taman | Park |
| Lalu lintas & parkir | TrafficSign |
| Pohon tumbang & bencana | Tree |
| Pelayanan publik | Buildings |
| Lainnya | DotsThreeOutline |

- Foto: foto asli tim di Medan, rasio 4:3, cahaya alami, tanpa filter; wajah dan plat nomor diburamkan; diberi keterangan lokasi dan tanggal. Gambar selalu memakai rasio aspek tetap.
- Tidak dipakai: gambar buatan AI, foto stok, ilustrasi 3D/isometrik/orang datar, avatar generator (pakai inisial), blob, grain, pola titik, mockup jendela palsu.
- Empty state: satu kalimat yang membantu + satu aksi, tanpa ilustrasi.
- Logo: wordmark ONE PORTAL dalam Atkinson Hyperlegible Next ExtraBold; huruf O pertama diganti tanda titik lokasi. Datar.
- Peta: tile OpenStreetMap didesaturasi; atribusi tetap terlihat.
- **Gerak** hanya sebagai umpan balik perubahan: `duration-150`/`duration-200` dengan `ease-keluar`; sheet/dialog 220 ms (`duration-sheet`); tanpa pantulan. `prefers-reduced-motion` mematikan semua animasi dan transisi secara global.
- Tidak dipakai: animasi muncul saat scroll, parallax, angka menghitung naik, efek mengetik, kartu membesar/terangkat saat hover, latar beranimasi, shimmer.

## 6. Lima momen khas (jangan menambah sendiri)

1. **Tombol "Lapor masalah"** kuning-rambu. Di bottom nav HP menjadi tab tengah berpelat kuning, bukan tombol bulat melayang. Komponen: `Tombol varian="lapor"`, `NavBawah`.
2. **Resi laporan**: kode Mono besar + tombol salin, garis putus-putus seperti sobekan, QR, tanggal, kalimat "Simpan atau screenshot resi ini". Halaman lacak memakai log seperti cek resi kurir (kiri tanggal–jam, kanan kejadian, terbaru di atas). Komponen: `Resi`, `LogResi`.
3. **Cap "SELESAI"**: stempel hijau miring −4° dengan tepi sedikit tidak rata. Animasi masuk sekali (prop `baru`) saat admin menyetujui bukti, lalu menetap di resi, halaman lacak, dan panel laporan selesai di peta. Tidak dipakai di tempat lain. Komponen: `CapSelesai`.
4. **Bukti di peta**: titik hijau; pada zoom ≥15 menjadi thumbnail foto "sesudah" berbingkai hijau 2 px radius 4 px. Panel detail memakai penggeser sebelum–sesudah berpegangan vertikal dengan label "Sebelum, 12 Okt" / "Sesudah, 14 Okt". (Dibangun di Fase 4–5.)

5. **Hero beranda "Medan Untuk Semua"** (hanya di `/`). Latar biru-medan dengan kisi belah ketupat bergaya songket (`corak-songket`) dan deret pucuk rebung merah-kuning di tepi bawah (`corak-rebung`), ragam hias Melayu Deli. Memuat logo `LogoMedan`, tombol Lapor, form lacak, dan slideshow foto. Aturan:
   - Corak datar, tanpa gradien, tanpa gerak; didefinisikan sebagai SVG data URI di `globals.css`.
   - Foto slide menjadi **latar penuh hero** (`LatarSlideHero`): berganti otomatis tiap 2 detik (`DURASI_SLIDE_MS`) dengan memudar 1,2 detik dan zoom pelan (`animate-ken-burns`), tanpa tombol. Tirai gelap `tirai-hero` menjaga kontras teks putih. Berhenti saat tab tidak aktif, hero di luar layar, atau kursor/fokus ada di kartu keterangan; diam di foto pertama bila pengguna memilih `prefers-reduced-motion`.
   - Judul hero memakai kata yang berganti (`KataBerganti`) untuk jenis masalah kota; pembaca layar mendapat kalimat lengkap yang diam.
   - Slide dikelola admin di `/admin/slide` (tabel `banners`, bucket publik `konten`). Tanpa slide aktif, beranda memakai tiga slide teks bawaan, bukan foto stok.
   - Foto slide tetap foto asli tim (aturan bagian 5). Judul slide singkat karena hanya tampil 2 detik.

## 7. Komponen

Semua di `src/components/ui/`. Halaman tidak boleh membuat komponen baru yang meniru komponen ini.

| Komponen | File | Aturan |
|---|---|---|
| `Tombol`, `TombolTautan`, `kelasTombol()` | `tombol.tsx` | Varian `utama`, `kedua`, `ketiga`, `lapor`, `bahaya`. Ukuran `normal` (min 44 px) dan `besar` (min 56 px, untuk petugas). State `memuat` menonaktifkan tombol dan menampilkan teks proses ("Mengirim…"). Label menyebut hasilnya. |
| `Kolom`, `Masukan`, `AreaTeks`, `Pilihan`, `KotakCentang`, `Radio` | `isian.tsx` | Label di atas kolom (bukan floating), petunjuk di bawah label, pesan error di bawah kolom dengan ikon. Teks isian ≥16 px. Border 2 px garis-tegas; error = border merah. |
| `RingkasanError` | `isian.tsx` | Di atas form; daftar tautan ke kolom yang salah. |
| `ChipStatus`, `ChipPrioritas`, `ChipSla`, `ChipBerulang`, `ChipTindakan` | `chip.tsx` | Lihat pemetaan status. Chip hanya mewakili status nyata. |
| `PelatKategori` | `pelat-kategori.tsx` | Ukuran `kecil` 24 px, `sedang` 32 px, `besar` 48 px. |
| `Kartu` | `kartu.tsx` | Selalu berupa tautan. Hover hanya mengubah border menjadi aspal. |
| `Tabel*`, `DaftarRingkas` | `tabel.tsx` | Di HP tabel diganti daftar ringkas (3 info + status). Angka rata kanan, `tabular-nums`. |
| `PenyediaToast`, `useToast` | `toast.tsx` | Radix Toast; `aria-live`. Pesan spesifik ("Laporan terkirim"), bukan "Berhasil!". |
| `Resi` | `resi.tsx` | Momen khas 2. |
| `LogResi` | `log-resi.tsx` | Timeline gaya cek resi. Label aktor berupa peran/instansi, bukan nama pribadi. |
| `CapSelesai` | `cap-selesai.tsx` | Momen khas 3. |
| `Logo` | `logo.tsx` | Wordmark. |
| `LogoMedan` | `logo-medan.tsx` | Logo "Medan Untuk Semua" (kotak merah + kotak biru). Memakai berkas asli `public/logo-medan-transparan.png` (latar transparan, huruf putih) langsung di atas latar, dengan bayangan lembut `bayang-logo`. |
| `LatarSlideHero` | `latar-slide-hero.tsx` | Foto slide sebagai latar penuh hero, otomatis 2 detik tanpa tombol (momen khas 5). |
| `KataBerganti` | `kata-berganti.tsx` | Kata yang berganti halus di dalam kalimat, lebar tetap. |
| `LayarKosong`, `PesanGagal`, `Kerangka` | `keadaan.tsx` | Empty, error (dengan tombol coba lagi), skeleton (tanpa shimmer). |
| `Dialog`, `DialogKonfirmasi` | `dialog.tsx` | Radix Dialog; aksi berisiko memakai tombol `bahaya`. |

## 8. Tulisan

Bahasa Indonesia baku yang hangat, memakai "Anda", kalimat pendek dan spesifik. Kata kerja tombol konsisten sampai notifikasi ("Kirim laporan" → "Laporan terkirim").

- Menu: Layanan, Lapor, Lacak, Peta, Statistik. Nama modul ONE SERVICE dan sejenisnya hanya untuk proposal.
- Waktu selalu WIB: "13 Okt 2026, 09.10 WIB" (`formatWaktu` di `src/lib/format.ts`). Angka id-ID: 1.234 dan 87,5%.
- Angka di halaman publik diberi catatan kecil "Data simulasi prototipe".
- Tidak dipakai: revolusi, inovatif, di ujung jari, era digital, seamless, memberdayakan, wujudkan, kami hadir untuk Anda, Oops, tanda seru beruntun, tiga kata sifat berderet, panah di label, tanda pisah berlebihan.

## 9. Aksesibilitas

Heading berurutan; landmark header/nav/main/footer; label di setiap kolom; alt text yang menjelaskan isi foto; skip link "Langsung ke isi"; `aria-live` untuk toast; kontras AA; target sentuh ≥44 px; tidak ada aksi yang hanya muncul saat hover.

Fokus keyboard (`:focus-visible`, global): cincin aspal 2 px dikelilingi kuning-rambu 3 px. Terlihat di latar putih maupun kuning.

## 10. Responsif

| Pola | HP (<768 px) | Tablet (768–1023 px) | Laptop (≥1024 px) |
|---|---|---|---|
| Navigasi warga & petugas | bottom nav 5 tab | header | header |
| Navigasi admin | drawer | drawer | sidebar |
| Tabel | daftar ringkas | tabel, kolom pertama menempel | tabel penuh |
| Form | 1 kolom, tombol menempel di bawah | 1 kolom, maks. 560 px | 1 kolom + ringkasan di samping |

Breakpoint: `md` = 768 px, `lg` = 1024 px. Peta layar penuh memakai `dvh`; bottom nav memperhitungkan safe area.

## 11. Audit otomatis

`npm run audit:desain` memindai `src/` untuk pola terlarang (gradien, backdrop-blur, warna ungu, `rounded-2xl`, `hover:scale`, `uppercase tracking-widest`, kode warna mentah di luar file token, `style=` inline, emoji, ikon Sparkles/Rocket/Lightning). Jalankan sebelum setiap commit. Audit manual tetap mengikuti bagian 9 PROMPT 3.
