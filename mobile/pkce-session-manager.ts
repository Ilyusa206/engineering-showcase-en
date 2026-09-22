/**
 * Sanitized reconstruction based on an implemented system.
 * Not verbatim production code.
 */

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface TokenStorage {
  load(): Promise<Tokens | null>;
  save(tokens: Tokens): Promise<void>;
  clear(): Promise<void>;
}

interface OAuthClient {
  exchangeCode(input: { code: string; verifier: string }): Promise<Tokens>;
  refresh(refreshToken: string): Promise<Tokens>;
}

export class SessionManager {
  private tokens: Tokens | null = null;
  private refreshInFlight: Promise<Tokens> | null = null;

  constructor(
    private readonly storage: TokenStorage,
    private readonly oauth: OAuthClient,
    private readonly onTokenChanged: () => void,
  ) {}

  async restore(): Promise<boolean> {
    this.tokens = await this.storage.load();
    return Boolean(this.tokens);
  }

  async completePkce(code: string, verifier: string): Promise<void> {
    const tokens = await this.oauth.exchangeCode({ code, verifier });
    await this.replace(tokens);
  }

  async accessToken(): Promise<string> {
    if (!this.tokens) throw new Error("authentication_required");
    if (this.tokens.expiresAt - Date.now() > 30_000) return this.tokens.accessToken;
    return (await this.refresh()).accessToken;
  }

  async signOut(): Promise<void> {
    this.tokens = null;
    await this.storage.clear();
    this.onTokenChanged();
  }

  private refresh(): Promise<Tokens> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.performRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<Tokens> {
    if (!this.tokens) throw new Error("authentication_required");
    try {
      const next = await this.oauth.refresh(this.tokens.refreshToken);
      await this.replace(next);
      return next;
    } catch (error) {
      // The implemented client distinguishes terminal OAuth errors from transient network failures.
      if (error instanceof Error && /invalid_(grant|token)/.test(error.message)) {
        await this.signOut();
      }
      throw error;
    }
  }

  private async replace(tokens: Tokens): Promise<void> {
    await this.storage.save(tokens);
    this.tokens = tokens;
    this.onTokenChanged(); // Recreate authenticated API/socket clients.
  }
}
