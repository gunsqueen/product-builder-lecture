import { Link } from 'react-router-dom';

interface BreadcrumbsProps {
  items: Array<{ label: string; to?: string }>;
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <strong>{item.label}</strong>}
          {index < items.length - 1 ? <span className="breadcrumbs-separator">/</span> : null}
        </span>
      ))}
    </nav>
  );
}
