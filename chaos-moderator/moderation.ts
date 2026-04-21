/**
 * ModerationService - Orchestrates all moderation rules.
 */

import { CooldownManager } from "./cooldown.js";
import { DuplicateDetector } from "./duplicate.js";
import { LoopDetector } from "./loop.js";
import { DepthTracker } from "./depth.js";
import { SelfReplyFilter } from "./self-reply.js";
import { ActionLoopDetector, ActionLoopConfig } from "./action-loop-detector.js";

export interface ModerationDecision {
  rule: string;
  reason: string;
}

export interface ModerationResult {
  allowed: boolean;
  decisions: ModerationDecision[];
}

export interface EvaluateInput {
  from: string;
  to: string;
  text: string;
  timestamp: number;
  depth: number;
  replyTo: string;
}

export interface ModerationConfig {
  cooldownMs: number;
  duplicateWindowSize: number;
  duplicateThreshold: number;
  loopWindowSize: number;
  maxDepth: number;
  actionLoopThreshold?: number;
  actionLoopWindow?: number;
  actionLoopCooldownSeconds?: number;
}

export class ModerationService {
  private cooldownManager: CooldownManager;
  private duplicateDetector: DuplicateDetector;
  private loopDetector: LoopDetector;
  private depthTracker: DepthTracker;
  private selfReplyFilter: SelfReplyFilter;
  private actionLoopDetector: ActionLoopDetector;

  constructor(config: ModerationConfig) {
    this.cooldownManager = new CooldownManager(config.cooldownMs);
    this.duplicateDetector = new DuplicateDetector(
      config.duplicateWindowSize,
      config.duplicateThreshold
    );
    this.loopDetector = new LoopDetector(config.loopWindowSize);
    this.depthTracker = new DepthTracker(config.maxDepth);
    this.selfReplyFilter = new SelfReplyFilter();
    this.actionLoopDetector = new ActionLoopDetector({
      threshold: config.actionLoopThreshold ?? 3,
      windowSize: config.actionLoopWindow ?? 5,
      cooldownSeconds: config.actionLoopCooldownSeconds ?? 10,
    });
  }

  evaluate(input: EvaluateInput): ModerationResult {
    const decisions: ModerationDecision[] = [];

    // Rule 1: Self-reply check
    const selfReply = this.selfReplyFilter.check(input.from, input.replyTo);
    if (!selfReply.allowed) {
      decisions.push({ rule: "self-reply", reason: selfReply.reason! });
      return { allowed: false, decisions };
    }

    // Rule 2: Cooldown check
    const cooldown = this.cooldownManager.check(input.from, input.timestamp);
    if (!cooldown.allowed) {
      decisions.push({ rule: "cooldown", reason: cooldown.reason! });
      return { allowed: false, decisions };
    }

    // Rule 3: Duplicate check
    const duplicate = this.duplicateDetector.check(input.text);
    if (!duplicate.allowed) {
      decisions.push({ rule: "duplicate", reason: duplicate.reason! });
      return { allowed: false, decisions };
    }

    // Rule 4: Loop check
    this.loopDetector.add(input.from, input.text);
    const loop = this.loopDetector.check(input.from, input.text);
    if (!loop.allowed) {
      decisions.push({ rule: "loop", reason: loop.reason! });
      return { allowed: false, decisions };
    }

    // Rule 5: Depth check
    const depth = this.depthTracker.check(input.from, input.replyTo, input.depth);
    if (!depth.allowed) {
      decisions.push({ rule: "depth", reason: depth.reason! });
      return { allowed: false, decisions };
    }

    // All checks passed — record the message
    this.cooldownManager.record(input.from, input.timestamp);
    this.duplicateDetector.add(input.text);
    this.depthTracker.record(input.from, input.replyTo, input.depth);

    return { allowed: true, decisions: [] };
  }

  record(agent: string, timestamp: number): void {
    this.cooldownManager.record(agent, timestamp);
  }

  addMessage(agent: string, text: string): void {
    this.duplicateDetector.add(text);
    this.loopDetector.add(agent, text);
  }

  /**
   * Check if a bash command/action should be allowed.
   * This is a CRITICAL safety check for infrastructure protection.
   * 
   * @param agent - The agent attempting the action
   * @param command - The command (e.g., "ping", "curl")
   * @param args - The command arguments
   * @returns { allowed: boolean, reason?: string }
   */
  checkAction(agent: string, command: string, args: string): {
    allowed: boolean;
    reason?: string;
  } {
    const result = this.actionLoopDetector.check(agent, command, args);
    if (!result.allowed) {
      return {
        allowed: false,
        reason: result.reason,
      };
    }
    return { allowed: true };
  }

  /**
   * Record an action that was executed (for tracking).
   */
  recordAction(agent: string, command: string, args: string): void {
    this.actionLoopDetector.record(agent, command, args);
  }

  /**
   * Reset state for an agent (e.g., session end).
   */
  resetAgent(agent: string): void {
    this.actionLoopDetector.reset(agent);
  }

  /**
   * Get action history for debugging/monitoring.
   */
  getActionHistory(agent: string): any[] {
    return this.actionLoopDetector.getHistory(agent);
  }
}
