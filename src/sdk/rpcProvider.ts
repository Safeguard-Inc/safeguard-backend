/**
 * rpcProvider.ts
 *
 * Resilient multi-node Soroban/Horizon RPC provider with health metrics and automatic failover.
 */

export interface RpcNodeEndpoint {
  url: string;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastCheckedMs: number;
  latencyMs: number;
}

export interface RpcProviderConfig {
  primaryUrl: string;
  fallbackUrls?: string[];
  maxConsecutiveFailures?: number;
  healthCheckIntervalMs?: number;
}

export class FailoverRpcProvider {
  private nodes: RpcNodeEndpoint[] = [];
  private activeIndex: number = 0;
  private maxConsecutiveFailures: number;

  constructor(config: RpcProviderConfig) {
    this.maxConsecutiveFailures = config.maxConsecutiveFailures ?? 3;
    const urls = [config.primaryUrl, ...(config.fallbackUrls || [])];
    this.nodes = urls.map((url) => ({
      url,
      isHealthy: true,
      consecutiveFailures: 0,
      lastCheckedMs: Date.now(),
      latencyMs: 0,
    }));
  }

  public getActiveEndpoint(): string {
    return this.nodes[this.activeIndex].url;
  }

  public getAllNodes(): RpcNodeEndpoint[] {
    return this.nodes.map((n) => ({ ...n }));
  }

  public recordSuccess(latencyMs = 0): void {
    const current = this.nodes[this.activeIndex];
    current.isHealthy = true;
    current.consecutiveFailures = 0;
    current.latencyMs = latencyMs;
    current.lastCheckedMs = Date.now();
  }

  public recordFailure(): string {
    const current = this.nodes[this.activeIndex];
    current.consecutiveFailures += 1;
    current.lastCheckedMs = Date.now();

    if (current.consecutiveFailures >= this.maxConsecutiveFailures) {
      current.isHealthy = false;
      this.failover();
    }

    return this.getActiveEndpoint();
  }

  public failover(): string {
    const originalIndex = this.activeIndex;
    // Find next healthy node
    for (let i = 1; i < this.nodes.length; i++) {
      const nextIdx = (originalIndex + i) % this.nodes.length;
      if (this.nodes[nextIdx].isHealthy) {
        this.activeIndex = nextIdx;
        return this.getActiveEndpoint();
      }
    }
    // If all nodes are unhealthy, rotate to next anyway to retry
    this.activeIndex = (originalIndex + 1) % this.nodes.length;
    return this.getActiveEndpoint();
  }

  public resetHealth(): void {
    for (const node of this.nodes) {
      node.isHealthy = true;
      node.consecutiveFailures = 0;
    }
    this.activeIndex = 0;
  }

  public async executeWithFailover<T>(operation: (rpcUrl: string) => Promise<T>): Promise<T> {
    const attempts = this.nodes.length;
    let lastError: Error | null = null;

    for (let i = 0; i < attempts; i++) {
      const url = this.getActiveEndpoint();
      const start = Date.now();
      try {
        const result = await operation(url);
        this.recordSuccess(Date.now() - start);
        return result;
      } catch (err: any) {
        lastError = err;
        this.recordFailure();
      }
    }

    throw lastError || new Error('All RPC nodes failed');
  }
}
