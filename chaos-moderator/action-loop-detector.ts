/**
 * ActionLoopDetector - Detects repeated identical actions (e.g., `ping`, `curl`).
 * 
 * This is a CRITICAL safety mechanism to prevent:
 * - Infinite command loops that exhaust CPU/network resources
 * - Rate limit violations from repeated API calls
 * - System crashes from runaway processes
 * 
 * Unlike conversation loops, action loops can directly damage infrastructure.
 */

export interface ActionRecord {
  command: string;      // e.g., "ping", "curl", "git"
  args: string;         // e.g., "google.com", "https://api.example.com"
  fullCommand: string;  // e.g., "ping google.com"
  timestamp: number;
}

export interface ActionLoopConfig {
  /** Maximum repetitions of the same action before blocking (default: 3) */
  threshold: number;
  /** Lookback window size for detecting loops (default: 5) */
  windowSize: number;
  /** Cooldown seconds after loop detected (default: 10) */
  cooldownSeconds: number;
}

export interface ActionLoopResult {
  allowed: boolean;
  reason?: string;
  detectedLoop?: string;
  repetitionCount?: number;
}

export class ActionLoopDetector {
  private actionHistory: Map<string, ActionRecord[]>; // agent -> actions
  private cooldownUntil: Map<string, number>; // agent -> timestamp
  private config: ActionLoopConfig;

  constructor(config?: Partial<ActionLoopConfig>) {
    this.config = {
      threshold: config?.threshold ?? 3,
      windowSize: config?.windowSize ?? 5,
      cooldownSeconds: config?.cooldownSeconds ?? 10,
    };
    this.actionHistory = new Map();
    this.cooldownUntil = new Map();
  }

  /**
   * Check if an action should be allowed.
   * 
   * @param agent - The agent attempting the action
   * @param command - The command (e.g., "ping", "curl")
   * @param args - The command arguments
   * @returns ActionLoopResult indicating if the action is allowed
   */
  check(agent: string, command: string, args: string): ActionLoopResult {
    const fullCommand = `${command} ${args}`.trim();
    const now = Date.now();

    // Check cooldown first
    const cooldownEnd = this.cooldownUntil.get(agent);
    if (cooldownEnd && now < cooldownEnd) {
      const remaining = Math.ceil((cooldownEnd - now) / 1000);
      return {
        allowed: false,
        reason: `Action loop detected. Cooldown active for ${remaining}s. Try a different approach.`,
      };
    }

    // Get or initialize action history for this agent
    if (!this.actionHistory.has(agent)) {
      this.actionHistory.set(agent, []);
    }
    const history = this.actionHistory.get(agent)!;

    // Add new action to history
    const newAction: ActionRecord = {
      command,
      args,
      fullCommand,
      timestamp: now,
    };
    history.push(newAction);

    // Trim history to window size
    while (history.length > this.config.windowSize) {
      history.shift();
    }

    // Count repetitions of the same action in the window
    const repetitionCount = history.filter(
      (a) => a.fullCommand === fullCommand
    ).length;

    if (repetitionCount >= this.config.threshold) {
      // Activate cooldown
      this.cooldownUntil.set(agent, now + this.config.cooldownSeconds * 1000);

      return {
        allowed: false,
        reason: `Action loop detected: '${fullCommand}' repeated ${repetitionCount} times. Stopping to protect system resources.`,
        detectedLoop: fullCommand,
        repetitionCount,
      };
    }

    return {
      allowed: true,
    };
  }

  /**
   * Record an action that was executed (for tracking purposes).
   * This is called AFTER check() returns allowed=true.
   */
  record(agent: string, command: string, args: string): void {
    // Already recorded in check(), but this method exists for API clarity
    // and future extensions (e.g., logging, metrics).
  }

  /**
   * Clear cooldown for an agent (e.g., after human intervention).
   */
  clearCooldown(agent: string): void {
    this.cooldownUntil.delete(agent);
  }

  /**
   * Reset all state for an agent (e.g., session end).
   */
  reset(agent: string): void {
    this.actionHistory.delete(agent);
    this.cooldownUntil.delete(agent);
  }

  /**
   * Get current action history for debugging/monitoring.
   */
  getHistory(agent: string): ActionRecord[] {
    return this.actionHistory.get(agent) ?? [];
  }

  /**
   * Check if an agent is currently in cooldown.
   */
  isOnCooldown(agent: string): boolean {
    const cooldownEnd = this.cooldownUntil.get(agent);
    if (!cooldownEnd) return false;
    return Date.now() < cooldownEnd;
  }
}
