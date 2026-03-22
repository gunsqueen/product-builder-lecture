interface StatCardProps {
  label: string
  value: string
  description: string
}

export function StatCard({ label, value, description }: StatCardProps) {
  return (
    <article className="stat-card">
      <span className="eyebrow">{label}</span>
      <strong>{value}</strong>
      <p>{description}</p>
    </article>
  )
}
