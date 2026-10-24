/** Transisi halus antarhalaman di area petugas. */
export default function TemplatePetugas({ children }: { children: React.ReactNode }) {
  return <div className="animate-masuk-halaman">{children}</div>;
}
