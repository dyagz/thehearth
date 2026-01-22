# Ralph Autonomous Agent - Iteration 6

## Your Objective
IMPLEMENT SECURITY FIXES: Fix all CRITICAL and HIGH severity vulnerabilities identified in SECURITY_AUDIT.md. Priority order: 1) CRITICAL-01: Add DOMPurify sanitization for XSS prevention, 2) CRITICAL-02: Add input validation for all socket events, 3) CRITICAL-03: Add per-IP connection limits and memory cleanup, 4) HIGH-01 through HIGH-05: Rate limiting, CORS validation, CSP headers, input length checks, WebSocket origin validation. Test that the server still runs after changes. Commit each fix separately.

## CRITICAL: Read This First - Codebase Patterns
<!-- Reusable patterns discovered - READ THIS FIRST each iteration -->

## Your Workspace Files
- `.agent/TODO.md` - Task list (pick highest priority incomplete item)
- `.agent/NOTES.md` - Your scratchpad (store observations, patterns)
- `.agent/STATUS.md` - Progress tracking (update after work)
- `.agent/PROGRESS.md` - Append-only iteration log

## Current TODO.md
```
# TODO - Task List

> Work items for the autonomous agent. Mark with [x] when complete.
> Add new items as discovered during implementation.

## Objective
IMPLEMENT SECURITY FIXES: Fix all CRITICAL and HIGH severity vulnerabilities identified in SECURITY_AUDIT.md. Priority order: 1) CRITICAL-01: Add DOMPurify sanitization for XSS prevention, 2) CRITICAL-02: Add input validation for all socket events, 3) CRITICAL-03: Add per-IP connection limits and memory cleanup, 4) HIGH-01 through HIGH-05: Rate limiting, CORS validation, CSP headers, input length checks, WebSocket origin validation. Test that the server still runs after changes. Commit each fix separately.

## CRITICAL Fixes (P0 - Immediate)

- [ ] **CRITICAL-01: XSS Prevention** - Install isomorphic-dompurify, update sanitizeString() in server.js
- [ ] **CRITICAL-02: Socket Event Validation** - Add input validation for setTimezone, setLocation, chatMessage
- [ ] **CRITICAL-03: DoS Prevention** - Add per-IP connection limits, periodic cleanup of stale Map entries

## HIGH Fixes (P1 - Before Launch)

- [ ] **HIGH-01: Enhanced Rate Limiting** - Add connection rate limiting per IP, rate limit setLocation/setTimezone
- [ ] **HIGH-02: CORS Validation** - Create parseAllowedOrigins() function with proper validation
- [ ] **HIGH-03: CSP Headers** - Add Content-Security-Policy, HSTS, Permissions-Policy headers
- [ ] **HIGH-04: Input Length Validation** - Validate all inputs BEFORE processing
- [ ] **HIGH-05: WebSocket Origin Check** - Add origin validation middleware for socket.io

## Validation

- [ ] **Test server starts** - Run `node server.js` and verify no errors
- [ ] **Test chat functionality** - Verify messages still work after changes
- [ ] **Commit all fixes** - Separate commits for each security fix

## Features

<!-- Security enhancements implemented -->

## Bug Fixes

<!-- Add bugs discovered during work -->

## Tech Debt

<!-- Items identified by code critic -->

---
*Initialized: 2026-01-22 16:00:36*

```

## Work Loop

1. **Read** TODO.md and pick the highest priority incomplete task (marked `- [ ]`)
2. **Update** STATUS.md with what you're working on
3. **Implement** the change with minimal, focused modifications
4. **Validate** your changes:
   - Build: `npm run build`
   - Lint: `npm run lint`
   - Test: `npm test`
5. **Commit** if validation passes: `git add -A && git commit -m "description"`
6. **Update** files:
   - Mark completed items in TODO.md with `[x]`
   - Add any new discovered items to TODO.md
   - Update STATUS.md with results
   - Append iteration summary to PROGRESS.md
   - If you discovered reusable patterns, add them to NOTES.md "Codebase Patterns" section

## Validation Rules

- ALL changes must pass validation before committing
- Do NOT commit broken code
- If validation fails, fix immediately
- If stuck on same issue for 3+ attempts, document in NOTES.md and move to next task

## Progress Report Format

APPEND to `.agent/PROGRESS.md`:
```
## Iteration N - [Date/Time]
**Task**: [What you worked on]
**Result**: [Success/Partial/Blocked]
**Files Changed**: [List of files]
**Learnings**:
- [Pattern discovered]
- [Gotcha encountered]
---
```

## Housekeeping (Every 5 iterations)

If iteration number ends in 0 or 5, do a quick cleanup pass:
- Delete temp files: tmpclaude-*, tmp*-cwd, *.pyc, __pycache__/
- Delete stale test artifacts: .pytest_cache/, htmlcov/, .coverage
- Check for orphaned test files not in a tests/ folder
- If multiple similar README/docs files exist, consolidate into one
- Update .gitignore if new patterns of temp files are found

## Exit Conditions

You may stop when:
- The current task is complete and committed
- You encounter an unresolvable blocker (document in STATUS.md)
- All TODO items are complete

Now read the full TODO.md and begin work on the highest priority incomplete item.
