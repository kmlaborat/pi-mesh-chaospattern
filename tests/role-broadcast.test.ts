import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { register, resolveDirs } from "../registry.js";
import { broadcastMessage } from "../messaging.js";
import type { MeshState } from "../types.js";

function makeState(agentType: string = "agent"): MeshState {
  return {
    agentName: "",
    agentType,
    registered: false,
    watcher: null,
    watcherRetries: 0,
    watcherRetryTimer: null,
    watcherDebounceTimer: null,
    reservations: [],
    chatHistory: new Map(),
    unreadCounts: new Map(),
    broadcastHistory: [],
    model: "",
    gitBranch: undefined,
    isHuman: false,
    session: { toolCalls: 0, tokens: 0, filesModified: [] },
    activity: { lastActivityAt: new Date().toISOString() },
    statusMessage: undefined,
    customStatus: false,
    registryFlushTimer: null,
    sessionStartedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    hookState: {},
  };
}

function makeCtx(sessionId: string = "session-1") {
  return {
    model: { id: "test-model" },
    sessionManager: {
      getSessionId: () => sessionId,
    },
  } as any;
}

describe("role broadcast", () => {
  let tmpDir: string;
  let prevMeshDir: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-mesh-broadcast-"));
    prevMeshDir = process.env.PI_MESH_DIR;
    process.env.PI_MESH_DIR = path.join(tmpDir, ".pi", "mesh");
  });

  afterEach(() => {
    if (prevMeshDir === undefined) delete process.env.PI_MESH_DIR;
    else process.env.PI_MESH_DIR = prevMeshDir;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("broadcasts role change to other agents", () => {
    const dirs = resolveDirs(tmpDir);
    const state1 = makeState();
    const state2 = makeState();

    // Register two agents
    register(state1, dirs, makeCtx("session-1"));
    register(state2, dirs, makeCtx("session-2"));

    expect(state1.agentName).toBe("agent-1");
    expect(state2.agentName).toBe("agent-2");

    // Broadcast role change from agent-1
    const messages = broadcastMessage(
      state1,
      dirs,
      `Role change: ${state1.agentName} is now builder`,
      false
    );

    // Should send to agent-2 (not to self)
    expect(messages.length).toBe(1);
    expect(messages[0].to).toBe("agent-2");
    expect(messages[0].text).toContain("builder");
  });

  it("role is visible in agent registration", () => {
    const dirs = resolveDirs(tmpDir);
    const state = makeState();
    state.role = 'builder';

    register(state, dirs, makeCtx());

    const regPath = path.join(dirs.registry, "agent-1.json");
    const reg = JSON.parse(fs.readFileSync(regPath, "utf-8"));

    expect(reg.role).toBe('builder');
  });

  it("multiple agents can have different roles", () => {
    const dirs = resolveDirs(tmpDir);
    const state1 = makeState();
    const state2 = makeState();

    state1.role = 'builder';
    state2.role = 'validator';

    register(state1, dirs, makeCtx("session-1"));
    register(state2, dirs, makeCtx("session-2"));

    const reg1 = JSON.parse(fs.readFileSync(path.join(dirs.registry, "agent-1.json"), "utf-8"));
    const reg2 = JSON.parse(fs.readFileSync(path.join(dirs.registry, "agent-2.json"), "utf-8"));

    expect(reg1.role).toBe('builder');
    expect(reg2.role).toBe('validator');
  });
});
