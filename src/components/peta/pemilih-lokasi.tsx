"use client";

import { Crosshair, MagnifyingGlass, MapPin } from "@phosphor-icons/react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Masukan } from "@/components/ui/isian";
import { Tombol } from "@/components/ui/tombol";
import { cx } from "@/lib/cx";
import { PUSAT_MEDAN } from "./gaya-peta";
import { KanvasPeta, usePeta } from "./kanvas-peta";

/**
 * Pilih lokasi seperti aplikasi ojek online: peta digeser, pin tetap di
 * tengah, pin terangkat saat peta bergerak dan turun saat berhenti. Nilai
 * dikirim setelah peta berhenti. Pencarian alamat memakai Nominatim
 * (OpenStreetMap, gratis, hanya saat tombol Cari ditekan sesuai kebijakan
 * pemakaian), dibatasi ke Kota Medan.
 */
export type Titik = { lat: number; lng: number };

function KendaliPemilih({ tuju, tujuLain, ubah, bergerak }: { tuju: Titik | null; tujuLain: Titik | null; ubah: (t: Titik) => void; bergerak: (b: boolean) => void }) {
  const { peta } = usePeta();
  const ubahRef = useRef(ubah);
  const bergerakRef = useRef(bergerak);
  useEffect(() => {
    ubahRef.current = ubah;
    bergerakRef.current = bergerak;
  });

  useEffect(() => {
    const mulai = () => bergerakRef.current(true);
    const selesai = () => {
      bergerakRef.current(false);
      const c = peta.getCenter();
      ubahRef.current({ lat: c.lat, lng: c.lng });
    };
    peta.on("movestart", mulai);
    peta.on("moveend", selesai);
    return () => {
      peta.off("movestart", mulai);
      peta.off("moveend", selesai);
    };
  }, [peta]);

  // Dua sumber sasaran: pencarian/GPS di komponen ini, dan pilihan kecamatan di form.
  useEffect(() => {
    if (tuju) peta.flyTo({ center: [tuju.lng, tuju.lat], zoom: Math.max(peta.getZoom(), 17), speed: 1.4, essential: false });
  }, [peta, tuju]);
  useEffect(() => {
    if (tujuLain) peta.flyTo({ center: [tujuLain.lng, tujuLain.lat], zoom: Math.max(peta.getZoom(), 15), speed: 1.4, essential: false });
  }, [peta, tujuLain]);

  return null;
}

/** Pin tetap di tengah; ujung bawah pin = titik yang dipilih. */
function PinTengah({ bergerak }: { bergerak: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 z-10">
      <span
        className={cx(
          "absolute top-0 left-0 block h-2 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-aspal/30 transition-transform duration-200 ease-keluar",
          bergerak ? "scale-75" : "scale-100",
        )}
      />
      <MapPin
        weight="fill"
        className={cx(
          "absolute top-0 left-0 size-12 -translate-x-1/2 text-merah transition-transform duration-200 ease-keluar",
          bergerak ? "-translate-y-[calc(100%+10px)]" : "-translate-y-full",
        )}
      />
    </div>
  );
}

type HasilCari = { id: number; nama: string; rincian: string; lat: number; lng: number };

