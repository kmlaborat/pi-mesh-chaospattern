# 固定役割システム 設計書

> **日付:** 2026-05-04
> **ステータス:** 承認済み
> **トリガー:** 流動的ロールが現実的にうまく機能しない（モデルの特性を活かせない）

---

## 1. 背景

現在の「流動的ロール」設計では、エージェントが一度役割を始めると解放されず、システムが硬直する問題が発生しました。

さらに現実的には、モデルによって得意な役割が異なります：
- **Builder 向き**：コード生成に強いモデル
- **Validator 向き**：分析・レビューに強いモデル

役割を固定することで、各モデルの特性を活かし、効率的な協業を実現します。

---

## 2. アーキテクチャ

### AgentState の変更

```typescript
interface AgentState {
  name: string;
  role: 'builder' | 'validator' | null;  // ユーザーによる明示的な宣言（固定）
  reservations: string[];
  activity: 'implementing' | 'reviewing' | 'idle';
  lastActive: number;
  model: string;
  branch: string;
}
```

**変更点：**
- `role` は「一時的な状態」ではなく、「ユーザーが設定した固定役割」
- `null` = 未設定（ユーザーがまだ指示していない状態）
- 役割変更は `mesh_manage(action: 'set_role', role: 'builder')` で実行
- 設定時に自動的に全エージェントにブロードキャスト

---

## 3. データフロー

### 役割設定のフロー

```
ユーザー: 「あなたは Builder をやって」
   ↓
エージェント: mesh_manage(action: 'set_role', role: 'builder')
   ↓
システム: 
  1. .pi/mesh/agents/<agent-name>.json の role を更新
  2. mesh_feed にイベント記録: "agent-1 set role to builder"
  3. mesh_send でブロードキャスト: { type: 'role_change', agent: 'agent-1', role: 'builder' }
   ↓
他のエージェント: 
  - インバックスにメッセージ受信
  - mesh_peers で最新状態を確認可能
```

### エラーケース

1. **無効な役割名** - `'builder'` または `'validator'` 以外 → エラー
2. **重複設定** - 既に同じ役割 → 「既に Builder です」と警告
3. **書き込み失敗** - ディスクエラーなど → エラー（ロールは変更されない）

### ロール解除

- `mesh_manage(action: 'set_role', role: null)` で解除可能
- これもブロードキャストされる

---

## 4. テスト戦略

### 単体テスト
1. 役割設定の正常系 - `set_role('builder')` → OK、ファイル更新確認
2. 無効な役割名 - `set_role('coordinator')` → エラー
3. 重複設定 - 同じ役割を2回 → 警告メッセージ
4. 役割解除 - `set_role(null)` → `role: null` に戻る
5. ブロードキャスト - 設定時に他のエージェントのインバックスにメッセージ到達

### 統合テスト
1. 2エージェント間で役割変更の伝播を確認
2. `mesh_peers` で最新役割が反映されていることを確認
3. 役割変更中のファイル競合（レジストリ書き込みの同時アクセス）

### テストファイル
- `tests/test-set-role.ts` - 単体テスト
- `tests/test-role-broadcast.ts` - 統合テスト

---

## 5. 影響範囲

### 変更が必要なファイル
- `types.ts` - AgentState のドキュメント更新
- `registry.ts` - 役割設定・ブロードキャストの実装
- `mesh_manage` コマンドの実装（既存の拡張）
- `tests/` - 新しいテストファイル追加

### 後方互換性
- `role: null` を許容するため、既存コードとの互換性は維持
- 流動的ロールの自動切り替えロジックは削除（または無効化）

---

## 6. 次のステップ

1. 実装計画の作成（`/skill:writing-plans`）
2. グит ワークトリの作成（`/skill:using-git-worktrees`）
3. TDD による実装
