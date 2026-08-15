/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_INVESTMENT_URL?: string;
  readonly VITE_GOLD_AGENT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
