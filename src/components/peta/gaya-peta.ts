import type { StyleSpecification } from "maplibre-gl";
import { warnaPeta as WARNA } from "@/lib/design/tokens";

/**
 * Peta gratis tanpa kunci API: ubin vektor OpenFreeMap (data © kontributor
 * OpenStreetMap, ODbL). Atribusi tampil otomatis di sudut peta. Gaya dasarnya
 * "liberty" diambil saat peta dibuka lalu diwarnai ulang ke palet natural
 * ONE PORTAL: kertas hangat, sawah dan hutan hijau lembut, air teal muda.
 * Lapisan yang tidak dikenal dibiarkan, jadi pembaruan gaya di OpenFreeMap
 * tidak merusak peta.
 */
export const URL_GAYA_DASAR = "https://tiles.openfreemap.org/styles/liberty";

export const PUSAT_MEDAN = { lat: 3.595, lng: 98.672 };
/** Kotak longgar di sekitar Kota Medan: [barat, selatan, timur, utara]. */
export const BATAS_PETA: [[number, number], [number, number]] = [
  [98.45, 3.38],
  [98.9, 3.92],
];

type Paint = Record<string, unknown>;

function paintJalan(id: string): Paint | null {
  const casing = id.includes("casing");
  const kelas = id.includes("motorway")
    ? "besar"
    : id.includes("trunk_primary") || id.includes("secondary_tertiary") || id.includes("_link")
      ? "sedang"
      : "kecil";
  if (casing) {
    return {
      "line-color": kelas === "besar" ? WARNA.jalanBesarTepi : kelas === "sedang" ? WARNA.jalanSedangTepi : WARNA.jalanKecilTepi,
    };
  }
  if (/rail/.test(id)) return { "line-color": WARNA.rel };
  if (/path_pedestrian/.test(id)) return { "line-color": WARNA.jalanKecil };
  return { "line-color": kelas === "besar" ? WARNA.jalanBesar : kelas === "sedang" ? WARNA.jalanSedang : WARNA.jalanKecil };
}

const TETAP: Record<string, Paint> = {
  background: { "background-color": WARNA.kertas },
  park: { "fill-color": WARNA.taman, "fill-opacity": 0.8, "fill-outline-color": WARNA.tamanTepi },
  park_outline: { "line-color": WARNA.tamanTepi },
  landuse_residential: { "fill-color": WARNA.hunian, "fill-opacity": 0.55 },
  landcover_wood: { "fill-color": WARNA.hutan, "fill-opacity": 0.5 },
  landcover_grass: { "fill-color": WARNA.rumput, "fill-opacity": 0.45 },
  landuse_pitch: { "fill-color": WARNA.lapangan },
  landuse_track: { "fill-color": WARNA.lapangan },
  landuse_cemetery: { "fill-color": WARNA.makam },
  landuse_school: { "fill-color": WARNA.sekolah },
  landcover_sand: { "fill-color": WARNA.pasir },
  water: { "fill-color": WARNA.air },
  waterway_river: { "line-color": WARNA.sungai },
  waterway_other: { "line-color": WARNA.sungai },
  waterway_tunnel: { "line-color": WARNA.sungai },
  building: { "fill-color": WARNA.bangunan, "fill-outline-color": WARNA.bangunanTepi },
  boundary_3: { "line-color": WARNA.batas },
  boundary_2: { "line-color": WARNA.batas },
  boundary_disputed: { "line-color": WARNA.batas },
};

type LapisGaya = { id: string; type: string; paint?: Paint; layout?: Record<string, unknown> };

/** Warnai ulang gaya dasar ke palet natural. Mengembalikan salinan baru. */
export function bumbuiGayaNatural(dasar: StyleSpecification): StyleSpecification {
  const gaya = structuredClone(dasar) as StyleSpecification & { layers: LapisGaya[] };
  for (const lapis of gaya.layers) {
    lapis.paint ??= {};
    const tetap = TETAP[lapis.id];
    if (tetap) {
      Object.assign(lapis.paint, tetap);
    } else if (lapis.type === "line" && /^(road|tunnel|bridge)_/.test(lapis.id)) {
      const p = paintJalan(lapis.id);
      if (p) Object.assign(lapis.paint, p);
    } else if (lapis.type === "symbol") {
      lapis.paint["text-color"] = WARNA.teks;
      lapis.paint["text-halo-color"] = WARNA.teksHalo;
    }
    // Gedung 3D berat untuk HP murah dan menutupi marker; cukup gedung datar.
    if (lapis.id === "building-3d") {
      lapis.layout = { ...lapis.layout, visibility: "none" };
    }
    // Titik minat kecil memenuhi peta tanpa menambah petunjuk lokasi.
    if (lapis.id === "poi_r1") {
      lapis.layout = { ...lapis.layout, visibility: "none" };
    }
  }
  return gaya;
}

let janjiGaya: Promise<StyleSpecification> | null = null;

/** Ambil dan warnai gaya sekali per sesi halaman; gagal = coba lagi pada pemanggilan berikutnya. */
export function ambilGayaNatural(): Promise<StyleSpecification> {
  janjiGaya ??= fetch(URL_GAYA_DASAR)
    .then((r) => {
      if (!r.ok) throw new Error(`gaya peta ${r.status}`);
      return r.json() as Promise<StyleSpecification>;
    })
    .then(bumbuiGayaNatural)
    .catch((e) => {
      janjiGaya = null;
      throw e;
    });
  return janjiGaya;
}

/** Teks antarmuka MapLibre dalam Bahasa Indonesia. */
export const TEKS_PETA: Record<string, string> = {
  "AttributionControl.ToggleAttribution": "Tampilkan atau sembunyikan atribusi",
  "AttributionControl.MapFeedback": "Umpan balik peta",
  "NavigationControl.ZoomIn": "Perbesar peta",
  "NavigationControl.ZoomOut": "Perkecil peta",
  "NavigationControl.ResetBearing": "Kembalikan arah ke utara",
  "CooperativeGesturesHandler.WindowsHelpText": "Tahan Ctrl sambil menggulir untuk memperbesar peta",
  "CooperativeGesturesHandler.MacHelpText": "Tahan ⌘ sambil menggulir untuk memperbesar peta",
  "CooperativeGesturesHandler.MobileHelpText": "Gunakan dua jari untuk menggeser peta",
  "FullscreenControl.Enter": "Layar penuh",
  "FullscreenControl.Exit": "Keluar dari layar penuh",
};