function CariAlamat({ pilih }: { pilih: (t: Titik) => void }) {
  const [kata, setKata] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [hasil, setHasil] = useState<HasilCari[] | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  async function cari() {
    const q = kata.trim();
    if (q.length < 3) {
      setPesan("Ketik minimal 3 huruf nama jalan, tempat, atau kelurahan.");
      setHasil(null);
      return;
    }
    setMemuat(true);
    setPesan(null);
    try {
      const u = new URL("https://nominatim.openstreetmap.org/search");
      u.search = new URLSearchParams({
        q,
        format: "jsonv2",
        limit: "5",
        countrycodes: "id",
        "accept-language": "id",
        viewbox: "98.55,3.81,98.80,3.47",
        bounded: "1",
      }).toString();
      const r = await fetch(u, { headers: { Accept: "application/json" } });
      if (!r.ok) throw new Error(String(r.status));
      const data = (await r.json()) as Array<{ place_id: number; display_name: string; name?: string; lat: string; lon: string }>;
      const daftar = data.map<HasilCari>((d) => {
        const bagian = d.display_name.split(",").map((s) => s.trim());
        return {
          id: d.place_id,
          nama: d.name || bagian[0] || d.display_name,
          rincian: bagian.slice(1, 4).join(", "),
          lat: Number(d.lat),
          lng: Number(d.lon),
        };
      });
      setHasil(daftar);
      if (daftar.length === 0) setPesan("Tempat itu tidak ditemukan di Kota Medan. Coba nama jalan atau kelurahan, atau geser peta langsung.");
    } catch {
      setHasil(null);
      setPesan("Pencarian belum berhasil. Periksa koneksi Anda, atau geser peta langsung ke lokasi masalah.");
    } finally {
      setMemuat(false);
    }
  }

  function tekan(e: KeyboardEvent<HTMLInputElement>) {
    // Enter di sini tidak boleh mengirim form laporan.
    if (e.key === "Enter") {
      e.preventDefault();
      void cari();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <Masukan
          name="cari-alamat"
          label="Cari alamat atau tempat"
          petunjuk="Contoh: Jl. Denai, Lapangan Merdeka, Pasar Petisah"
          value={kata}
          onChange={(e) => setKata(e.target.value)}
          onKeyDown={tekan}
          autoComplete="off"
          className="flex-1"
          opsional
        />
        <Tombol varian="kedua" onClick={cari} memuat={memuat} teksMemuat="Mencari…" ikon={<MagnifyingGlass aria-hidden className="size-5" />} className="mb-0.5">
          Cari
        </Tombol>
      </div>
      <p aria-live="polite" className={cx("text-kecil", pesan ? "font-semibold text-merah" : "sr-only")}>
        {pesan ?? (hasil ? `${hasil.length} tempat ditemukan` : "")}
      </p>
      {hasil && hasil.length > 0 && (
        <ul className="divide-y divide-garis overflow-hidden rounded-md border border-garis bg-putih">
          {hasil.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  pilih({ lat: h.lat, lng: h.lng });
                  setHasil(null);
                }}
                className="flex min-h-12 w-full flex-col items-start justify-center px-3 py-2 text-left hover:bg-lumut"
              >
                <span className="font-semibold">{h.nama}</span>
                {h.rincian && <span className="text-kecil text-aspal-2">{h.rincian}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-kecil text-aspal-2">Pencarian oleh Nominatim, data © kontributor OpenStreetMap.</p>
    </div>
  );
}

export function PemilihLokasi({ nilai, ubah, tuju: tujuLuar }: { nilai: Titik | null; ubah: (t: Titik) => void; tuju?: Titik | null }) {
  const [tujuSendiri, setTujuSendiri] = useState<Titik | null>(null);
  const [bergerak, setBergerak] = useState(false);
  const [galatGps, setGalatGps] = useState<string | null>(null);
  const [mencari, setMencari] = useState(false);

  function lokasiSaya() {
    setGalatGps(null);
    if (!navigator.geolocation) {
      setGalatGps("Browser ini tidak mendukung lokasi. Geser peta ke lokasi masalah.");
      return;
    }
    setMencari(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setMencari(false);
        setTujuSendiri({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        setMencari(false);
        setGalatGps("Lokasi Anda tidak dapat dibaca. Izinkan akses lokasi, atau geser peta ke lokasi masalah.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <CariAlamat pilih={(t) => setTujuSendiri({ ...t })} />
      <KanvasPeta
        label="Peta untuk memilih lokasi masalah"
        pusat={nilai ?? PUSAT_MEDAN}
        zoom={nilai ? 17 : 13}
        className="h-80 rounded-md border-2 border-garis-tegas md:h-96"
      >
        <KendaliPemilih tuju={tujuSendiri} tujuLain={tujuLuar ?? null} ubah={ubah} bergerak={setBergerak} />
        <PinTengah bergerak={bergerak} />
      </KanvasPeta>
      <div className="flex flex-wrap items-center gap-3">
        <Tombol varian="kedua" onClick={lokasiSaya} memuat={mencari} teksMemuat="Mencari lokasi…" ikon={<Crosshair aria-hidden className="size-5" />}>
          Gunakan lokasi saya
        </Tombol>
        {nilai && (
          <span className="font-kode text-kecil text-aspal-2">
            {nilai.lat.toFixed(5)}, {nilai.lng.toFixed(5)}
          </span>
        )}
      </div>
      {galatGps && <p className="text-kecil font-semibold text-merah">{galatGps}</p>}
    </div>
  );
}
