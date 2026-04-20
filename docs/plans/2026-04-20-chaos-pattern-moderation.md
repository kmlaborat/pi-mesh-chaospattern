# Chaos Pattern Moderation Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** エージェント間メッセージに暴走防止の制御ルール（Cooldown, 重複検知, ループ抑制, 深度制限, 自己返信フィルタ）を実装する

**Architecture:** `chaos-moderator.ts` モジュールを新規作成し、既存の `deliverMessage()` パイプラインに統合。ルールは純粋関数として実装し、`ModerationService` が全ルールを直列実行して最終判定を行う。

**Tech Stack:** TypeScript (bun:test), Pi-coding-agent extension API

---

## Phase 1: コア moderation エンジン（TDD）

### Task 1: Levenshtein距離関数

**TDD scenario:** 新規機能 — 完全なTDDサイクル。Levenshtein距離は外部ライブラリ未依存で自前実装。

**Files:**
- Create: `tests/levenshtein.test.ts`
- Create: `src/levenshtein.ts`

**Step 1: テストファイルを作成**

```typescript
// tests/levenshtein.test.ts
import { describe, it, expect } from "bun:test";
import { levenshtein } from "../src/levenshtein.js";

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
```

**Step 2: テンプレートファイルを作成（まだ実装なし）**

```typescript
// src/levenshtein.ts
export function levenshtein(a: string, b: string): number {
  throw new Error("Not implemented");
}
```

**Step 3: テストを実行して失敗を確認**

```bash
cd C:/Users/Game/MyDevEnv/wd/pi-mesh
bun test tests/levenshtein.test.ts
```

Expected: FAIL — "Not implemented" エラー

**Step 4: 最小限の実装**

```typescript
// src/levenshtein.ts
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}
```

**Step 5: テストを実行して合格を確認**

```bash
bun test tests/levenshtein.test.ts
```

Expected: PASS — 全テスト合格

**Step 6: コミット**

```bash
git add src/levenshtein.ts tests/levenshtein.test.ts
git commit -m "feat: add Levenshtein distance utility"
```

---

### Task 2: CooldownManager

**TDD scenario:** 新規機能 — 各エージェントの最終投稿時刻を管理し、2秒未満の再投稿をブロックする。

**Files:**
- Create: `tests/cooldown.test.ts`
- Create: `src/cooldown.ts`

**Step 1: テストファイルを作成**

```typescript
// tests/cooldown.test.ts
import { describe, it, expect } from "bun:test";
import { CooldownManager, CooldownResult } from "../src/cooldown.js";

describe("CooldownManager", () => {
  let manager: CooldownManager;

  beforeEach(() => {
    manager = new CooldownManager(2000); // 2秒
  });

  it("allows first message from an agent", () => {
    const result = manager.check("agent-1", Date.now());
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("blocks messages within cooldown period", () => {
    const now = Date.now();
    manager.record("agent-1", now);

    // 1秒後に再チェック — ブロックされる
    const result = manager.check("agent-1", now + 1000);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("cooldown");
  });

  it("allows messages after cooldown expires", () => {
    const now = Date.now();
    manager.record("agent-1", now);

    // 3秒後に再チェック — 許可される
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

    // 2秒後 — 許可されるが、タイマーがリセットされる
    const t1 = now + 2000;
    const r1 = manager.check("agent-1", t1);
    manager.record("agent-1", t1);

    // さらに1秒後 — またブロックされる（タイマーがリセットされたため）
    const r2 = manager.check("agent-1", t1 + 1000);
    expect(r2.allowed).toBe(false);
  });
});
```

**Step 2: テンプレートファイルを作成**

```typescript
// src/cooldown.ts
export interface CooldownResult {
  allowed: boolean;
  reason?: string;
}

export class CooldownManager {
  constructor(private cooldownMs: number) {}

  check(agent: string, now: number): CooldownResult {
    throw new Error("Not implemented");
  }

  record(agent: string, timestamp: number): void {
    throw new Error("Not implemented");
  }
}
```

**Step 3: テストを実行して失敗を確認**

```bash
bun test tests/cooldown.test.ts
```

