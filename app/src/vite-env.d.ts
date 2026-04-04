/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
