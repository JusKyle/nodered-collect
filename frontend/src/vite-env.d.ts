/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

namespace NodeJS {
  interface Timeout {
    ref(): Timeout
    unref(): Timeout
  }
}