Expected: FAIL — "Not implemented"

**Step 4: 最小限の実装**

```typescript
// src/cooldown.ts
export interface CooldownResult {
  allowed: boolean;
  reason?: string;
}

export class CooldownManager {
  private lastPostTime = new Map<string, number>();

  constructor(private cooldownMs: number) {}

  check(agent: string, now: number): CooldownResult {
    const last = this.lastPostTime.get(agent);
    if (last === undefined) {
      return { allowed: true };
    }

    const elapsed = now - last;
    if (elapsed < this.cooldownMs) {
      return {
        allowed: false,
        reason: `cooldown: ${agent} posted ${elapsed}ms ago (need ${this.cooldownMs}ms)`,
      };
    }

    return { allowed: true };
  }

  record(agent: string, timestamp: number): void {
    this.lastPostTime.set(agent, timestamp);
  }
}
```

**Step 5: テストを実行して合格を確認**

```bash
bun test tests/cooldown.test.ts
```

Expected: PASS — 全テスト合格

**Step 6: コミット**

```bash
git add src/cooldown.ts tests/cooldown.test.ts
git commit -m "feat: add CooldownManager for post rate limiting"
```

---

### Task 3: DuplicateDetector（重複検知）

**TDD scenario:** 新規機能 — Levenshtein距離を使って、直近のメッセージと似ている内容をブロックする。

**Files:**
- Create: `tests/duplicate.test.ts`
- Create: `src/duplicate.ts`

**Step 1: テストファイルを作成**

```typescript
// tests/duplicate.test.ts
import { describe, it, expect } from "bun:test";
import { DuplicateDetector, DuplicateResult } from "../src/duplicate.js";
import { levenshtein } from "../src/levenshtein.js";

describe("DuplicateDetector", () => {
  let detector: DuplicateDetector;

  beforeEach(() => {
    // 80% 類似度閾値、直近10メッセージを監視
    detector = new DuplicateDetector(10, 0.8);
  });

  it("allows completely new message", () => {
    detector.add("Hello world!");
    const result = detector.check("Hello world!");
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
    expect(detector["window"].length).toBe(10);
  });

  it("uses levenshtein for similarity calculation", () => {
    // "kitten" と "sitting" は距離3、長さ7の文字列
    // 類似度 = 1 - (3/7) = 0.57 → 80%閾値を下回る → 許可
    detector.add("kitten");
    const result = detector.check("sitting");
    expect(result.allowed).toBe(true);
  });
});
```

**Step 2: テンプレートファイルを作成**

```typescript
// src/duplicate.ts
export interface DuplicateResult {
  allowed: boolean;
  reason?: string;
}

export class DuplicateDetector {
  constructor(
    private windowSize: number,
    private similarityThreshold: number
  ) {}

  add(message: string): void {
    throw new Error("Not implemented");
  }

  check(message: string): DuplicateResult {
    throw new Error("Not implemented");
  }
}
```

**Step 3: テストを実行して失敗を確認**

```bash
bun test tests/duplicate.test.ts
```

Expected: FAIL — "Not implemented"

**Step 4: 最小限の実装**

```typescript
// src/duplicate.ts
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
```

**Step 5: テストを実行して合格を確認**

```bash
bun test tests/duplicate.test.ts
```

Expected: PASS — 全テスト合格

**Step 6: コミット**

```bash
git add src/duplicate.ts tests/duplicate.test.ts
git commit -m "feat: add DuplicateDetector using Levenshtein distance"
```

---

### Task 4: LoopDetector（ループ抑制）

**TDD scenario:** 新規機能 — 会話のパターンが繰り返されているかを検知する。同じトピックが3回以上繰り返された場合、ループとみなす。

**Files:**
- Create: `tests/loop.test.ts`
- Create: `src/loop.ts`

**Step 1: テストファイルを作成**

```typescript
// tests/loop.test.ts
import { describe, it, expect } from "bun:test";
import { LoopDetector, LoopResult } from "../src/loop.js";

describe("LoopDetector", () => {
  let detector: LoopDetector;

  beforeEach(() => {
    detector = new LoopDetector(5); // 直近5メッセージ
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
    // 直近5メッセージの中に重複パターンはない
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
```

