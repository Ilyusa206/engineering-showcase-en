/**
 * Sanitized reconstruction based on an implemented system.
 * Not verbatim production code.
 */

interface QueryCache {
  invalidate(prefix: readonly string[]): Promise<void>;
}

interface RealtimeEvent {
  type: string;
  spaceId: string;
  entityId: string;
}

export class RealtimeInvalidator {
  private socket: WebSocket | null = null;
  private stopped = false;
  private attempts = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly endpoint: string,
    private readonly spaceId: string,
    private readonly token: () => Promise<string>,
    private readonly cache: QueryCache,
  ) {}

  start(): void {
    this.stopped = false;
    void this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.socket?.close();
    this.socket = null;
  }

  private async connect(): Promise<void> {
    if (this.stopped || this.socket) return;
    const accessToken = await this.token();
    const url = `${this.endpoint.replace(/^http/, "ws")}/spaces/${this.spaceId}/ws`;
    const socket = new WebSocket(url, ["bearer", accessToken]);
    this.socket = socket;

    socket.onopen = () => {
      this.attempts = 0;
    };
    socket.onmessage = (message) => void this.onMessage(String(message.data));
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      if (this.stopped) return;
      const delay = Math.min(15_000, 1_000 * 2 ** this.attempts++);
      this.timer = setTimeout(() => void this.connect(), delay);
    };
  }

  private async onMessage(raw: string): Promise<void> {
    let event: RealtimeEvent;
    try {
      event = JSON.parse(raw) as RealtimeEvent;
    } catch {
      return;
    }
    if (event.spaceId !== this.spaceId || event.type === "connected") return;

    // The event invalidates cache; authorized HTTP queries remain the source of truth.
    await Promise.all([
      this.cache.invalidate(["dashboard", this.spaceId]),
      this.cache.invalidate(["transactions", this.spaceId]),
      this.cache.invalidate(["accounts", this.spaceId]),
    ]);
  }
}
