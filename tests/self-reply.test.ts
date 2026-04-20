/**
 * Tests for SelfReplyFilter.
 */

import { describe, it, expect } from "bun:test";
import { SelfReplyFilter } from "../chaos-moderator/self-reply.js";

describe("SelfReplyFilter", () => {
  const filter = new SelfReplyFilter();

  it("blocks self-reply", () => {
    const result = filter.check("agent-1", "agent-1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("self");
  });

  it("allows reply to different agent", () => {
    const result = filter.check("agent-1", "agent-2");
    expect(result.allowed).toBe(true);
  });

  it("allows reply to human", () => {
    const result = filter.check("agent-1", "human");
    expect(result.allowed).toBe(true);
  });

  it("is case-sensitive", () => {
    const result = filter.check("agent-1", "Agent-1");
    expect(result.allowed).toBe(true);
  });
});
