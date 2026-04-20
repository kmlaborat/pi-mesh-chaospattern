/**
 * LoopDetector - Detects conversation loops.
 */

export interface LoopResult {
  allowed: boolean;
  reason?: string;
}

export class LoopDetector {
  private window: Array<{ agent: string; message: string }> = [];

  constructor(private windowSize: number) {}

  add(agent: string, message: string): void {
    this.window.push({ agent, message });
    if (this.window.length > this.windowSize) {
      this.window.shift();
    }
  }

  check(agent: string, message: string): LoopResult {
    if (this.window.length < 3) {
      return { allowed: true };
    }

    // 直近 3 メッセージが同じ内容/エージェントパターンを繰り返していないかチェック
    const recent = this.window.slice(-3);
    const messages = recent.map((e) => e.message.toLowerCase());
    const agents = recent.map((e) => e.agent);

    // 全メッセージが同一内容
    const allSameMessage = messages.every((m) => m === messages[0]);
    if (allSameMessage && messages[0].length > 0) {
      return {
        allowed: false,
        reason: `loop: repeated message "${messages[0].slice(0, 30)}" 3 times`,
      };
    }

    // エージェントが交互に同じ内容を繰り返していないか
    if (agents[0] === agents[2] && agents[0] !== agents[1]) {
      const msg1 = messages[0];
      const msg2 = messages[1];
      if (msg1 === msg2 && msg1.length > 0) {
        return {
          allowed: false,
          reason: `loop: ${agents[0]} and ${agents[1]} repeating alternating responses`,
        };
      }
    }

    return { allowed: true };
  }
}