**Step 2: テンプレートファイルを作成**

```typescript
// src/loop.ts
export interface LoopResult {
  allowed: boolean;
  reason?: string;
}

export class LoopDetector {
  constructor(private windowSize: number) {}

  add(agent: string, message: string): void {
    throw new Error("Not implemented");
  }

  check(agent: string, message: string): LoopResult {
    throw new Error("Not implemented");
  }
}
```

**Step 3: テストを実行して失敗を確認**

```bash
bun test tests/loop.test.ts
```

Expected: FAIL — "Not implemented"

**Step 4: 最小限の実装**

```typescript
// src/loop.ts
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

    // 直近3メッセージが同じ内容/エージェントパターンを繰り返していないかチェック
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
```

**Step 5: テストを実行して合格を確認**

```bash
bun test tests/loop.test.ts
```

Expected: PASS — 全テスト合格

**Step 6: コミット**

```bash
git add src/loop.ts tests/loop.test.ts
git commit -m "feat: add LoopDetector to prevent conversation loops"
```

---

### Task 5: DepthTracker（深度追跡）

**TDD scenario:** 新規機能 — 返信連鎖の深度を追跡し、2段階を超えたエージェント→エージェントの返信をブロックする。

**Files:**
- Create: `tests/depth.test.ts`
- Create: `src/depth.ts`

**Step 1: テストファイルを作成**

```typescript
// tests/depth.test.ts
import { describe, it, expect } from "bun:test";
import { DepthTracker, DepthResult } from "../src/depth.js";

describe("DepthTracker", () => {
  let tracker: DepthTracker;

  beforeEach(() => {
    tracker = new DepthTracker(2); // 最大深度2
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
```

**Step 2: テンプレートファイルを作成**

```typescript
// src/depth.ts
export interface DepthResult {
  allowed: boolean;
  reason?: string;
}

export class DepthTracker {
  constructor(private maxDepth: number) {}

  record(agent: string, repliedTo: string, depth: number): void {
    throw new Error("Not implemented");
  }

  check(agent: string, repliedTo: string, depth: number): DepthResult {
    throw new Error("Not implemented");
  }
}
```

**Step 3: テストを実行して失敗を確認**

```bash
bun test tests/depth.test.ts
```

Expected: FAIL — "Not implemented"

**Step 4: 最小限の実装**

```typescript
// src/depth.ts
export interface DepthResult {
  allowed: boolean;
  reason?: string;
}

export class DepthTracker {
  constructor(private maxDepth: number) {}

  record(agent: string, repliedTo: string, depth: number): void {
    // DepthTracker is stateless for checking — record is a no-op
    // The actual chain tracking happens in ModerationService
  }

  check(agent: string, repliedTo: string, depth: number): DepthResult {
    if (depth > this.maxDepth) {
      return {
        allowed: false,
        reason: `depth: reply chain depth ${depth} exceeds max ${this.maxDepth}`,
      };
    }

    return { allowed: true };
  }
}
```

**Step 5: テストを実行して合格を確認**

```bash
bun test tests/depth.test.ts
```

Expected: PASS — 全テスト合格

**Step 6: コミット**

```bash
git add src/depth.ts tests/depth.test.ts
git commit -m "feat: add DepthTracker to limit reply chain depth"
```

---

### Task 6: SelfReplyFilter（自己返信フィルタ）

**TDD scenario:** 新規機能 — エージェントが自分のメッセージに返信しないようにする。単純な比較で十分。

**Files:**
- Create: `tests/self-reply.test.ts`
- Create: `src/self-reply.ts`

**Step 1: テストファイルを作成**

```typescript
// tests/self-reply.test.ts
import { describe, it, expect } from "bun:test";
import { SelfReplyFilter, SelfReplyResult } from "../src/self-reply.js";

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
```

**Step 2: テンプレートファイルを作成**

```typescript
// src/self-reply.ts
export interface SelfReplyResult {
  allowed: boolean;
  reason?: string;
}

export class SelfReplyFilter {
  check(agent: string, repliedTo: string): SelfReplyResult {
    throw new Error("Not implemented");
  }
}
```

