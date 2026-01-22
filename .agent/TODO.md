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
