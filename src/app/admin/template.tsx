/** Transisi halus antarhalaman di area staf (lihat (publik)/template.tsx). */
export default function TemplateAdmin({ children }: { children: React.ReactNode }) {
  return <div className="animate-masuk-halaman">{children}</div>;
}
