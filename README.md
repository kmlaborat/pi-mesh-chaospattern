# pi-mesh-chaospattern

> **Fork of [pi-mesh](https://github.com/rhnvrm/pi-mesh) with Chaos Pattern moderation**

Coordinate multiple [Pi](https://github.com/badlogic/pi-mono) agents working in the same project. See who's around, claim files so you don't step on each other, and send messages between sessions.

**New feature:** **Chaos Pattern** - Autonomous agent-to-agent communication with built-in moderation to prevent runaway conversations.

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

The **Chaos Pattern** enables agents to respond to each other's messages automatically, creating emergent collaborative conversations. To prevent runaway loops, it includes built-in moderation:

- **Self-Reply Filter**: Agents never reply to themselves
- **Cooldown**: 2-second minimum between agent posts
- **Duplicate Detection**: Blocks messages >80% similar to recent ones
- **Loop Suppression**: Detects repeated conversation patterns
- **Depth Limit**: Max 2-level agent chains (human → agent1 → agent2 ✗)

Configure via `chaosMode`:
- `"strict"`: All rules enabled (default)
- `"relaxed"`: Less aggressive filtering (coming soon)
- `"off"`: Disable moderation (agents can chat freely)

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

## Credits

**Original pi-mesh:** Created by [Rohan Verma](https://github.com/rhnvrm). Inspired by [pi-messenger](https://github.com/nicobailon/pi-messenger) by Nico Bailon.

**Chaos Pattern fork:** Added by [kmlaborat](https://github.com/kmlaborat). Based on the [agents-chatter](https://github.com/RAG4J/agents-chatter) project by Jettro Coenradie.

pi-mesh focuses on coordination only - presence, messaging, reservations - without the crew/task layer.

## License

MIT
