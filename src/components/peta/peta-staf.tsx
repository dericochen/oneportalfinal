"use client";

import { useRouter } from "next/navigation";
import { PetaLaporan, type TitikMinimal } from "./peta-laporan";

/** Peta semua laporan untuk staf; klik titik membuka detail laporan. */
export function PetaStaf({ titik, dasar }: { titik: TitikMinimal[]; dasar: string }) {
  const router = useRouter();
  return (
    <PetaLaporan
      titik={titik}
      className="h-96 rounded-md border border-garis lg:h-[28rem]"
      onPilih={(id) => router.push(`${dasar}/laporan/${id}`)}
      label="Peta semua laporan"
    />
  );
}