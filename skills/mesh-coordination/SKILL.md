---
name: mesh-coordination
description: Defines rules, roles, and workflows for multi-agent coordination. Enforces mesh_send usage, role separation, and mention conventions.
license: MIT
compatibility: pi-coding-agent>=1.0.0
metadata:
  version: 1.0.0
  author: kmlaborat
  tags: [mesh, coordination, multi-agent]
---

# Mesh Coordination Skill

## Cognitive States (Self-Declaration)

Agents should **explicitly declare their cognitive state** to help peers understand their intent and context. This enables "reading the room" and appropriate coordination without central control.

**Available States**:
- `discussing` - Actively proposing or debating ideas
- `agreed` - Have agreed to a proposal/plan  
- `objecting` - Raising objections or concerns
- `waiting_consensus` - Waiting for others to reach consensus
- `finalizing` - Documenting or finalizing decisions
- `implementing` - Actively implementing code
- `reviewing` - Reviewing code or decisions
- `idle` - No current focus
- `blocked` - Blocked waiting on something

**How to Set**:
```bash
# Set state
mesh_manage({ action: "set_cognitive_state", cognitiveState: "implementing" })

# Clear state (return to auto-detection)
mesh_manage({ action: "set_cognitive_state" })
```

**Why Declare State?**
- **Self-interest**: Peers will send you appropriate messages (not interrupting when implementing)
- **Coordination**: Others can see who's reviewing, who's waiting, who's available
- **Context**: The collective states of all agents naturally show what "phase" the team is in

**Example Workflow**:
1. Start discussion: `set_cognitive_state("discussing")` → Broadcast proposal
2. After agreeing: `set_cognitive_state("agreed")` → Others see consensus forming
3. Start implementation: `set_cognitive_state("implementing")` → Reserve files, begin work
4. Ready for review (as Builder): `set_cognitive_state("waiting_consensus")` → Broadcast completion
5. Reviewing (as Validator): `set_cognitive_state("reviewing")` → Read and provide feedback
6. Done: `set_cognitive_state("idle")` → Release reservations

**Key Principle**: State declaration is **self-serving** - it helps YOU get the right messages at the right time, not just "being polite."

---

## Fluid Roles (Chaos Pattern Mode)

**No fixed roles.** Agents dynamically assume **Builder** or **Validator** roles based on context:

1. **When implementing** → Act as **Builder**:
   - Announce plan and request Validator approval (Phase 1)
   - Reserve files before editing
   - Write tests
   - Report completion with SHA (Phase 2)

2. **When reviewing** → Act as **Validator**:
   - Respond to Builder's plan request (Phase 1)
   - Read code with `read` tool (Phase 2)
   - Provide structured feedback
   - Approve or request fixes

3. **When switching roles**:
   - Announce role change via `mesh_send`:
     ```
     @agent-name Switching to Builder role for [feature].
     @agent-name Switching to Validator role for [review].
     ```

4. **Simultaneous roles**:
   - If working on multiple tasks, split context:
     - Task A: Builder (implementing)
     - Task B: Validator (reviewing)
   - Use clear messaging to avoid confusion

**Key principle**: Roles are **temporary states**, not fixed identities. This enables self-organizing resilience without central coordination.

**Critical**: Builder and Validator must **explicitly coordinate** for both Phase 1 (Plan Approval) and Phase 2 (Code Review). No assumptions, no silent reviews.

---

## Broadcasting vs. Mentions (Context Formation)

**Mentions** (`@agent-name`): Direct requests to specific agents (purpose-driven, individual)
- "@builder-1 Please review this code"
- "@validator-2 I need help with X"

**Broadcasts** (no `to` parameter): Declare your state/intent to the whole room (context-forming, collective)
- "📢 Starting implementation of feature X - I'll be in 'implementing' state"
- "📢 Ready for review - switching to 'reviewing' state"
- "📢 Consensus request: Should we use approach A or B?"

**Why Broadcast Matters**:
- Creates **shared context** - everyone knows what's happening
- Enables **passive coordination** - agents can act appropriately without being told
- Reduces **unnecessary interrupts** - peers know when you're busy
- Builds **situational awareness** - you see the team's collective state

**When to Use Each**:
- Use **broadcasts** for: state changes, consensus requests, progress updates, context setting
- Use **mentions** for: specific requests, direct questions, targeted follow-ups

