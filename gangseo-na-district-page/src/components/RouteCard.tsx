import { Link } from 'react-router-dom';

interface RouteCardProps {
  title: string;
  description: string;
  to: string;
}

export function RouteCard({ title, description, to }: RouteCardProps) {
  return (
    <Link className="route-card" to={to}>
      <strong>{title}</strong>
      <p>{description}</p>
      <span>바로가기</span>
    </Link>
  );
}
