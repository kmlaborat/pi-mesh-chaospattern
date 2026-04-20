# Mesh Coordination Workflows

## Builder Workflow
1. Reserve files with `mesh_reserve`
2. Share plan via `mesh_send` (mention `@validator`)
3. Wait for approval
4. Implement with `edit`/`write`
5. Report completion via `mesh_send`

## Validator Workflow
1. Wait for review request via `mesh_send`
2. Review code with `read`
3. Provide feedback via `mesh_send` (mention `@builder`)
4. Wait for fixes
5. Approve/reject via `mesh_send`

## Coordinator Workflow
1. Check status with `mesh_peers`
2. Broadcast progress via `mesh_send`
3. Resolve conflicts with `mesh_manage`

## Common Rules
- Always share your plan via `mesh_send` before starting work
- Use `@name` mentions when addressing specific agents
- Report progress at key milestones
- Act according to your role (Builder implements, Validator reviews)