**Step 3: テストを実行して失敗を確認**

```bash
bun test tests/self-reply.test.ts
```

Expected: FAIL — "Not implemented"

**Step 4: 最小限の実装**

```typescript
// src/self-reply.ts
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
```

**Step 5: テストを実行して合格を確認**

```bash
bun test tests/self-reply.test.ts
```

Expected: PASS — 全テスト合格

**Step 6: コミット**

```bash
git add src/self-reply.ts tests/self-reply.test.ts
git commit -m "feat: add SelfReplyFilter to prevent agents from replying to themselves"
```

---

### Task 7: ModerationService（統合サービス）

**TDD scenario:** 新規機能 — 全ルールを直列実行し、最初のブロックで即座に判定を返す（短絡評価）。

**Files:**
- Create: `tests/moderation.test.ts`
- Create: `src/moderation.ts`

**Step 1: テストファイルを作成**

```typescript
// tests/moderation.test.ts
import { describe, it, expect } from "bun:test";
import {
  ModerationService,
  ModerationResult,
  ModerationDecision,
} from "../src/moderation.js";
import { CooldownManager } from "../src/cooldown.js";
import { DuplicateDetector } from "../src/duplicate.js";
import { LoopDetector } from "../src/loop.js";
import { DepthTracker } from "../src/depth.js";
import { SelfReplyFilter } from "../src/self-reply.js";

describe("ModerationService", () => {
  let service: ModerationService;

  beforeEach(() => {
    service = new ModerationService({
      cooldownMs: 2000,
      duplicateWindowSize: 10,
      duplicateThreshold: 0.8,
      loopWindowSize: 5,
      maxDepth: 2,
    });
  });

  it("allows a normal message with no rules triggered", () => {
    const result = service.evaluate({
      from: "agent-1",
      to: "agent-2",
      text: "Hello, how are you?",
      timestamp: Date.now(),
      depth: 1,
      replyTo: "human",
    });

    expect(result.allowed).toBe(true);
    expect(result.decisions).toEqual([]);
  });

  it("blocks on cooldown violation", () => {
    service.record("agent-1", Date.now());
    const result = service.evaluate({
      from: "agent-1",
      to: "agent-2",
      text: "Hello",
      timestamp: Date.now() + 1000,
      depth: 1,
      replyTo: "human",
    });

    expect(result.allowed).toBe(false);
    expect(result.decisions.some((d) => d.rule === "cooldown")).toBe(true);
  });

  it("blocks on duplicate message", () => {
    service.record("agent-1", Date.now());
    service.addMessage("agent-1", "Hello world");

    const result = service.evaluate({
      from: "agent-1",
      to: "agent-2",
      text: "Hello world",
      timestamp: Date.now() + 3000,
      depth: 1,
      replyTo: "human",
    });

    expect(result.allowed).toBe(false);
    expect(result.decisions.some((d) => d.rule === "duplicate")).toBe(true);
  });

  it("blocks on loop detection", () => {
    service.record("agent-1", Date.now());
    service.addMessage("agent-1", "test");
    service.addMessage("agent-2", "test");
    service.addMessage("agent-1", "test");

    const result = service.evaluate({
      from: "agent-2",
      to: "agent-1",
      text: "test",
      timestamp: Date.now(),
      depth: 1,
      replyTo: "agent-1",
    });

    expect(result.allowed).toBe(false);
    expect(result.decisions.some((d) => d.rule === "loop")).toBe(true);
  });

  it("blocks on depth exceeded", () => {
    const result = service.evaluate({
      from: "agent-3",
      to: "agent-2",
      text: "Response",
      timestamp: Date.now(),
      depth: 3,
      replyTo: "agent-2",
    });

    expect(result.allowed).toBe(false);
    expect(result.decisions.some((d) => d.rule === "depth")).toBe(true);
  });

  it("blocks on self-reply", () => {
    const result = service.evaluate({
      from: "agent-1",
      to: "agent-1",
      text: "Response",
      timestamp: Date.now(),
      depth: 1,
      replyTo: "agent-1",
    });

    expect(result.allowed).toBe(false);
    expect(result.decisions.some((d) => d.rule === "self-reply")).toBe(true);
  });

  it("returns first blocking reason only (short-circuit)", () => {
    // cooldown + self-reply 両方に違反 — cooldownが先に検出される
    service.record("agent-1", Date.now());

    const result = service.evaluate({
      from: "agent-1",
      to: "agent-1",
      text: "Hello",
      timestamp: Date.now() + 1000,
      depth: 1,
      replyTo: "agent-1",
    });

    expect(result.allowed).toBe(false);
    // cooldown が先にチェックされるので、self-reply は記録されない
    expect(result.decisions.length).toBe(1);
    expect(result.decisions[0].rule).toBe("cooldown");
  });

  it("records message after passing all checks", () => {
    service.evaluate({
      from: "agent-1",
      to: "agent-2",
      text: "Hello",
      timestamp: Date.now(),
      depth: 1,
      replyTo: "human",
    });

    // 内部状態に記録されているはず
    expect(service["duplicateDetector"]["window"]).toContain("Hello");
  });

  it("applies rules in correct order", () => {
    // order: self-reply → cooldown → duplicate → loop → depth
    const result = service.evaluate({
      from: "agent-1",
      to: "agent-1",
      text: "Hello",
      timestamp: Date.now(),
      depth: 3,
      replyTo: "agent-1",
    });

    // self-reply が最初なので、depth はチェックされない
    expect(result.decisions[0].rule).toBe("self-reply");
  });
});
```

