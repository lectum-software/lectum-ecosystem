// Policy v2 published 2026-11-21. Capture still requires a fresh explicit choice.
export const CAMPAIGN_ATTRIBUTION_ENABLED = true;
export const ATTRIBUTION_STORAGE_KEY = "lectum.marketing.acquisition.v1";
export const PRE_SIGNUP_RETENTION_MS = 30 * 24 * 60 * 60_000;
export const CAMPAIGN_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;
export type Campaigns = Partial<Record<(typeof CAMPAIGN_KEYS)[number], string>>;
export type AttributionChoice = {
  version: string;
  campaigns: boolean;
  savedAt: number;
  expiresAt: number;
  pendingRevocation?: boolean;
};
export type AttributionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type AttributionTransport = {
  capture: (input: {
    token: string;
    accepted: true;
    document_version: string;
    campaigns: Campaigns;
  }) => Promise<{ enabled: boolean; expires_at?: string | null }>;
  revoke: (token: string) => Promise<unknown>;
};
type Stored = {
  token: string;
  expiresAt: number;
  version: string;
  pendingRevocation: boolean;
  claimed?: boolean;
  captured?: boolean;
};
export function permittedBrowserCampaigns(
  search: string,
  catalog: Partial<Record<keyof Campaigns, readonly string[]>>,
): Campaigns {
  const params = new URLSearchParams(search);
  const result: Campaigns = {};
  for (const key of CAMPAIGN_KEYS) {
    const value = params.get(key);
    if (value && /^[A-Za-z0-9_-]{1,128}$/.test(value) && catalog[key]?.includes(value))
      result[key] = value;
  }
  return result;
}
export class BrowserAttribution {
  private deniedAt = -Infinity;
  constructor(
    private readonly options: {
      enabled: boolean;
      version: string;
      storage: () => AttributionStorage | null;
      transport: AttributionTransport;
      now: () => number;
      newToken: () => string;
      currentChoice?: () => AttributionChoice | null;
    },
  ) {}
  private read(): Stored | null {
    if (!this.options.enabled) return null;
    try {
      const value = JSON.parse(this.options.storage()?.getItem(ATTRIBUTION_STORAGE_KEY) ?? "null");
      if (!value) return null;
      if (
        (!(value.claimed === true && value.token === "") && !/^[a-f0-9]{64}$/.test(value.token)) ||
        !Number.isFinite(value.expiresAt) ||
        typeof value.pendingRevocation !== "boolean" ||
        value.version !== this.options.version ||
        value.expiresAt <= this.options.now() ||
        value.expiresAt > this.options.now() + PRE_SIGNUP_RETENTION_MS
      ) {
        this.options.storage()?.removeItem(ATTRIBUTION_STORAGE_KEY);
        return null;
      }
      return value;
    } catch {
      return null;
    }
  }
  private allowed(choice: AttributionChoice | null) {
    const now = this.options.now();
    return (
      this.options.enabled &&
      choice?.campaigns === true &&
      !choice.pendingRevocation &&
      choice.version === this.options.version &&
      choice.savedAt <= now &&
      choice.savedAt > this.deniedAt &&
      choice.expiresAt > now
    );
  }
  tokenForTransfer(choice: AttributionChoice | null) {
    if (!this.allowed(choice)) return null;
    const value = this.read();
    return value && !value.pendingRevocation && !value.claimed ? value.token : null;
  }
  forget() {
    try {
      if (this.options.enabled) this.options.storage()?.removeItem(ATTRIBUTION_STORAGE_KEY);
    } catch {
      /* Storage can be unavailable. */
    }
  }
  markTransferred() {
    const value = this.read();
    if (!value) return;
    try {
      this.options
        .storage()
        ?.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify({ ...value, token: "", claimed: true }));
    } catch {
      this.forget();
    }
  }
  async revoke() {
    if (!this.options.enabled) return;
    this.deniedAt = this.options.now();
    const value = this.read();
    if (!value) return;
    if (value.claimed) {
      this.forget();
      return;
    }
    try {
      this.options
        .storage()
        ?.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify({ ...value, pendingRevocation: true }));
    } catch {
      this.forget();
    }
    try {
      await this.options.transport.revoke(value.token);
      this.forget();
    } catch {
      /* Keep only a revocation token for retry; never use it for capture or transfer. */
    }
  }
  async capture(choice: AttributionChoice | null, campaigns: Campaigns) {
    if (!this.options.enabled) return;
    if (this.options.currentChoice) choice = this.options.currentChoice();
    if (this.read()?.claimed) return;
    if (!choice || !this.allowed(choice)) {
      await this.revoke();
      return;
    }
    let value = this.read();
    if (value?.pendingRevocation) {
      await this.revoke();
      return;
    }
    // Preserve explicit guest consent even on a direct visit without campaign tags.
    if (!Object.keys(campaigns).length && value?.captured) return;
    if (!value)
      value = {
        token: this.options.newToken(),
        version: this.options.version,
        expiresAt: Math.min(choice.expiresAt, this.options.now() + PRE_SIGNUP_RETENTION_MS),
        pendingRevocation: false,
      };
    const storage = this.options.storage();
    if (!storage) return;
    try {
      storage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(value));
    } catch {
      return;
    }
    const sent = value;
    try {
      const result = await this.options.transport.capture({
        token: sent.token,
        accepted: true,
        document_version: sent.version,
        campaigns,
      });
      const current = this.read();
      if (current?.claimed) return;
      // Revocation or an account change may have happened while the request was pending.
      if (!current || current.token !== sent.token || current.pendingRevocation) {
        await this.options.transport.revoke(sent.token);
        return;
      }
      if (!result.enabled || !result.expires_at) {
        this.forget();
        return;
      }
      const expiresAt = Math.min(sent.expiresAt, Date.parse(result.expires_at));
      if (!Number.isFinite(expiresAt) || expiresAt <= this.options.now()) {
        this.forget();
        return;
      }
      storage.setItem(
        ATTRIBUTION_STORAGE_KEY,
        JSON.stringify({ ...sent, expiresAt, captured: true }),
      );
    } catch {
      /* Retry on a later consented visit with the same token, never a new identity. */
    }
  }
}
