import { invoke } from "@tauri-apps/api/core";

export const DEFAULT_OLLAMA_HOST = "http://localhost:11434";

/**
 * List the models installed in a local Ollama instance (via a Rust command that
 * calls `GET {host}/api/tags`). Rejects if Ollama isn't running/reachable.
 */
export function listOllamaModels(host: string): Promise<string[]> {
  return invoke<string[]>("ollama_list_models", {
    host: host.trim() || DEFAULT_OLLAMA_HOST,
  });
}
