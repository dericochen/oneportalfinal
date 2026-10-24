/**
 * Template dibuat ulang setiap kali berpindah halaman, jadi isi halaman
 * masuk dengan transisi halus (memudar + naik sedikit). Dimatikan otomatis
 * oleh `prefers-reduced-motion` (lihat globals.css).
 */
export default function TemplatePublik({ children }: { children: React.ReactNode }) {
  return <div className="animate-masuk-halaman">{children}</div>;
}
