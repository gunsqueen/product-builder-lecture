import { Suspense } from 'react'
import { useRoutes } from 'react-router-dom'
import { LoadingState } from '@/components/state/LoadingState'
import { appRoutes } from '@/routes/appRoutes'

function App() {
  return (
    <Suspense fallback={<LoadingState message="페이지를 불러오는 중입니다." />}>
      {useRoutes(appRoutes)}
    </Suspense>
  )
}

export default App
