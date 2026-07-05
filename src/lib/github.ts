import { invoke } from "@tauri-apps/api/core";
import {
  getConfig,
  setConfig,
  type AppConfig,
} from "@/lib/tauri";

const GH_HEADERS = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
});

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepo {
  full_name: string;
  html_url: string;
  clone_url: string;
  private: boolean;
}

/** Validate a token by fetching the authenticated user. */
export async function githubGetUser(token: string): Promise<GitHubUser> {
  const r = await fetch("https://api.github.com/user", { headers: GH_HEADERS(token) });
  if (!r.ok) {
    throw new Error(r.status === 401 ? "Invalid token (401)." : `GitHub error (${r.status}).`);
  }
  return (await r.json()) as GitHubUser;
}

/** Create a new repository under the authenticated user. */
export async function githubCreateRepo(
  token: string,
  name: string,
  isPrivate: boolean
): Promise<GitHubRepo> {
  const r = await fetch("https://api.github.com/user/repos", {
    method: "POST",
    headers: { ...GH_HEADERS(token), "Content-Type": "application/json" },
    body: JSON.stringify({ name, private: isPrivate, auto_init: false }),
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`Could not create repo (${r.status}). ${detail.slice(0, 200)}`);
  }
  return (await r.json()) as GitHubRepo;
}

/** Persist the token + cached login. */
export async function saveGithubToken(token: string, user?: string) {
  const cfg: AppConfig = await getConfig();
  cfg.github_token = token.trim();
  if (user !== undefined) cfg.github_user = user.trim();
  await setConfig(cfg);
}

export async function clearGithubToken() {
  const cfg: AppConfig = await getConfig();
  cfg.github_token = "";
  cfg.github_user = "";
  await setConfig(cfg);
}

// --- OAuth device flow ---
//
// The Client ID is public and safe to ship in the binary. Device flow needs no
// client secret, which makes it the right choice for a desktop app. Forks can
// override at build time with VITE_GITHUB_CLIENT_ID.
export const GITHUB_OAUTH_CLIENT_ID =
  import.meta.env.VITE_GITHUB_CLIENT_ID ?? "Ov23liH7AKwZc4J10rhx";

export interface DeviceCode {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

// NOTE: the device-flow endpoints (`github.com/login/device/code` and
// `/login/oauth/access_token`) are not CORS-enabled, so the requests run on the
// Rust side (src-tauri/src/github.rs) and are invoked here. The `scope`
// (`repo read:user`) is set in Rust.

/** Step 1 of device flow: request a user code the user enters at github.com. */
export async function requestDeviceCode(clientId: string): Promise<DeviceCode> {
  return invoke<DeviceCode>("gh_request_device_code", { clientId });
}

/** One token-check result. The frontend loops, calling `checkDeviceToken`. */
export type TokenPoll =
  | { status: "token"; token: string }
  | { status: "pending" }
  | { status: "slow_down"; interval: number };

/**
 * Step 2 of device flow: a SINGLE token check (the Rust command is async +
 * short so it never blocks the webview). The frontend runs the poll loop so it
 * stays cancellable. Resolves with the status; rejects on expired/denied.
 */
export async function checkDeviceToken(
  clientId: string,
  deviceCode: string
): Promise<TokenPoll> {
  const r = await invoke<{
    status: string;
    token: string | null;
    interval: number | null;
  }>("gh_check_device_token", { clientId, deviceCode });
  if (r.status === "token" && r.token) return { status: "token", token: r.token };
  if (r.status === "slow_down" && r.interval) return { status: "slow_down", interval: r.interval };
  return { status: "pending" };
}

/** List the authenticated user's repositories (most recently updated first). */
export async function githubListRepos(token: string): Promise<GitHubRepo[]> {
  const r = await fetch(
    "https://api.github.com/user/repos?per_page=100&sort=updated",
    { headers: GH_HEADERS(token) }
  );
  if (!r.ok) {
    throw new Error(`Could not load repositories (${r.status}).`);
  }
  return (await r.json()) as GitHubRepo[];
}

/**
 * Best-effort token revocation via the OAuth App API. Requires HTTP Basic auth
 * with the client id/secret; since we ship only the public client id, this is
 * a no-op fallback. Locally we always clear the token regardless.
 */
export async function githubRevokeToken(_token: string): Promise<void> {
  // No client secret available in a desktop app; rely on local clear + the
  // user revoking at github.com/settings/applications if needed.
  return;
}
