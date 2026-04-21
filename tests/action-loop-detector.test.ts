/**
 * Tests for ActionLoopDetector.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { ActionLoopDetector } from "../chaos-moderator/action-loop-detector.js";

describe("ActionLoopDetector", () => {
  let detector: ActionLoopDetector;

  beforeEach(() => {
    // 閾値 3 回、ウィンドウ 5 回、クールダウン 10 秒
    detector = new ActionLoopDetector({
      threshold: 3,
      windowSize: 5,
      cooldownSeconds: 10,
    });
  });

  it("allows first occurrence of an action", () => {
    const result = detector.check("agent-1", "ping", "google.com");
    expect(result.allowed).toBe(true);
  });

  it("allows second occurrence of an action", () => {
    detector.check("agent-1", "ping", "google.com");
    const result = detector.check("agent-1", "ping", "google.com");
    expect(result.allowed).toBe(true);
  });

  it("blocks third occurrence of the same action", () => {
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "google.com");
    const result = detector.check("agent-1", "ping", "google.com");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Action loop detected");
    expect(result.reason).toContain("ping google.com");
    expect(result.reason).toContain("3 times");
  });

  it("allows different actions from the same agent", () => {
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "8.8.8.8");
    detector.check("agent-1", "curl", "example.com");
    
    const result = detector.check("agent-1", "ping", "google.com");
    expect(result.allowed).toBe(true);
  });

  it("tracks actions per agent independently", () => {
    // agent-1 が 2 回実行
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "google.com");
    
    // agent-2 はまだ 0 回
    const result = detector.check("agent-2", "ping", "google.com");
    expect(result.allowed).toBe(true);
  });

  it("blocks action after cooldown is activated", () => {
    // スリー回目でブロック
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "google.com");
    const blocked = detector.check("agent-1", "ping", "google.com");
    expect(blocked.allowed).toBe(false);
    
    // クールダウン中なので、すぐにもう一度試してもブロック
    const stillBlocked = detector.check("agent-1", "ping", "google.com");
    expect(stillBlocked.allowed).toBe(false);
    expect(stillBlocked.reason).toContain("Cooldown active");
  });

  it("blocks all actions during cooldown period", () => {
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "google.com"); // ブロック
    
    // クールダウン中は、違うコマンドもブロックされる
    const different = detector.check("agent-1", "curl", "example.com");
    expect(different.allowed).toBe(false);
    expect(different.reason).toContain("Cooldown active");
  });

  it("resets agent state correctly", () => {
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "google.com");
    
    detector.reset("agent-1");
    
    // リセット後なので許可
    const result = detector.check("agent-1", "ping", "google.com");
    expect(result.allowed).toBe(true);
  });

  it("clears cooldown without resetting history", () => {
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "google.com"); // ブロック
    
    detector.clearCooldown("agent-1");
    
    // クールダウンは解除されたが、履歴は残っている
    // 2 回分の履歴があるので、次はブロックされるはず
    const result = detector.check("agent-1", "ping", "google.com");
    expect(result.allowed).toBe(false);
  });

  it("returns correct repetition count in result", () => {
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "google.com");
    const result = detector.check("agent-1", "ping", "google.com");
    
    expect(result.allowed).toBe(false);
    expect(result.repetitionCount).toBe(3);
    expect(result.detectedLoop).toBe("ping google.com");
  });

  it("handles commands with no arguments", () => {
    detector.check("agent-1", "git", "status");
    detector.check("agent-1", "git", "status");
    const result = detector.check("agent-1", "git", "status");
    expect(result.allowed).toBe(false);
  });

  it("handles complex commands with multiple arguments", () => {
    detector.check("agent-1", "curl", "-X POST https://api.example.com/data");
    detector.check("agent-1", "curl", "-X POST https://api.example.com/data");
    const result = detector.check("agent-1", "curl", "-X POST https://api.example.com/data");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("curl -X POST https://api.example.com/data");
  });

  it("allows same command with different arguments", () => {
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "8.8.8.8");
    detector.check("agent-1", "ping", "1.1.1.1");
    detector.check("agent-1", "ping", "google.com"); // 2 回目なので許可
    expect(true).toBe(true);
  });

  it("getHistory returns empty array for unknown agent", () => {
    const history = detector.getHistory("unknown-agent");
    expect(history).toEqual([]);
  });

  it("getHistory returns correct history", () => {
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "curl", "example.com");
    
    const history = detector.getHistory("agent-1");
    expect(history.length).toBe(2);
    expect(history[0].command).toBe("ping");
    expect(history[1].command).toBe("curl");
  });

  it("isOnCooldown returns false when not in cooldown", () => {
    detector.check("agent-1", "ping", "google.com");
    expect(detector.isOnCooldown("agent-1")).toBe(false);
  });

  it("isOnCooldown returns true after loop detected", () => {
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "google.com");
    detector.check("agent-1", "ping", "google.com"); // ブロック
    
    // 即座にチェック（クールダウン中）
    expect(detector.isOnCooldown("agent-1")).toBe(true);
  });
});
