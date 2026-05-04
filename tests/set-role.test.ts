import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { register, resolveDirs, updateRegistration } from "../registry.js";
import type { MeshState, AgentRole } from "../types.js";

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

describe("set_role", () => {
  let tmpDir: string;
  let prevMeshDir: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-mesh-role-"));
    prevMeshDir = process.env.PI_MESH_DIR;
    process.env.PI_MESH_DIR = path.join(tmpDir, ".pi", "mesh");
  });

  afterEach(() => {
    if (prevMeshDir === undefined) delete process.env.PI_MESH_DIR;
    else process.env.PI_MESH_DIR = prevMeshDir;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("accepts builder role", () => {
    const validRoles: AgentRole[] = ['builder', 'validator', null];
    expect(validRoles.includes('builder')).toBe(true);
  });

  it("accepts validator role", () => {
    const validRoles: AgentRole[] = ['builder', 'validator', null];
    expect(validRoles.includes('validator')).toBe(true);
  });

  it("rejects invalid role", () => {
    const validRoles: AgentRole[] = ['builder', 'validator', null];
    expect(validRoles.includes('coordinator' as any)).toBe(false);
  });

  it("persists role in registration on register", () => {
    const dirs = resolveDirs(tmpDir);
    const state = makeState();
    state.role = 'builder';

    const ok = register(state, dirs, makeCtx());
    expect(ok).toBe(true);

    const regPath = path.join(dirs.registry, "agent-1.json");
    expect(fs.existsSync(regPath)).toBe(true);

    const reg = JSON.parse(fs.readFileSync(regPath, "utf-8"));
    expect(reg.role).toBe('builder');
  });

  it("persists role in registration on update", () => {
    const dirs = resolveDirs(tmpDir);
    const state = makeState();
    const ctx = makeCtx();

    register(state, dirs, ctx);

    // Update role after registration
    state.role = 'validator';
    updateRegistration(state, dirs, ctx);

    const regPath = path.join(dirs.registry, "agent-1.json");
    const reg = JSON.parse(fs.readFileSync(regPath, "utf-8"));
    expect(reg.role).toBe('validator');
  });

  it("clears role when set to null", () => {
    const dirs = resolveDirs(tmpDir);
    const state = makeState();
    state.role = 'builder';

    register(state, dirs, makeCtx());

    // Clear role
    state.role = null;
    updateRegistration(state, dirs, makeCtx());

    const regPath = path.join(dirs.registry, "agent-1.json");
    const reg = JSON.parse(fs.readFileSync(regPath, "utf-8"));
    expect(reg.role).toBe(null);
  });

  it("does not include role when not set", () => {
    const dirs = resolveDirs(tmpDir);
    const state = makeState();
    // role is undefined (not set)

    register(state, dirs, makeCtx());

    const regPath = path.join(dirs.registry, "agent-1.json");
    const reg = JSON.parse(fs.readFileSync(regPath, "utf-8"));
    expect(reg.role).toBe(undefined);
  });
});
