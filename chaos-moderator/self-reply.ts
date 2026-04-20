/**
 * SelfReplyFilter - Prevents agents from replying to themselves.
 */

export interface SelfReplyResult {
  allowed: boolean;
  reason?: string;
}

export class SelfReplyFilter {
  check(agent: string, repliedTo: string): SelfReplyResult {
    if (agent === repliedTo) {
      return {
        allowed: false,
        reason: `self-reply: ${agent} cannot reply to itself`,
      };
    }

    return { allowed: true };
  }
}
