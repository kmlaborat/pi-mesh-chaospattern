/**
 * Tests for DepthTracker.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { DepthTracker } from "../chaos-moderator/depth.js";

describe("DepthTracker", () => {
  let tracker: DepthTracker;

  beforeEach(() => {
    tracker = new DepthTracker(2); // 最大深度 2
  });

  it("allows first-level reply (agent responds to human)", () => {
    const result = tracker.check("agent-1", "human", 1);
    expect(result.allowed).toBe(true);
  });

  it("allows second-level reply (agent responds to agent)", () => {
    const result = tracker.check("agent-2", "agent-1", 2);
    expect(result.allowed).toBe(true);
  });

  it("blocks third-level reply (agent responds to agent's agent response)", () => {
    const result = tracker.check("agent-3", "agent-2", 3);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("depth");
  });

  it("allows reply when depth is within limit", () => {
    const result = tracker.check("agent-1", "agent-2", 2);
    expect(result.allowed).toBe(true);
  });

  it("tracks reply chain correctly", () => {
    // human → agent-1 (depth 1)
    tracker.record("agent-1", "human", 1);
    // agent-2 → agent-1 (depth 2)
    tracker.record("agent-2", "agent-1", 2);
    // agent-1 → agent-2 (depth 3) — ブロック
    const result = tracker.check("agent-1", "agent-2", 3);
    expect(result.allowed).toBe(false);
  });
});
