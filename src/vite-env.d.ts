/// <reference types="vite/client" />

declare const __APP_VERSION__: string
declare const __DEV_PROXY_CONFIG__: unknown

interface ElectronAPI {
  repairIndexedDB: () => Promise<{ ok: boolean, error?: string }>
}

interface Window {
  /** Electron 桌面版由 preload 注入;网页版不存在 */
  electronAPI?: ElectronAPI
}

interface ImportMetaEnv {
  readonly VITE_DEFAULT_API_URL?: string
  readonly VITE_API_PROXY_AVAILABLE?: string
  readonly VITE_API_PROXY_LOCKED?: string
  readonly VITE_DOCKER_DEPLOYMENT?: string
  readonly VITE_DOCKER_LEGACY_API_URL_USED?: string
  readonly VITE_SHOW_DEFAULT_CONFIG_ONLY?: string
  readonly VITE_VIBELEARNING_PRESET?: string
  readonly VITE_PRO_PRESET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
