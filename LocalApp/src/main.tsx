import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@mantine/core/styles.css'
import './app/index.css'
import { MantineProvider } from '@mantine/core'
import { theme } from './app/theme.ts'
import { initStores } from './store/initStores.ts'

const root = createRoot(document.getElementById('root')!)

// 路線一覧・設定をIndexedDBから読み込んでから描画する(先に読み込むことで、
// 一瞬データが空に見える状態を防ぐ)。Appの動的importは、i18nの初期化(表示言語を
// 使う処理)が設定の読み込み後に実行されるようにするため。
initStores()
  .catch((e) => console.error('failed to initialize local data', e))
  .finally(async () => {
    const { default: App } = await import('./app/App.tsx')
    root.render(
      <StrictMode>
        <MantineProvider theme={theme} forceColorScheme="light">
          <App />
        </MantineProvider>
      </StrictMode>,
    )
  })
