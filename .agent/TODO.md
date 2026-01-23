# TODO - Task List

> Work items for the autonomous agent. Mark with [x] when complete.
> Add new items as discovered during implementation.

## Objective
Build a CLI client (cli.js) for hearth that connects to the same socket.io backend as the web app. It should: 1) Connect to thehearth.dev socket.io server 2) Use cached username from ~/.hearth-cli.json 3) Display chat messages with colors and timestamps 4) Support sending messages 5) Show @mentions and replies 6) Support /w whisper, /users, /help, /quit commands 7) Work synced with web users in the same chat

## High Priority

- [x] Analyze codebase structure and understand existing patterns
- [x] Plan implementation approach
- [x] Implement core functionality
- [x] Add tests for new code
- [x] Validate build/lint/test pass

## Features

- [x] CLI client created (cli.js)
- [x] Socket.io connection to thehearth.dev
- [x] Username caching in ~/.hearth-cli.json
- [x] Colorized message display with timestamps
- [x] @mention highlighting
- [x] Reply threading display
- [x] Commands: /help, /users, /w, /location, /quit
- [x] Location filtering
- [x] Documentation (CLI_README.md)

## Bug Fixes

None discovered

## Tech Debt

<!-- Items identified by code critic -->

---
*Initialized: 2026-01-22 22:07:46*
*Completed: 2026-01-22 22:15:00*
