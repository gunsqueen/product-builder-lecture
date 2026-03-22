import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '')

const buildProxyPrefix = (baseUrl?: string, pathPrefix?: string) => {
  if (!baseUrl?.startsWith('/')) {
    return null
  }

  const segments = [baseUrl, pathPrefix]
    .map((segment) => segment?.trim())
    .filter((segment): segment is string => Boolean(segment))
    .map((segment) => trimSlashes(segment))

  return `/${segments.join('/')}`
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const moisProxyPrefix = buildProxyPrefix(
    env.VITE_MOIS_API_BASE_URL,
    env.VITE_MOIS_API_PATH,
  )
  const necProxyPrefix = buildProxyPrefix(
    env.VITE_NEC_API_BASE_URL,
    env.VITE_NEC_API_PATH,
  )
  const proxy = {
    ...(moisProxyPrefix
      ? {
          [moisProxyPrefix]: {
            target: 'https://jumin.mois.go.kr',
            changeOrigin: true,
            secure: true,
            rewrite: (requestPath: string) =>
              requestPath.replace(new RegExp(`^${escapeRegex(moisProxyPrefix)}`), '') || '/',
          },
        }
      : {}),
    ...(necProxyPrefix
      ? {
          [necProxyPrefix]: {
            target: 'https://apis.data.go.kr',
            changeOrigin: true,
            secure: true,
            rewrite: () => '/9760000/WinnerInfoInqireService2/getWinnerInfoInqire',
          },
        }
      : {}),
  }

  return {
    build: {
      chunkSizeWarningLimit: 700,
      rolldownOptions: {
        output: {
          codeSplitting: true,
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: Object.keys(proxy).length > 0 ? { proxy } : undefined,
  }
})
