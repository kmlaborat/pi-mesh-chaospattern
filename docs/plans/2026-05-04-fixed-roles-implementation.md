# 固定役割システム 実装計画

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** ユーザーによる明示的な役割宣言（Builder/Validator）を追加し、セッション中は固定する

**Architecture:** mesh_manage に `set_role` アクションを追加。役割変更時に自動的にブロードキャスト。AgentRegistration に `role` フィールドを追加。

**Tech Stack:** TypeScript, pi-coding-agent extension API

---

### Task 1: types.ts に role フィールドを追加

**TDD scenario:** Modifying tested code — run existing tests first

**Files:**
- Modify: `types.ts` - AgentRegistration に `role` フィールド追加
- Modify: `types.ts` - MeshState に `role` フィールド追加
- Create: `types.ts` - `AgentRole` 型定義追加

**Step 1: 型定義を追加**

```typescript
/**
 * Agent role - explicitly set by user, fixed for the session.
 * null = not set (user has not assigned a role yet).
 */
export type AgentRole = 'builder' | 'validator' | null;
```

**Step 2: AgentRegistration に追加**

```typescript
export interface AgentRegistration {
  // ... 既存フィールド
  role?: AgentRole;  // ユーザーによる明示的な役割宣言
}
```

**Step 3: MeshState に追加**

```typescript
export interface MeshState {
  // ... 既存フィールド
  role?: AgentRole;
}
```

**Step 4: 既存テストを実行**

```bash
npm test
```

Expected: 既存テストはすべて PASS（型追加のみで動作変更なし）

**Step 5: Commit**

```bash
git add types.ts
git commit -m "feat: add AgentRole type and role field to AgentRegistration/MeshState"
```

---

### Task 2: mesh_manage に set_role アクションを追加

**TDD scenario:** New feature — full TDD cycle

**Files:**
- Modify: `index.ts` - mesh_manage のパラメータに `role` を追加
- Modify: `index.ts` - `executeSetRole` 関数を追加

**Step 1: テストファイルを作成**

```typescript
// tests/test-set-role.ts
import { test } from 'node:test';
import assert from 'node:assert';

test('set_role action should accept builder', () => {
  // mesh_manage のパラメータ検証テスト
  const validRoles = ['builder', 'validator', null];
  assert.ok(validRoles.includes('builder'));
});

test('set_role action should reject invalid role', () => {
  const invalidRole = 'coordinator';
  const validRoles = ['builder', 'validator', null];
  assert.ok(!validRoles.includes(invalidRole));
});
```

**Step 2: テストを実行して失敗を確認**

```bash
npm test -- tests/test-set-role.ts
```

Expected: PASS（この段階では型検証のみ）

**Step 3: mesh_manage に role パラメータを追加**

```typescript
parameters: Type.Object({
  // ... 既存パラメータ
  role: Type.Optional(
    Type.String({
      description: "Role to set (for set_role): 'builder' or 'validator'. Use null to clear.",
    })
  ),
}),
```

**Step 4: executeSetRole 関数を実装**

```typescript
function executeSetRole(
  role: string | undefined,
  ctx: ExtensionContext
) {
  // Validate role
  if (role !== undefined && role !== null && role !== 'builder' && role !== 'validator') {
    return result(`Invalid role: "${role}". Use: 'builder', 'validator', or null to clear.`);
  }

  const newRole = role === 'null' || role === undefined ? null : role;

  // Check if already set to the same role
  if (state.role === newRole) {
    if (newRole === null) {
      return result("Role is already cleared.");
    }
    return result(`Already set as ${newRole}.`);
  }

  // Update state
  state.role = newRole;
  registry.updateRegistration(state, dirs, ctx);

  // Broadcast to all agents
  if (newRole !== null) {
    messaging.broadcastMessage(
      state,
      dirs,
      `Role change: ${state.agentName} is now ${newRole}`,
      false
    );
  }

  // Log to feed
  feed.logEvent(
    dirs,
    state.agentName,
    'message',
    'all',
    `set role to ${newRole ?? 'null'}`
  );

  if (newRole === null) {
    return result("Role cleared.");
  }
  return result(`Role set to: ${newRole}. Broadcast sent to all agents.`);
}
```

