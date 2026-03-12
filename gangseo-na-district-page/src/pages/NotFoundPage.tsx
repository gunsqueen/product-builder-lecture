import { Link } from 'react-router-dom';
import { StatusState } from '../components/StatusState';

export function NotFoundPage() {
  return (
    <div className="page-stack">
      <StatusState description="요청한 페이지가 존재하지 않습니다." title="404 페이지 없음" tone="error" />
      <Link className="inline-link" to="/">
        홈으로 돌아가기
      </Link>
    </div>
  );
}
