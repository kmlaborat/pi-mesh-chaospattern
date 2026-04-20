/**
 * Tests for Levenshtein distance calculation.
 */

import { describe, it, expect } from "bun:test";
import { levenshtein } from "../chaos-moderator/levenshtein.js";

describe("levenshtein", () => {
  it("identical strings have distance 0", () => {
    expect(levenshtein("hello", "hello")).toBe(0);
  });

  it("single character insertion", () => {
    expect(levenshtein("hello", "hallo")).toBe(1);
  });

  it("single character deletion", () => {
    expect(levenshtein("hallo", "hello")).toBe(1);
  });

  it("single character substitution", () => {
    expect(levenshtein("cat", "bat")).toBe(1);
  });

  it("multiple operations", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });

  it("empty strings", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
    expect(levenshtein("", "")).toBe(0);
  });

  it("very different strings", () => {
    expect(levenshtein("abc", "xyz")).toBe(3);
  });
});
