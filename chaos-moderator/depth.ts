/**
 * DepthTracker - Tracks reply chain depth to prevent infinite loops.
 */

export interface DepthResult {
  allowed: boolean;
  reason?: string;
}

export class DepthTracker {
  constructor(private maxDepth: number) {}

  record(agent: string, repliedTo: string, depth: number): void {
    // DepthTracker is stateless for checking — record is a no-op
    // The actual chain tracking happens in ModerationService
  }

  check(agent: string, repliedTo: string, depth: number): DepthResult {
    if (depth > this.maxDepth) {
      return {
        allowed: false,
        reason: `depth: reply chain depth ${depth} exceeds max ${this.maxDepth}`,
      };
    }

    return { allowed: true };
  }
}
