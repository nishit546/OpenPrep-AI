---
title: '[FEAT]: Granular Role-Based Access Control (RBAC) & Audit Log Explorer for Study Squad Admins'
labels: 'enhancement, backend, security, authentication, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
As Study Squads on OpenPrep AI grow into active communities with dozens of members, squad leaders need granular permissions to manage moderators, prevent deck tampering, and audit group activities (such as member bans, note edits, and quiz assignments).

This feature implements a **Granular RBAC System and Searchable Audit Log Explorer for Study Squads**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Role & Permission Matrix (`backend/models/SquadMember.js`)**:
   - Defined roles: `OWNER`, `ADMIN`, `MODERATOR`, `CONTRIBUTOR`, `VIEWER`.
   - Granular permission flags: `CAN_EDIT_DECKS`, `CAN_DELETE_NOTES`, `CAN_INVITE_MEMBERS`, `CAN_BAN_MEMBERS`, `CAN_VIEW_AUDIT_LOGS`.
2. **Squad Authorization Middleware (`backend/middleware/squadAuth.js`)**:
   - Reusable middleware `requireSquadPermission(permissionKey)` for route-level authorization checks.
3. **Audit Log Persistence & Service (`backend/services/squadAuditService.js`)**:
   - Captures timestamped events: `MEMBER_JOINED`, `ROLE_CHANGED`, `DECK_CREATED`, `DECK_MODIFIED`, `NOTE_DELETED`, `INVITE_REVOKED`.
4. **REST Endpoints (`backend/controllers/squadAdminController.js`)**:
   - `GET /api/squads/:id/audit-logs` - Paginated, filterable audit log stream.
   - `PUT /api/squads/:id/members/:userId/role` - Updates squad member role with audit logging.

### Frontend Architecture
1. **Squad Member Management Table (`frontend/src/components/squads/SquadMemberManagement.jsx`)**:
   - Role dropdowns, permission switches, and member kick/ban dialogs.
2. **Audit Log Timeline Viewer (`frontend/src/components/squads/SquadAuditLogViewer.jsx`)**:
   - Filterable chronological feed with search by actor, action type, and date range.

---

## Acceptance Criteria
- [ ] Squad permissions are strictly enforced on backend REST endpoints; unauthorized actions return 403 Forbidden.
- [ ] All critical squad mutations are recorded in audit logs with actor ID, action name, IP, and target metadata.
- [ ] Squad owners and admins can filter and search audit logs effortlessly.
- [ ] Unit tests for permission bitmask verification and audit log recording.
