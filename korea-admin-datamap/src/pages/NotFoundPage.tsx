import { Link } from 'react-router-dom'
import { ROUTES } from '@/config/routes'

export function NotFoundPage() {
  return (
    <section className="page">
      <div className="panel">
        <span className="eyebrow">404</span>
        <h1>페이지를 찾을 수 없습니다.</h1>
        <p>라우트 설정은 완료되어 있으나 요청한 경로와 일치하지 않습니다.</p>
        <Link className="button button-primary" to={ROUTES.home}>
          홈으로 이동
        </Link>
      </div>
    </section>
  )
}
