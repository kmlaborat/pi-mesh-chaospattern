/**
 * Tests for CooldownManager.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { CooldownManager } from "../chaos-moderator/cooldown.js";

describe("CooldownManager", () => {
  let manager: CooldownManager;

  beforeEach(() => {
    manager = new CooldownManager(2000); // 2 秒
  });

  it("allows first message from an agent", () => {
    const result = manager.check("agent-1", Date.now());
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("blocks messages within cooldown period", () => {
    const now = Date.now();
    manager.record("agent-1", now);

    // 1 秒後に再チェック — ブロックされる
    const result = manager.check("agent-1", now + 1000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("cooldown");
  });

  it("allows messages after cooldown expires", () => {
    const now = Date.now();
    manager.record("agent-1", now);

    // 3 秒後に再チェック — 許可される
    const result = manager.check("agent-1", now + 3000);
    expect(result.allowed).toBe(true);
  });

  it("tracks multiple agents independently", () => {
    const now = Date.now();
    manager.record("agent-1", now);

    // agent-2 はまだ一度も投稿していない
    const result = manager.check("agent-2", now + 1000);
    expect(result.allowed).toBe(true);
  });

  it("resets cooldown after each allowed message", () => {
    const now = Date.now();
    manager.record("agent-1", now);

    // 2 秒後 — 許可されるが、タイマーがリセットされる
    const t1 = now + 2000;
    const r1 = manager.check("agent-1", t1);
    manager.record("agent-1", t1);

    // さらに 1 秒後 — またブロックされる（タイマーがリセットされたため）
    const r2 = manager.check("agent-1", t1 + 1000);
    expect(r2.allowed).toBe(false);
  });
});
