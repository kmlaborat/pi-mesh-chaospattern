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

## Role
Current role is loaded from configuration:
- **Builder**: Implements code and writes tests.
- **Validator**: Reviews code and detects bugs.
- **Coordinator**: Manages progress and coordinates with others.

Role definitions are in `references/roles.json`.

## Must-Follow Rules
1. **Before starting work**: Always share your plan with others via `mesh_send` and **wait for explicit approval** before implementing.
   - ❌ Forbidden: Call `edit` or `write` without sharing first.
   - ❌ Forbidden: Start implementation before receiving a reply.
   - ✅ Required flow:
     1. Send plan: `mesh_send({ to: "@agent-2", message: "I will implement X by doing Y. Please approve." })`
     2. Wait for reply with approval or feedback
     3. Only after approval: Start implementation
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
5. **Mentions**: Use `@name` when addressing a specific agent.
6. **Progress updates**: Share progress via `mesh_send` at key milestones.
7. **Role adherence**: Act according to your role (Builder implements, Validator reviews).
8. **Code review by Validator**: After implementation, Validator must review code before merge.
   - Builder reports completion with git SHA
   - Validator reviews code using `read` tool
   - Validator provides feedback via `mesh_send`
   - Fix issues before merge approval
9. **Tool restrictions by role**:
   - Builder: `edit`, `write`, `bash`, `mesh_reserve`, `mesh_release`
   - Validator: `read`, `bash`, `mesh_send` (no edits!)
   - Coordinator: `mesh_send`, `mesh_peers`, `mesh_manage`

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

## Coordinator Monitoring Duties
- Periodically check `mesh_peers` to monitor reservation status
- Alert if reservations are held for too long without progress
- Help resolve reservation conflicts between agents
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
   - If agent is idle/stuck: Coordinator may intervene
   - If agent abandoned work: Request Coordinator to release
4. **Retry reservation**: After confirmation or Coordinator intervention
5. **Escalate if needed**: If no response after reasonable time, alert Coordinator

## Release Failure Handling
If `mesh_release` fails or you're unsure if release succeeded:
1. **Check current reservations**: Use `mesh_peers` to verify your reservations are gone
2. **If still present**: Retry `mesh_release` with specific paths
3. **If still failing**: Alert Coordinator immediately
   ```
   @coordinator Unable to release reservation on [path]. Please assist.
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

## Workflow
1. **Plan**: Present plan to others → Get approval
2. **Check Reservations**: Use `mesh_peers` to check current reservations
3. **Reserve Files**: Reserve specific files/directories with `mesh_reserve` BEFORE editing
4. **Implement**: Start work (for Builders) with reservations active
5. **Release Reservations**: Release ALL reservations immediately after editing complete
6. **Completion Report**: Builder reports completion with git SHA
7. **Validator Review**: Validator reviews code → Provides feedback
8. **Fixes**: Builder fixes issues (if any) - repeat reserve/edit/release cycle
9. **Approval**: Validator approves → Merge

Refer to `references/workflows.md` for detailed workflows.

## Examples
Conversation samples are in `examples/builder-validator.md`.
