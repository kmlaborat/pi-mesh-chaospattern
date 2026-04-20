/**
 * Tests for LoopDetector.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { LoopDetector } from "../chaos-moderator/loop.js";

describe("LoopDetector", () => {
  let detector: LoopDetector;

  beforeEach(() => {
    detector = new LoopDetector(5); // 直近 5 メッセージ
  });

  it("allows normal conversation", () => {
    detector.add("agent-1", "Hello");
    detector.add("agent-2", "Hi there");
    detector.add("agent-1", "How are you");
    const result = detector.check("agent-2", "Fine thanks");
    expect(result.allowed).toBe(true);
  });

  it("detects simple echo loop", () => {
    detector.add("agent-1", "test");
    detector.add("agent-2", "test");
    detector.add("agent-1", "test");
    const result = detector.check("agent-2", "test");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("loop");
  });

  it("allows different responses in alternating pattern", () => {
    detector.add("agent-1", "Hello");
    detector.add("agent-2", "Hi");
    detector.add("agent-1", "How are you");
    detector.add("agent-2", "Good");
    const result = detector.check("agent-1", "Great");
    expect(result.allowed).toBe(true);
  });

  it("respects the window size", () => {
    // ウィンドウ外はカウントされない
    for (let i = 0; i < 10; i++) {
      detector.add(`agent-${i % 2}`, `msg-${i}`);
    }
    // 直近 5 メッセージの中に重複パターンはない
    const result = detector.check("agent-0", "msg-9");
    expect(result.allowed).toBe(true);
  });

  it("tracks message content, not just agent", () => {
    detector.add("agent-1", "different1");
    detector.add("agent-2", "different2");
    detector.add("agent-1", "different3");
    const result = detector.check("agent-2", "different4");
    expect(result.allowed).toBe(true);
  });
});