**Example**:
```bash
# Broadcast - declare intent to all
mesh_send({ broadcast: true, message: "📢 Starting implementation - state: implementing" })

# Later - specific request to reviewer
mesh_send({ to: "validator-1", message: "@validator-1 Ready for review when you're free" })
```

---

## Must-Follow Rules
1. **Consensus Pattern (Universal Agreement Process)**:
   
   **Applicable Scenarios**:
   - Finalizing discussion conclusions
   - Deciding coding standards and conventions
   - Architecture and design decisions
   - Refactoring plan approval
   - Implementation approach agreements
   - Any decision requiring multi-agent collaboration
   
   **Process**:
   
   **Cognitive State Transitions**:
   
   Use `mesh_manage({ action: "set_cognitive_state", cognitiveState: "<state>" })` to declare your state.
   
   | Phase | Proposer State | Respondent State |
   |-------|---------------|------------------|
   | Proposal | `discussing` | `waiting_consensus` |
   | Agreement | `agreed` | `agreed` |
   | Declaration | `implementing` or `idle` | - |
   
   **Step 1: Proposal Broadcast**:
   - Proposer MUST:
     1. Set cognitive state: `mesh_manage({ action: "set_cognitive_state", cognitiveState: "discussing" })`
     2. Use `mesh_send` with **broadcast** (no specific `to` parameter):
     ```
     📢 [Consensus Request]
     Subject: [Decision Title]
     
     Proposal:
     [Detailed proposal content]
     
     Rationale:
     [Why this approach is optimal]
     
     All agents, can you agree to this proposal?
     Reply with "@proposer-name Agree" if you agree.
     Reply with "@proposer-name Oppose: [reason]" if you oppose.
     Reply with "@proposer-name Modify: [alternative]" if you suggest modifications.
     
     Response deadline: 30 seconds
     ```
   
   **Step 2: Response Phase**:
   - Each agent MUST:
     1. Set cognitive state: `mesh_manage({ action: "set_cognitive_state", cognitiveState: "waiting_consensus" })`
     2. Reply **exactly once** (no repeated responses)
   - Response types:
     - ✅ **Agree**: "@proposer-name Agree"
     - ❌ **Oppose**: "@proposer-name Oppose: [specific reason]"
     - 🔧 **Modify**: "@proposer-name Modify: [alternative or amendment]"
     - ⏳ **Hold**: "@proposer-name Hold: [additional info needed]"
   
   **Step 3: Tally and Decision**:
   - **Unanimous Agree**: All agents reply "Agree" → Proposer:
     1. Broadcasts: "🎉 Consensus reached. Proceeding with this approach."
     2. Sets state: `mesh_manage({ action: "set_cognitive_state", cognitiveState: "agreed" })`
   - **Modifications Proposed**: Proposer integrates amendments and re-requests consensus (max 2 rounds)
   - **Opposition**: Return to discussion phase, or decide by majority vote
   - **Hold Responses**: Provide additional info, then re-request consensus
   - **No Response**: Send reminder after 30 seconds (max 1 reminder), then mark as "Consensus Failed" if still no response
   
   **Step 4: Final Declaration**:
   - Consensus reached: "🎉 [Subject] consensus completed. Proceeding with this approach."
   - Consensus failed: "⚠️ [Subject] consensus not reached. Exploring alternatives."
   - After declaration, set state: `mesh_manage({ action: "set_cognitive_state", cognitiveState: "implementing" })` or `"idle"`
   
   **Critical Rules**:
   - ✅ **Broadcast Required**: Consensus requests MUST be broadcast (no individual `to` parameter)
   - ✅ **No Individual Mentions**: Do NOT use individual `@name` checks for consensus
   - ✅ **One Response Only**: Each agent responds exactly once (no re-confirmation)
   - ✅ **Transparency**: All responses visible to all agents
   - ❌ **No Re-confirmation**: Do NOT ask agents who already agreed to confirm again
   - ❌ **No Unilateral Decision**: Do NOT decide without waiting for all responses
   - ❌ **No Individual Follow-ups**: Do NOT DM agents individually during consensus
   
