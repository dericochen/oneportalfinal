/** Transisi halus antarhalaman di area supervisor. */
export default function TemplateSupervisor({ children }: { children: React.ReactNode }) {
  return <div className="animate-masuk-halaman">{children}</div>;
}
