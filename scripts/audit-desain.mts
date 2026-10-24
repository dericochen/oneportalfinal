/**
 * Audit "rasa AI" otomatis (DESIGN.md §11, PROMPT 3 §8). Tema v2 "natural Nusantara":
 * gerak halus (muncul saat gulir, hitung naik, hover terangkat 2 px) kini diizinkan;
 * gradien hanya di globals.css (utilitas bernama); selebihnya tetap dijaga.
 * Memindai src/ untuk pola terlarang. Baris yang memang perlu pengecualian
 * diberi komentar `audit-izin: <alasan>` di baris yang sama.
 *
 *   npm run audit:desain
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const AKAR = join(import.meta.dirname, "..", "src");
const BOLEH_WARNA_MENTAH = [join("app", "globals.css"), join("lib", "design", "tokens.ts")];
const HANYA_GLOBALS = [join("app", "globals.css")];

type Aturan = { nama: string; pola: RegExp; kecuali?: (file: string) => boolean };

const ATURAN: Aturan[] = [
  {
    nama: "gradien di luar globals.css",
    pola: /bg-gradient|linear-gradient|radial-gradient|conic-gradient|bg-linear-|bg-radial-|bg-conic-/,
    kecuali: (f) => HANYA_GLOBALS.some((b) => f.endsWith(b)),
  },
  { nama: "teks gradien", pola: /bg-clip-text/ },
  { nama: "glassmorphism", pola: /backdrop-blur|backdrop-filter/ },
  { nama: "warna ungu/indigo", pola: /\b(?:indigo|violet|purple|fuchsia)-\d{2,3}\b/ },
  { nama: "warna bawaan Tailwind", pola: /\b(?:bg|text|border|ring|fill|stroke)-(?:slate|zinc|gray|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|pink|rose)-\d{2,3}\b/ },
  { nama: "bayangan besar", pola: /\bshadow-(?:sm|md|lg|xl|2xl)\b/ },
  { nama: "radius besar", pola: /\brounded(?:-[trbl]{1,2})?-(?:xl|2xl|3xl|4xl)\b/ },
  // Boleh: hover:scale-105 dan hover:-translate-y-0.5 (terangkat 2 px). Dilarang: yang lebih besar.
  { nama: "hover membesar/terangkat berlebihan", pola: /hover:(?:scale-(?:1[1-9]\d|[2-9]\d\d)|-translate-y-(?!0\.5\b|px\b)|translate-y-)/ },
  { nama: "animasi pantul/denyut", pola: /animate-(?:bounce|pulse|ping)\b/ },
  // Muncul saat gulir dan hitung naik hanya lewat komponen Muncul dan AngkaHitung (bukan pustaka animasi).
  { nama: "pustaka animasi scroll pihak ketiga", pola: /whileInView|fade-up|data-aos|framer-motion|react-countup|NumberTicker/ },
  { nama: "label kapital berspasi", pola: /uppercase[^"'`]*tracking-(?:wide|wider|widest)|tracking-(?:wider|widest)[^"'`]*uppercase/ },
  { nama: "ikon klise", pola: /\b(?:Sparkle|Sparkles|Rocket|RocketLaunch|Lightning|ShieldCheck|MagicWand)\b/ },
  { nama: "garis warna di sisi kiri kartu", pola: /\bborder-l-(?:2|4|8)\b/ },
  {
    nama: "kode warna mentah di luar file token",
    pola: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-zA-Z-])|rgba?\(\s*\d/,
    kecuali: (f) => BOLEH_WARNA_MENTAH.some((b) => f.endsWith(b)),
  },
  { nama: "inline style", pola: /\bstyle=\{/ },
  // Rentang emoji umum (simbol bergambar), bukan tanda baca biasa.
  { nama: "emoji", pola: /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u },
  { nama: "font terlarang", pola: /\b(?:Inter|Geist|Poppins|Plus_Jakarta|DM_Sans|Montserrat|Space_Grotesk|Sora|Instrument_Serif)\b/ },
];

function semuaFile(dir: string): string[] {
  return readdirSync(dir).flatMap((nama) => {
    const p = join(dir, nama);
    if (statSync(p).isDirectory()) return semuaFile(p);
    return /\.(tsx?|css|mts)$/.test(nama) ? [p] : [];
  });
}

let jumlah = 0;
for (const file of semuaFile(AKAR)) {
  const rel = relative(AKAR, file);
  const baris = readFileSync(file, "utf8").split(/\r?\n/);
  baris.forEach((isi, i) => {
    if (isi.includes("audit-izin:")) return;
    for (const a of ATURAN) {
      if (a.kecuali?.(rel)) continue;
      // Kode warna di URL/ID tautan (#isi, #judul) bukan warna: hanya cek di luar href.
      if (a.nama.startsWith("kode warna") && /href=|#isi|`#\$\{/.test(isi)) continue;
      if (a.pola.test(isi)) {
        jumlah++;
        console.log(`src${sep}${rel}:${i + 1}  [${a.nama}]  ${isi.trim().slice(0, 120)}`);
      }
    }
  });
}

if (jumlah > 0) {
  console.log(`\n${jumlah} temuan. Perbaiki atau beri komentar "audit-izin: <alasan>".`);
  process.exit(1);
}
console.log("Audit desain bersih: tidak ada pola terlarang di src/.");