2. **Builder-Validator Chain (Two-Phase Collaboration)**:
   
   **Phase 1: Plan Approval (Before Implementation)**
   - BEFORE starting implementation, Builder MUST:
     1. Set state: `mesh_manage({ action: "set_cognitive_state", cognitiveState: "discussing" })` (see Consensus Pattern state table)
     2. Announce intent and proposal via `mesh_send` (broadcast):
        ```
        📢 [Consensus Request]
        Subject: Implementation Plan for [feature]
        
        Proposal:
        [Detailed implementation plan]
        
        Rationale:
        [Why this approach]
        
        All agents, can you agree to this plan?
        Reply with "@builder-name Agree" if you agree.
        ```
     3. **Use Consensus Pattern** to gather approval from all agents.
     4. **Wait for consensus** before reserving files or implementing.
     - ❌ Forbidden: Start implementation without consensus approval.
     - ❌ Forbidden: Use individual @name checks for plan approval.
     - ✅ Required: Get consensus → Reserve files → Implement.
   
   **Phase 2: Code Review (After Implementation)**
   - AFTER implementation complete, Builder MUST:
     1. Set state: `mesh_manage({ action: "set_cognitive_state", cognitiveState: "waiting_consensus" })` (see Consensus Pattern state table)
     2. Report completion with git SHA: "Implementation complete. Ready for review."
     3. Wait for Validator to review and provide feedback.
   - Validator MUST:
     1. Set state: `mesh_manage({ action: "set_cognitive_state", cognitiveState: "reviewing" })` (see Consensus Pattern state table)
     2. Review code using `read` tool.
     3. Provide structured feedback via `mesh_send`.
     4. If issues found, request fixes.
   - **Phase 3: Final Consensus**:
     - After all fixes complete, **use Consensus Pattern** for final approval:
       ```
       📢 [Consensus Request]
       Subject: Final Approval for [feature]
       
       Implementation Summary:
       [What was implemented]
       Git SHA: [commit hash]
       
       All agents, can you approve this implementation?
       Reply with "@builder-name Agree" if approved.
       ```
     - **Wait for unanimous consensus** before merging.
   - ❌ Forbidden: Merge without consensus approval.
   - ✅ Required: Review → Feedback → Fix (if needed) → Consensus → Merge.

2. **Reply requirement**: When you receive a message, **always reply** before starting any work.
   - Messages are delivered to your inbox (`.pi/mesh/inbox/<your-name>/`)
   - Check `mesh_peers` to see who's active and what they're doing
   - Reply via `mesh_send` to acknowledge and confirm next steps
   - If you need more time, send a status update instead of ignoring
3. **File Reservation Rule**: Before any `edit` or `write` operation, **MUST reserve files** with `mesh_reserve`.
   - ✅ Required: `mesh_reserve({ paths: ["src/auth/"], reason: "Implementing authentication" })`
   - ❌ Forbidden: Editing files without prior reservation
   - ✅ Release immediately after: `mesh_release({ paths: ["src/auth/"] })`
   - ⚠️ Keep reservations specific: Reserve `src/auth/login.ts` not `src/`
   - 🔍 Check first: Use `mesh_peers` to see current reservations before requesting
4. **Message viewing**: Read full messages from your inbox, not from feed.
   - `feed` shows activity summaries only (truncated previews)
   - Full message content is in your inbox JSON files
   - Chat history in the UI shows complete message threads
5. **Mentions**: Use `@name` when addressing a specific agent (except for consensus broadcasts).
6. **Progress updates**: Share progress via `mesh_send` at key milestones.
7. **Consensus Broadcast Rule**: When requesting consensus, **ALWAYS use broadcast** (no `to` parameter). Individual @name mentions are for responses only, not for the initial request.
7. **Role switching**: Announce role changes via `mesh_send` before acting.
8. **Code review**: After implementation, another agent must review code before merge.
   - Implementer reports completion with git SHA
   - Reviewer reads code using `read` tool
   - Reviewer provides feedback via `mesh_send`
   - Fix issues before merge approval
9. **Tool usage by context**:
   - **As Builder**: `edit`, `write`, `bash`, `mesh_reserve`, `mesh_release`
   - **As Validator**: `read`, `bash`, `mesh_send` (no edits!)
   - **Role-aware**: Use tools appropriate to your current role

## Pre-Work Checklist (Builder)
Before starting any implementation:
- [ ] Set cognitive state: `mesh_manage({ action: "set_cognitive_state", cognitiveState: "discussing" })` (see Consensus Pattern state table)
- [ ] Plan shared via `mesh_send` (broadcast) and approved
- [ ] Checked `mesh_peers` for current reservations and cognitive states
- [ ] Reserved files with `mesh_reserve` (specific paths only)
- [ ] Received confirmation that no conflicts exist