**Step 2: テンプレートファイルを作成**

```typescript
// src/moderation.ts
import { CooldownManager } from "./cooldown.js";
import { DuplicateDetector } from "./duplicate.js";
import { LoopDetector } from "./loop.js";
import { DepthTracker } from "./depth.js";
import { SelfReplyFilter } from "./self-reply.js";

export interface ModerationDecision {
  rule: string;
  reason: string;
}

export interface ModerationResult {
  allowed: boolean;
  decisions: ModerationDecision[];
}

export interface EvaluateInput {
  from: string;
  to: string;
  text: string;
  timestamp: number;
  depth: number;
  replyTo: string;
}

export interface ModerationConfig {
  cooldownMs: number;
  duplicateWindowSize: number;
  duplicateThreshold: number;
  loopWindowSize: number;
  maxDepth: number;
}

export class ModerationService {
  private cooldownManager: CooldownManager;
  private duplicateDetector: DuplicateDetector;
  private loopDetector: LoopDetector;
  private depthTracker: DepthTracker;
  private selfReplyFilter: SelfReplyFilter;

  constructor(config: ModerationConfig) {
    this.cooldownManager = new CooldownManager(config.cooldownMs);
    this.duplicateDetector = new DuplicateDetector(
      config.duplicateWindowSize,
      config.duplicateThreshold
    );
    this.loopDetector = new LoopDetector(config.loopWindowSize);
    this.depthTracker = new DepthTracker(config.maxDepth);
    this.selfReplyFilter = new SelfReplyFilter();
  }

  evaluate(input: EvaluateInput): ModerationResult {
    throw new Error("Not implemented");
  }

  record(agent: string, timestamp: number): void {
    throw new Error("Not implemented");
  }

  addMessage(agent: string, text: string): void {
    throw new Error("Not implemented");
  }
}
```

**Step 3: テストを実行して失敗を確認**

```bash
bun test tests/moderation.test.ts
```

Expected: FAIL — "Not implemented"

**Step 4: 最小限の実装**

