# Mesh Coordination Workflows

## Builder Workflow
1. **Plan Sharing**: Share implementation plan via `mesh_send` (mention `@validator`)
   ```
   @validator I will implement [feature]. Plan: [details]. Any issues?
   ```
2. **Check Reservations**: Use `mesh_peers` to see current reservations
3. **File Reservation**: Reserve files with `mesh_reserve` **BEFORE any editing**
   - Reserve specific paths, not broad directories
   - Include clear reason: `mesh_reserve({ paths: ["src/auth/"], reason: "Implementing authentication" })`
4. **Approval Wait**: Wait for Validator approval
5. **Implementation**: Implement with `edit`/`write` + write tests
6. **Release Reservations**: **IMMEDIATELY release ALL reservations** after editing complete
   - `mesh_release({ paths: [...] })` for all reserved paths
7. **Completion Report**: Report via `mesh_send` with git SHA
   ```
   @validator Implementation complete. SHA: abc123. Ready for review.
   ```

## Validator Workflow
1. **Plan Review**: Review Builder's plan via `mesh_send`
   - Approve if sound, suggest improvements if needed
2. **Wait for Completion**: Wait for Builder's completion report
3. **Code Review**: Review code with `read` tool
   - Check implementation against plan
   - Verify tests are present and comprehensive
   - Look for bugs, architecture issues, edge cases
4. **Feedback**: Provide feedback via `mesh_send` (mention `@builder`)
   - **Approve**: "@builder Code looks good. Approved for merge."
   - **Request Fixes**: "@builder Issues found: [list]. Please fix."
     - **Critical**: Bugs, security issues, data loss risks
     - **Important**: Architecture problems, missing features, test gaps
     - **Minor**: Style, optimizations, documentation
5. **Re-review**: Review fixes and give final approval

## Coordinator Workflow
1. **Status Check**: Check status with `mesh_peers`
2. **Role Assignment**: Assign roles via `mesh_send`
   ```
   @builder @validator Task X assigned. Builder: implement, Validator: review.
   ```
3. **Reservation Monitoring**: Periodically monitor reservation status via `mesh_peers`
   - Alert if reservations held too long without progress
   - Help resolve reservation conflicts between agents
4. **Progress Broadcast**: Broadcast progress via `mesh_send`
5. **Completion Verification**: Ensure reservations released after completion
6. **Conflict Resolution**: Resolve conflicts with `mesh_manage`
7. **Milestone Tracking**: Track task completion

## Code Review Guidelines for Validators

### What to Check
- **Implementation**: Does code match the approved plan?
- **Tests**: Are tests present and comprehensive?
- **Architecture**: Clean separation of concerns?
- **Error Handling**: Proper error handling and edge cases?
- **Code Quality**: DRY principle, readability, maintainability?

### Feedback Format
When providing feedback, structure it clearly:
```
@builder Review results:

✅ Strengths:
- [What's well done]

⚠️ Issues:
- Critical: [bugs, security, data loss]
- Important: [architecture, missing features]
- Minor: [style, optimizations]

📋 Decision: Approve / Request fixes
```

### Issue Categories
- **Critical**: Must fix immediately (bugs, security, data loss)
- **Important**: Fix before merge (architecture, missing features, test gaps)
- **Minor**: Nice to have (style, optimizations, docs)

## Common Rules
- Always share your plan via `mesh_send` before starting work
- **Always reply to messages before starting any implementation work**
- **File Reservation**: Before any `edit` or `write`, MUST reserve with `mesh_reserve`
  - Reserve specific paths (e.g., `src/auth/login.ts` not `src/`)
  - Release immediately after completion with `mesh_release`
  - Check `mesh_peers` before reserving to avoid conflicts
- Use `@name` mentions when addressing specific agents
- Report progress at key milestones
- Act according to your role (Builder implements, Validator reviews)
- Never edit code without Validator approval
- Validator must review all code before merge approval
- **Read full messages from inbox, not from feed** (feed shows truncated previews only)

## Communication Protocol
1. **Send message**: Use `mesh_send({ to: "@agent", message: "..." })`
2. **Wait for reply**: Do not start work until you receive a response
3. **Check status**: Use `mesh_peers` to see who's active and what they're doing
4. **Read messages**: Full content is in your inbox (`.pi/mesh/inbox/<your-name>/`), not in feed
5. **Reply promptly**: When you receive a message, acknowledge and respond before proceeding
6. **Update status**: If busy, set custom status via `mesh_manage({ action: "set_status", message: "..." })`
