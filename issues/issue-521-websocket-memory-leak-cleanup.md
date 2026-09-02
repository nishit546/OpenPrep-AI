---
title: '[BUG]: Memory Leak and Unhandled Reconnection in Collaborative Study Room WebSockets'
labels: 'bug, backend, high-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Issue Type
Bug Fix / WebSocket Reliability / Memory Management

## Priority
P1 High

## Summary
Fix event listener leaks on Socket.io client disconnections, properly teardown room subscriptions, and implement exponential backoff reconnection logic in the study room socket handler.

## Problem Statement
When users join and leave collaborative study rooms frequently, orphaned socket event listeners remain attached in Node.js server memory. Over prolonged server uptime, memory consumption grows linearly, eventually causing event emitter warning thresholds (`MaxListenersExceededWarning`) and unhandled disconnections on high-concurrency rooms.

## Current Behavior
Disconnect handlers do not clean up custom room listeners or heartbeat intervals, causing heap memory retention on repeated student joins/leaves.

## Expected Behavior
All socket event listeners and room channel subscriptions are cleanly garbage collected upon `disconnect` event, with heartbeat timeouts cleanly cleared and clients implementing exponential backoff reconnection.

## User Story
As a student in a live study room
I want seamless and crash-free real-time collaboration
So that my session does not drop or freeze due to server socket exhaustion

## Proposed Solution
1. Refactor `backend/src/sockets/studyRoomSocket.js` to track active client socket IDs inside a dedicated `Map<string, Set<string>>`.
2. Add an explicit `cleanupSocket(socketId)` subroutine inside `socket.on("disconnect")` that clears all timeouts, heartbeats, and room channel event emitters.
3. Implement an exponential backoff client reconnect strategy in `frontend/src/services/socketService.js` (initial: 1s, max: 30s, jitter: 20%).

## Technical Scope

### Frontend Impact
Update `frontend/src/services/socketService.js` to manage reconnection lifecycle state and display toast alerts on reconnection attempts.

### Backend Impact
Refactor `backend/src/sockets/studyRoomSocket.js` and `backend/src/sockets/socketManager.js` with explicit listener disposal.

### Database Impact
None.

### API Impact
WebSocket events: `study:room:join`, `study:room:leave`, `study:room:heartbeat`.

## Acceptance Criteria
- [ ] Zero `MaxListenersExceededWarning` logs emitted during 1,000 simulated socket connect/disconnect cycles.
- [ ] Memory heap usage remains flat after disconnecting 500 concurrent study room mock clients.
- [ ] Client displays non-intrusive reconnection banner when network drops and smoothly rejoins active room upon reconnection.

## Testing Requirements

### Unit Tests
- [ ] Jest tests for `cleanupSocket` listener removal verification.

### Manual Testing
- [ ] Simulate network flap using Chrome DevTools Offline mode and observe automatic room rejoin without UI crash.

## Affected Areas
- [x] Backend
- [x] WebSocket

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 2 (Medium / Intermediate) (ECSoC26-L2)

## Definition of Done
- [ ] Implementation completed
- [ ] Acceptance criteria met
- [ ] Automated & manual testing passed
- [ ] Documentation updated
- [ ] Ready for production