```typescript
// src/moderation.ts
import { CooldownManager } from "./cooldown.js";
import { DuplicateDetector } from "./duplicate.js";
import { LoopDetector } from "./loop.js";
import { DepthTracker } from "./depth.js";
import { SelfReplyFilter } from "./self-reply.js";

export interface ModerationDecision {
  rule: string;
  reason: string;
}

export interface ModerationResult {
  allowed: boolean;
  decisions: ModerationDecision[];
}

export interface EvaluateInput {
  from: string;
  to: string;
  text: string;
  timestamp: number;
  depth: number;
  replyTo: string;
}

export interface ModerationConfig {
  cooldownMs: number;
  duplicateWindowSize: number;
  duplicateThreshold: number;
  loopWindowSize: number;
  maxDepth: number;
}

export class ModerationService {
  private cooldownManager: CooldownManager;
  private duplicateDetector: DuplicateDetector;
  private loopDetector: LoopDetector;
  private depthTracker: DepthTracker;
  private selfReplyFilter: SelfReplyFilter;

  constructor(config: ModerationConfig) {
    this.cooldownManager = new CooldownManager(config.cooldownMs);
    this.duplicateDetector = new DuplicateDetector(
      config.duplicateWindowSize,
      config.duplicateThreshold
    );
    this.loopDetector = new LoopDetector(config.loopWindowSize);
    this.depthTracker = new DepthTracker(config.maxDepth);
    this.selfReplyFilter = new SelfReplyFilter();
  }

  evaluate(input: EvaluateInput): ModerationResult {
    const decisions: ModerationDecision[] = [];

    // Rule 1: Self-reply check
    const selfReply = this.selfReplyFilter.check(input.from, input.replyTo);
    if (!selfReply.allowed) {
      decisions.push({ rule: "self-reply", reason: selfReply.reason! });
      return { allowed: false, decisions };
    }

    // Rule 2: Cooldown check
    const cooldown = this.cooldownManager.check(input.from, input.timestamp);
    if (!cooldown.allowed) {
      decisions.push({ rule: "cooldown", reason: cooldown.reason! });
      return { allowed: false, decisions };
    }

    // Rule 3: Duplicate check
    const duplicate = this.duplicateDetector.check(input.text);
    if (!duplicate.allowed) {
      decisions.push({ rule: "duplicate", reason: duplicate.reason! });
      return { allowed: false, decisions };
    }

    // Rule 4: Loop check
    this.loopDetector.add(input.from, input.text);
    const loop = this.loopDetector.check(input.from, input.text);
    if (!loop.allowed) {
      decisions.push({ rule: "loop", reason: loop.reason! });
      return { allowed: false, decisions };
    }

    // Rule 5: Depth check
    const depth = this.depthTracker.check(input.from, input.replyTo, input.depth);
    if (!depth.allowed) {
      decisions.push({ rule: "depth", reason: depth.reason! });
      return { allowed: false, decisions };
    }

    // All checks passed — record the message
    this.cooldownManager.record(input.from, input.timestamp);
    this.duplicateDetector.add(input.text);
    this.depthTracker.record(input.from, input.replyTo, input.depth);

    return { allowed: true, decisions: [] };
  }

  record(agent: string, timestamp: number): void {
    this.cooldownManager.record(agent, timestamp);
  }

  addMessage(agent: string, text: string): void {
    this.duplicateDetector.add(text);
    this.loopDetector.add(agent, text);
  }
}
```

**Step 5: テストを実行して合格を確認**

```bash
bun test tests/moderation.test.ts
```

Expected: PASS — 全テスト合格

**Step 6: コミット**

```bash
git add src/moderation.ts src/cooldown.ts src/duplicate.ts src/loop.ts src/depth.ts src/self-reply.ts tests/moderation.test.ts tests/cooldown.test.ts tests/duplicate.test.ts tests/loop.test.ts tests/depth.test.ts tests/self-reply.test.ts
git commit -m "feat: add Chaos Pattern ModerationService with 5 rule checks"
```

---

## Phase 2: pi-mesh 統合

### Task 8: types.ts に moderated イベント型を追加

**TDD scenario:** 既存コードの修正。既存テストは影響なし。単純な型追加。

**Files:**
- Modify: `types.ts:48-50`

**Step 1: `FeedEventType` に `moderated` を追加**

```typescript
// types.ts 内の該当箇所を修正
// 元:
// export type FeedEventType =
//   | "join"
//   | "leave"
//   | "reserve"
//   | "release"
//   | "message"
//   | "commit"
//   | "test"
//   | "edit"
//   | "stuck";

// 後:
export type FeedEventType =
  | "join"
  | "leave"
  | "reserve"
  | "release"
  | "message"
  | "commit"
  | "test"
  | "edit"
  | "stuck"
  | "moderated";
```

