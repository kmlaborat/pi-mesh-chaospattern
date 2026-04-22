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
   
   **Step 1: Proposal Broadcast**:
   - Proposer MUST use `mesh_send` with **broadcast** (no specific `to` parameter):
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
   - Each agent MUST reply **exactly once** (no repeated responses)
   - Response types:
     - ✅ **Agree**: "@proposer-name Agree"
     - ❌ **Oppose**: "@proposer-name Oppose: [specific reason]"
     - 🔧 **Modify**: "@proposer-name Modify: [alternative or amendment]"
     - ⏳ **Hold**: "@proposer-name Hold: [additional info needed]"
   
   **Step 3: Tally and Decision**:
   - **Unanimous Agree**: All agents reply "Agree" → Proposer broadcasts "🎉 Consensus reached. Proceeding with this approach."
   - **Modifications Proposed**: Proposer integrates amendments and re-requests consensus (max 2 rounds)
   - **Opposition**: Return to discussion phase, or decide by majority vote
   - **Hold Responses**: Provide additional info, then re-request consensus
   - **No Response**: Send reminder after 30 seconds (max 1 reminder), then mark as "Consensus Failed" if still no response
   
   **Step 4: Final Declaration**:
   - Consensus reached: "🎉 [Subject] consensus completed. Proceeding with this approach."
   - Consensus failed: "⚠️ [Subject] consensus not reached. Exploring alternatives."
   
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
     1. Announce intent and proposal via `mesh_send` (broadcast):
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
     2. **Use Consensus Pattern** to gather approval from all agents.
     3. **Wait for consensus** before reserving files or implementing.
     - ❌ Forbidden: Start implementation without consensus approval.
     - ❌ Forbidden: Use individual @name checks for plan approval.
     - ✅ Required: Get consensus → Reserve files → Implement.
   
   **Phase 2: Code Review (After Implementation)**
   - AFTER implementation complete, Builder MUST:
     1. Report completion with git SHA: "Implementation complete. Ready for review."
     2. Wait for Validator to review and provide feedback.
   - Validator MUST:
     1. Review code using `read` tool.
     2. Provide structured feedback via `mesh_send`.
     3. If issues found, request fixes.
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
- [ ] Plan shared via `mesh_send` and approved
- [ ] Checked `mesh_peers` for current reservations
- [ ] Reserved files with `mesh_reserve` (specific paths only)
- [ ] Received confirmation that no conflicts exist

## Post-Work Checklist (Builder)
After completing implementation:
- [ ] All tests passing
- [ ] Reservations released with `mesh_release`
- [ ] Completion report sent via `mesh_send`
- [ ] Git commit created with SHA recorded

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
