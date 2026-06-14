/// <reference types="vite/client" />
declare module '*.css';

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SHEETS_URL: string
  readonly VITE_BANK_PASSCODE: string
  readonly VITE_GATEWAY_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
interface Window { _loggedFirstRow?: boolean; }