**Step 2: 既存テストを再実行して影響なしを確認**

```bash
bun test
```

Expected: PASS — 全テスト継続して合格

**Step 3: コミット**

```bash
git add types.ts
git commit -m "chore: add 'moderated' to FeedEventType"
```

---

### Task 9: config.ts に chaosMode 設定を追加

**TDD scenario:** 既存コードの修正。設定の拡張。

**Files:**
- Modify: `types.ts` (MeshConfig に `chaosMode` を追加)
- Modify: `config.ts` (デフォルト値とマージ処理)

**Step 1: `MeshConfig` に `chaosMode` を追加（types.ts）**

```typescript
// types.ts の MeshConfig インターフェースに追加
export interface MeshConfig {
  autoRegister: boolean;
  autoRegisterPaths: string[];
  contextMode: "full" | "minimal" | "none";
  feedRetention: number;
  stuckThreshold: number;
  autoStatus: boolean;
  hooksModule?: string;
  chaosMode: "strict" | "relaxed" | "off";  // ← 追加
}
```

**Step 2: `config.ts` にデフォルト値を追加**

```typescript
// config.ts の DEFAULT_CONFIG に追加
const DEFAULT_CONFIG: MeshConfig = {
  autoRegister: false,
  autoRegisterPaths: [],
  contextMode: "full",
  feedRetention: 50,
  stuckThreshold: 900,
  autoStatus: true,
  chaosMode: "strict",  // ← 追加（デフォルトは有効）
};
```

**Step 3: `loadConfig` の戻り値に `chaosMode` を追加**

```typescript
// config.ts の loadConfig 関数の戻り値に追加
return {
  // ... existing fields ...
  chaosMode: (merged.chaosMode as "strict" | "relaxed" | "off") ?? "strict",
};
```

**Step 4: 既存テストを再実行**

```bash
bun test tests/config.test.ts
```

Expected: PASS — 既存テスト継続して合格

**Step 5: コミット**

```bash
git add types.ts config.ts
git commit -m "feat: add chaosMode config option (strict/relaxed/off)"
```

---

### Task 10: feed.ts に moderated イベントフォーマットを追加

**TDD scenario:** 既存コードの修正。`formatEvent` の switch にケースを追加。

**Files:**
- Modify: `feed.ts:70-88`

**Step 1: `formatEvent` に `moderated` ケースを追加**

```typescript
// feed.ts の formatEvent 関数内、switch に追加
case "moderated":
  line += ` blocked by ${event.target ?? "moderator"}: ${event.preview ?? ""}`;
  break;
```

**Step 2: 既存テストを再実行**

```bash
bun test
```

Expected: PASS

**Step 3: コミット**

```bash
git add feed.ts
git commit -m "feat: add moderated event format to activity feed"
```

---

### Task 11: index.ts に ModerationService 統合

**TDD scenario:** 既存コードの修正。`deliverMessage()` の前に moderation を通す。

**Files:**
- Modify: `index.ts` — `deliverMessage()` 関数を修正
- Modify: `index.ts` — `session_start` で `ModerationService` を初期化

**Step 1: `ModerationService` をインポート**

```typescript
// index.ts の import に追加
import * as moderation from "../chaos-moderator/moderation.js";
```

**Step 2: state に moderation service を追加**

```typescript
// index.ts の state 宣言後に追加
let moderator: import("../chaos-moderator/moderation.js").ModerationService | null = null;
```

**Step 3: `deliverMessage()` を修正**

