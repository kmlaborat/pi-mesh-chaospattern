# pi-mesh-chaospattern

> **Fork of [pi-mesh](https://github.com/rhnvrm/pi-mesh) with Chaos Pattern moderation**

Coordinate multiple [Pi](https://github.com/badlogic/pi-mono) agents working in the same project. See who's around, claim files so you don't step on each other, and send messages between sessions.

**New feature:** **Chaos Pattern** - Autonomous agent-to-agent communication with built-in moderation to prevent runaway conversations.

**Philosophy:** **Fluid Roles + Builder-Validator Chain** - No fixed Coordinator. Agents self-organize as Builder or Validator, collaborating through a two-phase process: Plan Approval (before implementation) and Code Review (after implementation).

No daemon, no server. Just files on disk.

## Install

### From GitHub (Recommended for this fork)

```bash
pi install github:kmlaborat/pi-mesh-chaospattern
```

You can also install a specific branch or tag:

```bash
# Specific branch
pi install github:kmlaborat/pi-mesh-chaospattern#main

# Specific tag
pi install github:kmlaborat/pi-mesh-chaospattern#v1.0.0
```

### From npm (Original pi-mesh)

```bash
pi install npm:pi-mesh
```

## Setup

Add `.pi/pi-mesh.json` to your project:

```json
{
  "autoRegister": true,
  "chaosMode": "strict"
}
```

That's it. Start two Pi sessions in the same project and they'll find each other.

## What you get

**Six tools** for agents to coordinate:

| Tool | What it does |
|------|-------------|
| `mesh_peers` | List who's active, what they're working on, what model they're running |
| `mesh_reserve` | Claim files before editing. Other agents get blocked and told who to talk to |
| `mesh_release` | Let go of files when you're done |
| `mesh_send` | Message another agent. Normal messages wait politely; urgent ones interrupt |
| `mesh_manage` | Rename yourself, set status, check agent details, view the activity feed |
| `chaos-moderator` | **NEW:** Automatically moderate agent-to-agent messages |

**An overlay** you open with `/mesh` - three tabs showing agents, activity feed, and a chat with `@mention` tab-completion.

**Automatic tracking** of edits, commits, and test runs. Status is derived from activity ("just shipped", "debugging...", "on fire").

### Chaos Pattern: Autonomous Agent Communication
The **Chaos Pattern** enables agents to respond to each other's messages automatically, creating emergent collaborative conversations. To prevent runaway loops and protect infrastructure, it includes built-in moderation:

**Conversation Moderation** (prevents runaway conversations):
- **Self-Reply Filter**: Agents never reply to themselves
- **Cooldown**: 2-second minimum between agent posts
- **Duplicate Detection**: Blocks messages >80% similar to recent ones
- **Loop Suppression**: Detects repeated conversation patterns (A→B→A→B)
- **Depth Limit**: Max 2-level agent chains (human → agent1 → agent2 ✗)

**Infrastructure Protection** (prevents system crashes):
- **Action Loop Detection**: Blocks repeated identical commands (e.g., `ping google.com` 3x)
  - Protects against infinite command loops that exhaust CPU/network resources
  - Prevents rate limit violations from repeated API calls
  - Configurable threshold (default: 3 repetitions)
  - Cooldown period after detection (default: 10 seconds)

Configure via `chaosMode`:
- `"strict"` (default): **All rules enabled** - Conversation moderation + Action Loop Detection. **Recommended for production**.
- `"off"`: **Conversation moderation disabled** (free chat) but **Action Loop Detection still active**. Action Loop Detection is a **system-level safety mechanism** that cannot be disabled—it protects against infinite command loops that could crash machines or overwhelm networks.

Advanced configuration (`.pi/pi-mesh.json`):
```json
{
  "chaosMode": "strict",
  "actionLoopThreshold": 3,
  "actionLoopWindow": 5,
  "actionLoopCooldownSeconds": 10
}
```

**Note**: `actionLoop*` settings are **always enforced**, even when `chaosMode: "off"`. They are safety requirements, not optional features.
## Quick example

```typescript
// Who's here?
mesh_peers({})

// I'm going to work on auth
mesh_reserve({ paths: ["src/auth/"], reason: "Refactoring auth" })

// Let the other agent know
mesh_send({ to: "zero-2", message: "Auth refactor done, interfaces changed" })

// Something urgent
mesh_send({ to: "zero-2", message: "Stop! Don't touch config.ts", urgent: true })

// Done, release files
mesh_release({})

// Enable Chaos Pattern for autonomous agent conversations
// Add to .pi/pi-mesh.json: { "chaosMode": "strict" }
```

## How it works

Everything lives in `.pi/mesh/`:

```
.pi/mesh/
├── registry/          # One JSON file per agent
├── inbox/{name}/      # Messages as JSON files, watched with fs.watch
└── feed.jsonl         # Append-only activity log
```

Agents register when they start, unregister when they stop. If an agent crashes, stale entries get cleaned up on the next `mesh_peers` call via PID checking.

Messages use Pi's delivery system - normal messages queue until the recipient finishes their current turn, urgent ones interrupt immediately. No polling needed.

Reservations are enforced by hooking Pi's `edit` and `write` tools. When an agent tries to edit a reserved file, the tool call gets blocked and the agent sees who reserved it and why.

**Chaos Pattern moderation** intercepts messages before delivery, applying rules in order: self-reply → cooldown → duplicate → loop → depth. Blocked messages are logged to the activity feed.

Non-interactive sessions (`--print` mode, daemon tasks) skip registration entirely so they don't spam interactive agents.

## Overlay

Open with `/mesh`. Tab switches between panels, arrow keys scroll, Esc closes.

| Tab | Shows |
|-----|-------|
| Agents | Live status of all peers - model, branch, current activity, reservations |
| Feed | Scrollable timeline of joins, edits, commits, messages, **moderation events** |
| Chat | Type `@name message` to DM, or just type to broadcast. Tab-complete names |

## Configuration

Full config with defaults:

```json
{
  "autoRegister": false,
  "autoRegisterPaths": [],
  "contextMode": "full",
  "feedRetention": 50,
  "stuckThreshold": 900,
  "autoStatus": true,
  "chaosMode": "strict"
}
```

| Setting | What it does | Default |
|---------|-------------|---------|
| autoRegister | Join mesh when Pi starts | false |
| autoRegisterPaths | Only auto-join in these folders (trailing `*` wildcards) | [] |
| contextMode | How much context to inject: "full", "minimal", "none" | "full" |
| feedRetention | Max events kept in the activity feed | 50 |
| stuckThreshold | Seconds idle before an agent is marked stuck | 900 |
| autoStatus | Generate status from activity automatically | true |
| **chaosMode** | **Enable Chaos Pattern moderation: "strict", "relaxed", "off"** | **"strict"** |

Config is loaded from: project `.pi/pi-mesh.json` > user `~/.pi/agent/pi-mesh.json` > `~/.pi/agent/settings.json` "mesh" key > defaults.

The library defaults to `autoRegister: false`. Set it to `true` in your project config if you want all agents to coordinate.

## Agent naming

Names follow the pattern `{type}-{N}` where type comes from `PI_AGENT` env var (defaults to "agent") and N increments. So you get `zero-1`, `zero-2`, `lite-1`, etc.

Override with `PI_AGENT_NAME` env var, or rename at runtime:

```typescript
mesh_manage({ action: "rename", name: "auth-worker" })
```

## Lifecycle Hooks

pi-mesh supports lifecycle hooks for reacting to mesh events without forking the package. Specify a module path in your config:

```json
{
  "autoRegister": true,
  "hooksModule": "./mesh-hooks.ts"
}
```

The module should export a `createHooks` function:

```typescript
import type { MeshConfig, MeshLifecycleHooks } from "pi-mesh/types";

export function createHooks(config: MeshConfig): MeshLifecycleHooks {
  return {
    onRegistered(state, ctx, actions) {
      // Called after successful mesh registration.
      // Use actions.rename("new-name") to trigger a mesh rename.
    },
    onRenamed(state, ctx, result) {
      // Called after a successful rename (from mesh_manage or actions.rename).
    },
    onPollTick(state, ctx, actions) {
      // Called on an interval while registered (default 2s).
      // Can call actions.rename() to sync external name changes into mesh.
    },
    onShutdown(state) {
      // Called during session shutdown, before unregister.
    },
  };
}
```

All hooks are optional. The poll interval defaults to 2 seconds and can be customized by setting `state.hookState.pollIntervalMs` in `onRegistered` (read once when the timer starts; not dynamic at runtime).

Hooks receive `MeshState` which includes an optional `hookState: Record<string, unknown>` bag for storing custom state across calls.

`onRegistered` and `onPollTick` receive a `HookActions` object with:
- `actions.rename(newName)` — rename this agent in the mesh registry. Handles watcher cycling internally and fires `onRenamed` on success. Returns `RenameResult` so hooks can handle failures (e.g., revert a tmux window on collision).

## Limitations

- **`bash` bypasses reservations.** Only `edit` and `write` are hooked. A `sed -i` through bash won't be caught.
- **Concurrent feed writes** can produce partial JSON lines. Malformed lines are skipped on read.
- **PID checking** doesn't work across container boundaries.
- **Crashed agents** leave stale registrations until the next `mesh_peers` cleans them up.

## Documentation

Full docs at [rhnvrm.github.io/pi-mesh](https://rhnvrm.github.io/pi-mesh/).

## Skills

This project includes a project-local skill for enhanced agent coordination:

### mesh-coordination Skill

Defines rules, **fluid roles**, and **Builder-Validator Chain** workflows for multi-agent coordination:

#### Fluid Roles
- **No fixed roles** - Agents dynamically assume Builder or Validator based on context
- **When implementing** → Act as Builder (reserve files, write tests, report completion)
- **When reviewing** → Act as Validator (read code, provide feedback, approve/reject)
- **Role switching** → Announce via `mesh_send` before acting
- **Self-organization** → No Coordinator needed; agents resolve conflicts directly

#### Builder-Validator Chain (Two-Phase Collaboration)

**Phase 1: Plan Approval (Before Implementation)**
1. Builder announces plan via `mesh_send`
2. Builder requests Validator: "@agent-name Can you review this plan?"
3. **Wait for explicit approval** before reserving files or implementing
4. ONLY AFTER approval: Reserve → Implement

**Phase 2: Code Review (After Implementation)**
1. Builder reports completion with git SHA: "Implementation complete. Ready for review. @agent-name"
2. Validator reviews code using `read` tool
3. Validator provides structured feedback
4. **If feedback indicates flaws**: Builder modifies and re-submits (autonomous loop)
5. ONLY AFTER Validator approval: Merge allowed

**Key Principles**:
- **Role Separation**: Builder and Validator have **different system prompts**. Validator is "critical and strict" to provide genuine oversight.
- **Context Sharing**: The "Approved Plan" from Phase 1 is passed to Builder as a **constraint** during implementation.
- **Autonomous Loop**: Builder loops until Validator explicitly says "LGTM" or "Approved". No human intervention needed.

#### Core Rules
- **Plan Approval mandatory** before implementation
- **File reservation mandatory** before any `edit`/`write`
- **Immediate release** after completion
- **Code Review mandatory** before merge
- @mentions, progress updates, peer monitoring

#### Workflow
**Phase 1**: Announce Plan → Request Validator → Get Approval → Check Reservations → Reserve Files

**Phase 2**: Implement → Release Reservations → Report Completion

**Phase 3**: Peer Review → Fixes (if needed) → Approval → Merge

#### Edge Case Handling
- Reservation conflict resolution (5-step flow)
- Release failure handling (4-step procedure)
- Interruption/abortion procedure (4-step)

See `skills/mesh-coordination/SKILL.md` for details.

### Why Chaos Pattern?

Traditional multi-agent systems use **centralized coordination** (Coordinator role, task queues, leader election). This approach works but creates bottlenecks and single points of failure.

**Chaos Pattern** takes a different approach:

1. **Self-Organization**: Agents negotiate directly without a Coordinator
2. **Fluid Roles**: Builder/Validator roles are temporary states, not fixed identities
3. **Emergent Order**: Structure emerges from simple rules (reserve before edit, review before merge)
4. **Resilience**: No central point of failure; if one agent stalls, others adapt
5. **Scalability**: Adding more agents doesn't increase coordination complexity

**Trade-off**: More initial coordination overhead (agents must communicate directly), but **higher resilience** and **better adaptability** to dynamic conditions.

This is especially valuable when:
- Multiple agents work simultaneously on different parts of the codebase
- Agents need to adapt to changing priorities mid-task
- You want to avoid "Coordinator bottleneck" in large teams
- Emergent behavior is more valuable than rigid structure

## Credits

**Original pi-mesh:** Created by [Rohan Verma](https://github.com/rhnvrm). Inspired by [pi-messenger](https://github.com/nicobailon/pi-messenger) by Nico Bailon.

**Chaos Pattern moderation:** Based on the [agents-chatter](https://github.com/RAG4J/agents-chatter) project by Jettro Coenradie. Adapted and extended for the pi-mesh ecosystem with infrastructure protection (Action Loop Detection) and fluid role coordination.

**Multi-agent coordination skills:** Designed for agent-to-agent conversation facilitation.

pi-mesh focuses on coordination only - presence, messaging, reservations - without the crew/task layer.

## License

MIT
