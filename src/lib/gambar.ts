/**
 * Pengolah gambar di browser (canvas). Memuat gambar dengan orientasi EXIF yang
 * benar, lalu menggambar ulang sebagai JPEG sehingga metadata (GPS, merek HP)
 * ikut terbuang. Dipakai unggah foto laporan dan unggah foto slide beranda.
 */

export async function muatGambar(berkas: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(berkas, { imageOrientation: "from-image" });
    } catch {
      // jatuh ke <img> (mis. format yang tidak didukung createImageBitmap)
    }
  }
  const url = URL.createObjectURL(berkas);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function perkecil(sumber: ImageBitmap | HTMLImageElement, sisi: number, mutu: number) {
  const skala = Math.min(1, sisi / Math.max(sumber.width, sumber.height));
  const w = Math.round(sumber.width * skala);
  const h = Math.round(sumber.height * skala);
  const kanvas = document.createElement("canvas");
  kanvas.width = w;
  kanvas.height = h;
  kanvas.getContext("2d")!.drawImage(sumber, 0, 0, w, h);
  const blob = await new Promise<Blob>((ok, gagal) =>
    kanvas.toBlob((b) => (b ? ok(b) : gagal(new Error("kompres gagal"))), "image/jpeg", mutu),
  );
  return { blob, w, h };
}