```typescript
// 既存の deliverMessage 関数を以下のように変更
function deliverMessage(msg: import("./types.js").MeshMessage): void {
  // Moderation check (if enabled)
  if (moderator && config.chaosMode !== "off") {
    const result = moderator.evaluate({
      from: msg.from,
      to: msg.to,
      text: msg.text,
      timestamp: new Date(msg.timestamp).getTime(),
      depth: msg.replyTo ? 2 : 1,
      replyTo: msg.from,
    });

    if (!result.allowed) {
      feed.logEvent(
        dirs,
        msg.from,
        "moderated",
        msg.to,
        `${result.decisions[0].rule}: ${result.decisions[0].reason}`
      );
      return; // Block delivery
    }
  }

  // Original delivery logic
  const replyHint =
    config.contextMode !== "none"
      ? ` - reply: mesh_send({ to: "${msg.from}", message: "..." })`
      : "";

  const content = `**Message from ${msg.from}**${replyHint}\n\n${msg.text}`;
  const deliverAs = msg.urgent ? "steer" : "followUp";

  pi.sendMessage(
    { customType: "mesh_message", content, display: true, details: msg },
    { triggerTurn: true, deliverAs }
  );
}
```

**Step 4: `session_start` で moderator を初期化**

```typescript
// session_start イベントハンドラ内の登録成功後に追加
if (config.chaosMode !== "off") {
  moderator = new moderation.ModerationService({
    cooldownMs: 2000,
    duplicateWindowSize: 10,
    duplicateThreshold: 0.8,
    loopWindowSize: 5,
    maxDepth: 2,
  });
}
```

**Step 5: `session_shutdown` で moderator をクリア**

```typescript
// session_shutdown イベントハンドラ内に追加
moderator = null;
```

**Step 6: 既存テストを再実行**

```bash
bun test
```

Expected: PASS — 既存テスト継続して合格

**Step 7: コミット**

```bash
git add index.ts
git commit -m "feat: integrate Chaos Pattern moderation into message delivery"
```

---

## Phase 3: 最終検証

### Task 12: 全テスト実行とコミット

**TDD scenario:** 既存コードへの影響確認。全テストが通ることを確認。

**Step 1: 全テストを実行**

```bash
bun test
```

Expected: PASS — 全テスト合格

**Step 2: TypeScript コンパイルチェック**

```bash
bun build --compile index.ts --target bun
```

Expected: コンパイル成功、エラーなし

**Step 3: 最終コミット**

```bash
git add -A
git status
git commit -m "feat: complete Chaos Pattern moderation integration"
```

---

## 実装ファイル一覧

| ファイル | 状態 | 役割 |
|---------|------|------|
| `chaos-moderator/levenshtein.ts` | **新規** | Levenshtein距離計算 |
| `chaos-moderator/cooldown.ts` | **新規** | 投稿間隔制御 |
| `chaos-moderator/duplicate.ts` | **新規** | 重複メッセージ検知 |
| `chaos-moderator/loop.ts` | **新規** | 会話ループ検知 |
| `chaos-moderator/depth.ts` | **新規** | 返信深度追跡 |
| `chaos-moderator/self-reply.ts` | **新規** | 自己返信フィルタ |
| `chaos-moderator/moderation.ts` | **新規** | 全ルール統合サービス |
| `tests/levenshtein.test.ts` | **新規** | Levenshteinテスト |
| `tests/cooldown.test.ts` | **新規** | Cooldownテスト |
| `tests/duplicate.test.ts` | **新規** | 重複検知テスト |
| `tests/loop.test.ts` | **新規** | ループ検知テスト |
| `tests/depth.test.ts` | **新規** | 深度追跡テスト |
| `tests/self-reply.test.ts` | **新規** | 自己返信テスト |
| `tests/moderation.test.ts` | **新規** | 統合テスト |
| `types.ts` | **修正** | `moderated` 型 + `chaosMode` 設定 |
| `config.ts` | **修正** | `chaosMode` デフォルト値 |
| `feed.ts` | **修正** | `moderated` フォーマット |
| `index.ts` | **修正** | moderation 統合 |

---

## 注意点

1. **ディレクトリ構造**: `chaos-moderator/` を `src/` 直下に作成
2. **依存関係**: 外部ライブラリなし。純粋な TypeScript で実装
3. **後方互換性**: `chaosMode: "off"` で既存動作を維持
4. **パフォーマンス**: Levenshtein距離はO(mn)。メッセージ長が短い（通常<200文字）ため実用上問題なし
5. **テスト**: 既存テストを壊さないよう、`bun test` で全テスト実行を確認
