/**
 * Tests for DuplicateDetector.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { DuplicateDetector } from "../chaos-moderator/duplicate.js";
import { levenshtein } from "../chaos-moderator/levenshtein.js";

describe("DuplicateDetector", () => {
  let detector: DuplicateDetector;

  beforeEach(() => {
    // 80% 類似度閾値、直近 10 メッセージを監視
    detector = new DuplicateDetector(10, 0.8);
  });

  it("allows completely new message", () => {
    detector.add("Hello world!");
    const result = detector.check("Good morning!");
    expect(result.allowed).toBe(true);
  });

  it("blocks identical messages", () => {
    detector.add("Hello world!");
    const result = detector.check("Hello world!");
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("duplicate");
  });

  it("blocks highly similar messages", () => {
    detector.add("Hello world!");
    const result = detector.check("Hello worled!");
    expect(result.allowed).toBe(false);
  });

  it("allows slightly different messages", () => {
    detector.add("Hello world!");
    const result = detector.check("Goodbye world!");
    expect(result.allowed).toBe(true);
  });

  it("respects the message window limit", () => {
    for (let i = 0; i < 15; i++) {
      detector.add(`Message ${i}`);
    }
    // 古いメッセージは削除されているはず
    expect((detector as any).window.length).toBe(10);
  });

  it("uses levenshtein for similarity calculation", () => {
    // "kitten" と "sitting" は距離 3、長さ 7 の文字列
    // 類似度 = 1 - (3/7) = 0.57 → 80% 閾値を下回る → 許可
    detector.add("kitten");
    const result = detector.check("sitting");
    expect(result.allowed).toBe(true);
  });
});
