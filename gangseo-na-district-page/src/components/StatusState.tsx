interface StatusStateProps {
  title: string;
  description: string;
  tone?: 'default' | 'error';
}

export function StatusState({ title, description, tone = 'default' }: StatusStateProps) {
  return (
    <div className={tone === 'error' ? 'status-card status-card-error' : 'status-card'}>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