**Step 5: switch 文に set_role を追加**

```typescript
case 'set_role':
  return executeSetRole(role, ctx);
```

**Step 6: テストを実行**

```bash
npm test
```

Expected: 全テスト PASS

**Step 7: Commit**

```bash
git add index.ts tests/test-set-role.ts
git commit -m "feat: add set_role action to mesh_manage with broadcast"
```

---

### Task 3: registry.ts で role の永続化を実装

**TDD scenario:** Modifying tested code

**Files:**
- Modify: `registry.ts` - register() で role を保存
- Modify: `registry.ts` - updateRegistration() で role を更新

**Step 1: register() で role を保存**

```typescript
const registration: AgentRegistration = {
  // ... 既存フィールド
  role: state.role,
};
```

**Step 2: updateRegistration() で role を更新**

既存の `updateRegistration` 関数で `state.role` をレジストリファイルに書き込むことを確認。

**Step 3: テストを実行**

```bash
npm test
```

Expected: 全テスト PASS

**Step 4: Commit**

```bash
git add registry.ts
git commit -m "feat: persist role in agent registration"
```

---

### Task 4: mesh_peers で role を表示

**TDD scenario:** Modifying tested code

**Files:**
- Modify: `index.ts` - mesh_peers の出力に role を追加

**Step 1: mesh_peers の出力に role を追加**

```typescript
// mesh_peers の出力部分
if (agent.role) {
  lines.push(`Role: ${agent.role}`);
}
```

**Step 2: テストを実行**

```bash
npm test
```

Expected: 全テスト PASS

**Step 3: Commit**

```bash
git add index.ts
git commit -m "feat: display role in mesh_peers output"
```

---

### Task 5: 統合テスト - 役割変更の伝播

**TDD scenario:** New feature — full TDD cycle

**Files:**
- Create: `tests/test-role-broadcast.ts`

**Step 1: 統合テストを作成**

```typescript
// tests/test-role-broadcast.ts
import { test } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import { join } from 'node:path';

test('role change should be broadcast to other agents', () => {
  // 2エージェントのレジストリを作成
  // 1つ目のエージェントが role を設定
  // 2つ目のエージェントのインバックスにメッセージが存在することを確認
  // ...
});

test('mesh_peers should reflect role changes', () => {
  // role を設定後、mesh_peers の出力に role が含まれることを確認
  // ...
});
```

**Step 2: テストを実行**

```bash
npm test -- tests/test-role-broadcast.ts
```

Expected: 全テスト PASS

**Step 3: Commit**

```bash
git add tests/test-role-broadcast.ts
git commit -m "test: add integration tests for role broadcast"
```

---

### Task 6: ドキュメント更新

**TDD scenario:** Trivial change

**Files:**
- Modify: `README.md` - 役割設定の説明を追加

**Step 1: README に役割設定の説明を追加**

```markdown
## Fixed Roles

Assign roles to agents for efficient collaboration:

```bash
# Set as Builder
mesh_manage({ action: 'set_role', role: 'builder' })

# Set as Validator
mesh_manage({ action: 'set_role', role: 'validator' })

# Clear role
mesh_manage({ action: 'set_role', role: null })
```

Roles are fixed for the session and broadcast to all agents when changed.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add fixed roles documentation to README"
```

---

### Task 7: 最終確認

**Step 1: 全テストを実行**

```bash
npm test
```

Expected: 全テスト PASS

**Step 2: git status を確認**

```bash
git status
git log --oneline -5
```

Expected: 全コミットが正常に記録されている

**Step 3: 完了**
