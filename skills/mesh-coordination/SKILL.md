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
1. **Before starting work**: Always share your plan with others via `mesh_send` and get approval.
   - ❌ Forbidden: Call `edit` or `write` without sharing first.
   - ✅ Recommended: `mesh_send({ to: "@agent-2", message: "I will implement..." })`
2. **Mentions**: Use `@name` when addressing a specific agent.
3. **Progress updates**: Share progress via `mesh_send` at key milestones.
4. **Role adherence**: Act according to your role (Builder implements, Validator reviews).
5. **Code review by Validator**: After implementation, Validator must review code before merge.
   - Builder reports completion with git SHA
   - Validator reviews code using `read` tool
   - Validator provides feedback via `mesh_send`
   - Fix issues before merge approval
6. **Tool restrictions by role**:
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
