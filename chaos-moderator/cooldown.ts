/**
 * CooldownManager - Prevents agents from posting too frequently.
 */

export interface CooldownResult {
  allowed: boolean;
  reason?: string;
}

export class CooldownManager {
  private lastPostTime = new Map<string, number>();

  constructor(private cooldownMs: number) {}

  check(agent: string, now: number): CooldownResult {
    const last = this.lastPostTime.get(agent);
    if (last === undefined) {
      return { allowed: true };
    }

    const elapsed = now - last;
    if (elapsed < this.cooldownMs) {
      return {
        allowed: false,
        reason: `cooldown: ${agent} posted ${elapsed}ms ago (need ${this.cooldownMs}ms)`,
      };
    }

    return { allowed: true };
  }

  record(agent: string, timestamp: number): void {
    this.lastPostTime.set(agent, timestamp);
  }
}
