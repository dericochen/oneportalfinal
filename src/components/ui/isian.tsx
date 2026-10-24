import { WarningCircle } from "@phosphor-icons/react/ssr";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

/*
 * Kolom isian: label di atas kolom (bukan floating label), petunjuk di bawah
 * label, pesan error di bawah kolom. React 19 meneruskan `ref` sebagai prop,
 * jadi `register()` dari React Hook Form bisa langsung dipakai.
 */

type PropsBingkai = {
  id: string;
  label: ReactNode;
  petunjuk?: ReactNode;
  error?: string;
  wajib?: boolean;
  opsional?: boolean;
  children: ReactNode;
  className?: string;
};

export const idPetunjuk = (id: string) => `${id}-petunjuk`;
export const idError = (id: string) => `${id}-error`;

export function describedBy(id: string, petunjuk?: unknown, error?: unknown) {
  return [petunjuk ? idPetunjuk(id) : null, error ? idError(id) : null].filter(Boolean).join(" ") || undefined;
}

export function Kolom({ id, label, petunjuk, error, wajib, opsional, children, className }: PropsBingkai) {
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="font-semibold">
        {label}
        {wajib && <span className="sr-only"> (wajib)</span>}
        {opsional && <span className="font-normal text-aspal-2"> (opsional)</span>}
      </label>
      {petunjuk && (
        <p id={idPetunjuk(id)} className="text-kecil text-aspal-2">
          {petunjuk}
        </p>
      )}
      <div className="mt-1">{children}</div>
      {error && <PesanError id={idError(id)}>{error}</PesanError>}
    </div>
  );
}

export function PesanError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 flex items-start gap-1 text-kecil font-semibold text-merah">
      <WarningCircle aria-hidden weight="bold" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

const kelasKolom = (error?: string) =>
  cx(
    "w-full rounded-md border-2 bg-putih px-3 text-aspal placeholder:text-aspal-2",
    "disabled:cursor-not-allowed disabled:bg-abu disabled:text-aspal-2",
    error ? "border-merah" : "border-garis-tegas",
  );

type PropsLabelKolom = Omit<PropsBingkai, "id" | "children" | "className"> & { name: string; id?: string; className?: string };

export function Masukan({
  label,
  petunjuk,
  error,
  wajib,
  opsional,
  className,
  id,
  name,
  ...rest
}: PropsLabelKolom & Omit<ComponentProps<"input">, "name" | "id">) {
  const idKolom = id ?? name;
  return (
    <Kolom id={idKolom} label={label} petunjuk={petunjuk} error={error} wajib={wajib} opsional={opsional} className={className}>
      <input
        id={idKolom}
        name={name}
        required={wajib}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(idKolom, petunjuk, error)}
        className={cx(kelasKolom(error), "min-h-12 py-2")}
        {...rest}
      />
    </Kolom>
  );
}

export function AreaTeks({
  label,
  petunjuk,
  error,
  wajib,
  opsional,
  className,
  id,
  name,
  penghitung,
  ...rest
}: PropsLabelKolom &
  Omit<ComponentProps<"textarea">, "name" | "id"> & {
    /** Tampilkan "120/1000 karakter" di bawah kolom. */
    penghitung?: { panjang: number; maks: number };
  }) {
  const idKolom = id ?? name;
  return (
    <Kolom id={idKolom} label={label} petunjuk={petunjuk} error={error} wajib={wajib} opsional={opsional} className={className}>
      <textarea
        id={idKolom}
        name={name}
        required={wajib}
        rows={5}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(idKolom, petunjuk, error)}
        className={cx(kelasKolom(error), "py-2 leading-normal")}
        {...rest}
      />
      {penghitung && (
        <p className="mt-1 text-right text-kecil text-aspal-2" aria-live="polite">
          {penghitung.panjang}/{penghitung.maks} karakter
        </p>
      )}
    </Kolom>
  );
}

export function Pilihan({
  label,
  petunjuk,
  error,
  wajib,
  opsional,
  className,
  id,
  name,
  children,
  ...rest
}: PropsLabelKolom & Omit<ComponentProps<"select">, "name" | "id">) {
  const idKolom = id ?? name;
  return (
    <Kolom id={idKolom} label={label} petunjuk={petunjuk} error={error} wajib={wajib} opsional={opsional} className={className}>
      <select
        id={idKolom}
        name={name}
        required={wajib}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(idKolom, petunjuk, error)}
        className={cx(kelasKolom(error), "min-h-12 py-2")}
        {...rest}
      >
        {children}
      </select>
    </Kolom>
  );
}

type PropsPilihanTunggal = Omit<ComponentProps<"input">, "type"> & {
  label: ReactNode;
  keterangan?: ReactNode;
};

function PilihanTunggal({ type, label, keterangan, className, id, ...rest }: PropsPilihanTunggal & { type: "checkbox" | "radio" }) {
  const idKolom = id ?? `${rest.name}-${String(rest.value ?? "ya")}`;
  return (
    <label htmlFor={idKolom} className={cx("flex min-h-11 cursor-pointer items-start gap-3 py-2", className)}>
      <input
        id={idKolom}
        type={type}
        className={cx(
          "mt-0.5 size-6 shrink-0 cursor-pointer",
          type === "radio" ? "radio-rambu" : "centang-rambu",
        )}
        {...rest}
      />
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        {keterangan && <span className="text-kecil text-aspal-2">{keterangan}</span>}
      </span>
    </label>
  );
}

export function KotakCentang(props: PropsPilihanTunggal) {
  return <PilihanTunggal type="checkbox" {...props} />;
}

export function Radio(props: PropsPilihanTunggal) {
  return <PilihanTunggal type="radio" {...props} />;
}

/** Ringkasan error di atas form; setiap butir menaut ke kolomnya. */
export function RingkasanError({ galat }: { galat: Array<{ id: string; pesan: string }> }) {
  if (galat.length === 0) return null;
  return (
    <div role="alert" tabIndex={-1} className="rounded-md border-2 border-merah bg-putih p-4">
      <p className="flex items-center gap-2 font-bold text-merah">
        <WarningCircle aria-hidden weight="bold" className="size-5" />
        {galat.length === 1 ? "Ada 1 isian yang perlu diperbaiki" : `Ada ${galat.length} isian yang perlu diperbaiki`}
      </p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-6">
        {galat.map((g) => (
          <li key={g.id}>
            <a href={`#${g.id}`} className="tautan">
              {g.pesan}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
