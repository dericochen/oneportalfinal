"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { MapTrifold } from "@phosphor-icons/react";
import type { Map as PetaMapLibre, Marker as PenandaMapLibre } from "maplibre-gl";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";
import { ambilGayaNatural, BATAS_PETA, PUSAT_MEDAN, TEKS_PETA } from "./gaya-peta";

/**
 * Kanvas peta gratis: MapLibre GL + ubin OpenFreeMap (tanpa kunci API).
 * - Pustaka dimuat malas: hanya setelah kanvas hampir terlihat di layar.
 * - Bila WebGL tidak tersedia atau gaya gagal dimuat, `cadangan` ditampilkan.
 * - Anak-anaknya (penanda, kontrol) baru dirender setelah peta siap dan
 *   membaca peta lewat `usePeta()`.
 */
type MapLibre = typeof import("maplibre-gl");
type Konteks = { peta: PetaMapLibre; ml: MapLibre };

const KonteksPeta = createContext<Konteks | null>(null);

export function usePeta(): Konteks {
  const k = useContext(KonteksPeta);
  if (!k) throw new Error("usePeta harus dipakai di dalam KanvasPeta");
  return k;
}

let pekerjaDiatur = false;

export function CadanganPeta({ jumlah, className, pesan }: { jumlah?: number; className?: string; pesan?: string }) {
  return (
    <div className={cx("flex flex-col items-start justify-center gap-2 bg-pasir p-6", className)}>
      <MapTrifold aria-hidden className="size-8 text-aspal-2" />
      <p className="font-semibold">{pesan ?? "Peta tidak dapat dimuat di perangkat ini."}</p>
      <p className="max-w-baca text-kecil text-aspal-2">
        {typeof jumlah === "number" ? `${new Intl.NumberFormat("id-ID").format(jumlah)} titik laporan tetap tersedia di daftar. ` : ""}
        Peta butuh WebGL dan koneksi internet. Coba muat ulang halaman atau pakai browser lain.
      </p>
    </div>
  );
}

export function KanvasPeta({
  pusat = PUSAT_MEDAN,
  zoom = 12,
  className,
  label,
  koperasi = false,
  kendali = true,
  cadangan,
  children,
}: {
  pusat?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  label: string;
  /** Gestur koperasi: halaman tetap bisa digulir (Ctrl+gulir / dua jari untuk peta). */
  koperasi?: boolean;
  kendali?: boolean;
  cadangan?: ReactNode;
  children?: ReactNode;
}) {
  const wadah = useRef<HTMLDivElement>(null);
  const [dekat, setDekat] = useState(false);
  const [konteks, setKonteks] = useState<Konteks | null>(null);
  const [gagal, setGagal] = useState(false);
  // Opsi awal hanya dipakai saat peta dibuat; perubahan berikutnya lewat kontrol.
  const awal = useRef({ pusat, zoom, koperasi, kendali });

  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // Browser lama: langsung muat. Terjadwal agar tidak menyetel state serentak dengan render.
      const t = window.setTimeout(() => setDekat(true), 0);
      return () => window.clearTimeout(t);
    }
    const io = new IntersectionObserver(
      (entri) => {
        if (entri.some((e) => e.isIntersecting)) {
          setDekat(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!dekat) return;
    let batal = false;
    let peta: PetaMapLibre | null = null;

    (async () => {
      try {
        const [ml, gaya] = await Promise.all([import("maplibre-gl"), ambilGayaNatural()]);
        if (batal || !wadah.current) return;
        if (!pekerjaDiatur) {
          ml.setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
          pekerjaDiatur = true;
        }
        const a = awal.current;
        peta = new ml.Map({
          container: wadah.current,
          style: gaya,
          center: [a.pusat.lng, a.pusat.lat],
          zoom: a.zoom,
          minZoom: 9.5,
          maxZoom: 19,
          maxBounds: BATAS_PETA,
          maxPitch: 0,
          dragRotate: false,
          pitchWithRotate: false,
          renderWorldCopies: false,
          cooperativeGestures: a.koperasi,
          locale: TEKS_PETA,
        });
        peta.touchZoomRotate.disableRotation();
        if (a.kendali) peta.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        setKonteks({ peta, ml });
      } catch (e) {
        console.error("peta gagal dimuat", e);
        if (!batal) setGagal(true);
      }
    })();

    return () => {
      batal = true;
      peta?.remove();
      setKonteks(null);
    };
  }, [dekat]);

  return (
    <div role="region" aria-label={label} className={cx("relative overflow-hidden bg-pasir", className)}>
      {/* CSS MapLibre memberi kontainer position: relative, jadi ukuran lewat size-full (bukan absolute inset-0). */}
      <div ref={wadah} className="size-full" />
      {!konteks && !gagal && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-kecil text-aspal-2" role="status">
          <span className="rounded-sm bg-putih px-3 py-2 shadow-embun">Memuat peta…</span>
        </div>
      )}
      {gagal && (cadangan ?? <CadanganPeta className="absolute inset-0" />)}
      {konteks && <KonteksPeta.Provider value={konteks}>{children}</KonteksPeta.Provider>}
    </div>
  );
}

/**
 * Penanda HTML di atas peta. Isinya (anak) dirender React lewat portal, jadi
 * boleh berisi tombol, ikon, dan kelas Tailwind. Transformasi pada elemen
 * penanda dipakai MapLibre untuk posisi; beri animasi pada isinya saja.
 */
export function PenandaPeta({
  lat,
  lng,
  anchor = "center",
  zIndex = 0,
  children,
}: {
  lat: number;
  lng: number;
  anchor?: "center" | "bottom";
  zIndex?: number;
  children: ReactNode;
}) {
  const { peta, ml } = usePeta();
  const [el] = useState(() => document.createElement("div"));
  const penanda = useRef<PenandaMapLibre | null>(null);
  const posisi = useRef({ lat, lng });

  useEffect(() => {
    const m = new ml.Marker({ element: el, anchor }).setLngLat([posisi.current.lng, posisi.current.lat]).addTo(peta);
    penanda.current = m;
    return () => {
      m.remove();
      penanda.current = null;
    };
  }, [peta, ml, el, anchor]);

  useEffect(() => {
    posisi.current = { lat, lng };
    penanda.current?.setLngLat([lng, lat]);
  }, [lat, lng]);

  useEffect(() => {
    // Lewat objek Marker (bukan state `el`) agar jelas ini mutasi DOM di luar React.
    const elemen = penanda.current?.getElement();
    if (elemen) elemen.style.zIndex = String(zIndex);
  }, [zIndex, peta, ml, anchor]);

  return createPortal(children, el);
}