## Post-Work Checklist (Builder)
After completing implementation:
- [ ] All tests passing
- [ ] Reservations released with `mesh_release`
- [ ] Completion report sent via `mesh_send` (broadcast)
- [ ] Git commit created with SHA recorded
- [ ] Set cognitive state: `mesh_manage({ action: "set_cognitive_state", cognitiveState: "idle" })` or `"waiting_consensus"` (see Consensus Pattern state table)

## Peer Monitoring (Self-Organization)
- All agents periodically check `mesh_peers` to monitor reservation status
- Alert if reservations are held for too long without progress
- Help resolve reservation conflicts directly with other agents
- Ensure all agents release reservations after completion

## Reservation Conflict Resolution
If `mesh_reserve` fails due to conflict:
1. **Check who holds the reservation**: Use `mesh_peers` to identify the agent
2. **Request status update**: Send message via `mesh_send` to the agent
   ```
   @agent-name I need to reserve [path] but it's held by you. What's your progress status?
   ```
3. **Wait for response**:
   - If agent is actively working: Wait for them to release
   - If agent is idle/stuck: Send reminder via `mesh_send`
   - If agent abandoned work: Request another agent to assist
4. **Retry reservation**: After confirmation or peer assistance
5. **Escalate if needed**: If no response after reasonable time, alert all peers via `mesh_send`

## Release Failure Handling
If `mesh_release` fails or you're unsure if release succeeded:
1. **Check current reservations**: Use `mesh_peers` to verify your reservations are gone
2. **If still present**: Retry `mesh_release` with specific paths
3. **If still failing**: Alert peers immediately via `mesh_send`
   ```
   @agent-name Unable to release reservation on [path]. Please assist.
   ```
4. **Do NOT proceed** with other work until reservations are confirmed released

## Interruption/Abortion Procedure
If work is interrupted, cancelled, or fails mid-task:
1. **Immediately release ALL reservations**:
   ```
   mesh_release({ paths: ["all reserved paths"] })
   ```
2. **Notify affected agents** via `mesh_send`:
   ```
   @agent-name Work interrupted. Released reservations on [paths]. Task [X] incomplete.
   ```
3. **Document the interruption** reason for future reference
4. **If resuming later**: Start from Plan Sharing step (rule 1)

## Workflow (Builder-Validator Chain with Consensus Pattern)

### Phase 1: Plan Approval (Using Consensus Pattern)
1. **Broadcast Proposal**: Builder presents plan via `mesh_send` broadcast:
   ```
   📢 [Consensus Request]
   Subject: Implementation Plan for [feature]
   [Proposal details]
   All agents, can you agree?
   ```
2. **Collect Responses**: Wait for all agents to reply with Agree/Oppose/Modify/Hold.
3. **Reach Consensus**: Once all agents agree, proceed.
4. **Check Reservations**: Use `mesh_peers` to check current reservations.
5. **Reserve Files**: Reserve specific files/directories with `mesh_reserve` BEFORE editing.

### Phase 2: Implementation
6. **Implement**: Start work (as Builder) with reservations active.
7. **Release Reservations**: Release ALL reservations immediately after editing complete.
8. **Completion Report**: Implementer reports completion with git SHA:
   ```
   Implementation complete. Ready for final review.
   Git SHA: [commit-hash]
   ```

### Phase 3: Code Review
9. **Peer Review**: Validator(s) review code using `read` tool → Provide feedback.
10. **Fixes** (if needed): Implementer fixes issues - repeat reserve/edit/release cycle.
11. **Ready for Consensus**: When all issues resolved, proceed to final consensus.

### Phase 4: Final Consensus (Using Consensus Pattern)
12. **Broadcast Final Approval Request**:
    ```
    📢 [Consensus Request]
    Subject: Final Approval for [feature]
    Implementation Summary: [what was done]
    Git SHA: [commit-hash]
    All agents, can you approve?
    ```
13. **Collect Final Responses**: Wait for all agents to reply.
14. **Consensus Complete**: Once unanimous agreement, broadcast:
    ```
    🎉 Consensus reached for [feature]. Proceeding with merge.
    ```
15. **Merge**: Merge code after consensus approval.

Refer to `references/workflows.md` for detailed workflows.

## Examples
Conversation samples are in `examples/builder-validator.md`.
