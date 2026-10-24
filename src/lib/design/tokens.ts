/**
 * Salinan token warna untuk konteks yang tidak bisa membaca variabel CSS
 * (SVG yang dibuat di server, QR, gaya peta, grafik). Harus sama persis
 * dengan `src/app/globals.css` dan DESIGN.md.
 */
export const warna = {
  aspal: "#1C2620",
  aspal2: "#46534B",
  putih: "#FFFFFF",
  abu: "#F3F2EC",
  pasir: "#F6F3EA",
  garis: "#D9DDD0",
  garisTegas: "#66705F",
  kuning: "#FFC629",
  biru: "#1F57B8",
  hijau: "#1F7A4A",
  oranye: "#B85412",
  merah: "#B42318",
  hutan: "#17432D",
  hutan2: "#235A3D",
  daun: "#3B8B5A",
  lumut: "#E4EFDC",
  lumut2: "#F1F7EC",
  tanah: "#8B5A2B",
  emas: "#C9962B",
  medanMerah: "#A3191E",
  medanBiru: "#17216B",
} as const;

export type NamaWarna = keyof typeof warna;

/**
 * Palet peta natural (gaya vektor MapLibre tidak bisa membaca variabel CSS).
 * Dipakai oleh `src/components/peta/gaya-peta.ts`.
 */
export const warnaPeta = {
  kertas: "#F6F3EA",
  taman: "#CFE3BC",
  tamanTepi: "#E3EFD6",
  hutan: "#B9D6A0",
  rumput: "#CFE2B8",
  lapangan: "#D7E5C4",
  makam: "#C8DDB0",
  sekolah: "#ECEED3",
  hunian: "#EFE9DA",
  air: "#A9D3DD",
  sungai: "#8EC3D0",
  pasir: "#F2E7C6",
  bangunan: "#E6DFCF",
  bangunanTepi: "#D6CDB8",
  jalanKecil: "#FFFFFF",
  jalanKecilTepi: "#E3DBC8",
  jalanSedang: "#FBE9B0",
  jalanSedangTepi: "#E5C987",
  jalanBesar: "#F6C26A",
  jalanBesarTepi: "#DDA55A",
  rel: "#C9C3B5",
  batas: "#B9B09C",
  teks: "#2F3B2D",
  teksHalo: "#F9F7F0",
} as const;
