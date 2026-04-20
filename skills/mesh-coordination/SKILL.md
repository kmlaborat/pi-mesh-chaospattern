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
3. **Message viewing**: Read full messages from your inbox, not from feed.
   - `feed` shows activity summaries only (truncated previews)
   - Full message content is in your inbox JSON files
   - Chat history in the UI shows complete message threads
4. **Mentions**: Use `@name` when addressing a specific agent.
5. **Progress updates**: Share progress via `mesh_send` at key milestones.
6. **Role adherence**: Act according to your role (Builder implements, Validator reviews).
7. **Code review by Validator**: After implementation, Validator must review code before merge.
   - Builder reports completion with git SHA
   - Validator reviews code using `read` tool
   - Validator provides feedback via `mesh_send`
   - Fix issues before merge approval
8. **Tool restrictions by role**:
   - Builder: `edit`, `write`, `bash`, `mesh_reserve`
   - Validator: `read`, `bash`, `mesh_send` (no edits!)
   - Coordinator: `mesh_send`, `mesh_peers`, `mesh_manage`

## Workflow
1. **Plan**: Present plan to others → Get approval
2. **Implement**: Start work (for Builders)
3. **Completion Report**: Builder reports completion with git SHA
4. **Validator Review**: Validator reviews code → Provides feedback
5. **Fixes**: Builder fixes issues (if any)
6. **Approval**: Validator approves → Merge

Refer to `references/workflows.md` for detailed workflows.

## Examples
Conversation samples are in `examples/builder-validator.md`.
