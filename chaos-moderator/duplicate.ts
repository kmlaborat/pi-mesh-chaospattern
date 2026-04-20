/**
 * DuplicateDetector - Detects similar messages using Levenshtein distance.
 */

import { levenshtein } from "./levenshtein.js";

export interface DuplicateResult {
  allowed: boolean;
  reason?: string;
}

export class DuplicateDetector {
  private window: string[] = [];

  constructor(
    private windowSize: number,
    private similarityThreshold: number
  ) {}

  add(message: string): void {
    this.window.push(message);
    if (this.window.length > this.windowSize) {
      this.window.shift();
    }
  }

  check(message: string): DuplicateResult {
    for (const existing of this.window) {
      const dist = levenshtein(message.toLowerCase(), existing.toLowerCase());
      const maxLen = Math.max(message.length, existing.length);
      if (maxLen === 0) continue;

      const similarity = 1 - dist / maxLen;
      if (similarity >= this.similarityThreshold) {
        return {
          allowed: false,
          reason: `duplicate: ${Math.round(similarity * 100)}% similar to "${existing.slice(0, 40)}"`,
        };
      }
    }

    return { allowed: true };
  }
}
