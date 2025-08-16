/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_CLAUDE_API_KEY?: string;
  readonly VITE_OLLAMA_ENDPOINT?: string;
  readonly VITE_DEEPSEEK_API_KEY?: string;
  readonly VITE_OPENAI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}