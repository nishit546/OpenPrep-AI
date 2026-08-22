---
title: '[BUG]: Duplicate Column Definitions in User Model — leaderboardVisible & receiveWeeklyDigest'
labels: 'ECSoC26, ECSoC26-L1, bug, backend, database'
assignees: ''
---

## Issue Type
Bug / Code Quality / Data Integrity

## Priority
P2 Medium

## Summary
The `User` model defines `leaderboardVisible` and `receiveWeeklyDigest` columns twice — once at lines 90–98 and again at lines 158–165. Sequelize silently uses the last definition, which means the first definition's configuration (including `allowNull: false` on `receiveWeeklyDigest`) may be ignored. This creates confusion, risks data inconsistencies, and makes the model harder to maintain.

## Problem Statement
In `backend/models/User.js`:

**First definition (lines 90–98):**
```javascript
leaderboardVisible: {
  type: DataTypes.BOOLEAN,
  defaultValue: true,
},
receiveWeeklyDigest: {
  type: DataTypes.BOOLEAN,
  defaultValue: true,
  allowNull: false,          // <-- explicit allowNull: false
},
```

**Second definition (lines 158–165):**
```javascript
leaderboardVisible: {
  type: DataTypes.BOOLEAN,
  defaultValue: true,
},
receiveWeeklyDigest: {
  type: DataTypes.BOOLEAN,
  defaultValue: true,
  // <-- no allowNull specified
},
```

When Sequelize encounters duplicate column definitions in the same model, it uses the **last definition**. This means:
1. The `allowNull: false` constraint on `receiveWeeklyDigest` from the first definition is silently dropped
2. The two definitions are identical except for `allowNull`, making the duplication pointless
3. Future contributors may modify one definition thinking it's the only one

## Current Behavior
- Sequelize uses the second definition for both columns
- `receiveWeeklyDigest` allows `NULL` values (the `allowNull: false` from the first definition is ignored)
- Code reviews may flag the first definition as "unused" or the second as "missing allowNull"

## Expected Behavior
- Each column is defined exactly once
- The correct constraints (`allowNull: false` for `receiveWeeklyDigest`) are preserved
- No duplicate definitions exist in the model

## Root Cause Analysis
The columns were likely added in two separate commits during feature development. The first commit added them in one location, and a later commit added them again in a different location without noticing the duplication.

## User Story
As a developer maintaining the User model
I want each column defined exactly once with the correct constraints
So that the schema is clear and data integrity is enforced

## Proposed Solution
Remove the duplicate definitions at lines 158–165 and keep the first definition (lines 90–98) which includes the `allowNull: false` constraint:

```javascript
// KEEP lines 90-98:
leaderboardVisible: {
  type: DataTypes.BOOLEAN,
  defaultValue: true,
},
receiveWeeklyDigest: {
  type: DataTypes.BOOLEAN,
  defaultValue: true,
  allowNull: false,
},

// REMOVE lines 158-165 (duplicates):
// leaderboardVisible: { ... }
// receiveWeeklyDigest: { ... }
```

After removal, run `npx sequelize-cli db:migrate` to ensure the schema is consistent.

## Technical Scope

### Backend Impact
- **File:** `backend/models/User.js`
  - **Lines 158–165:** Remove duplicate `leaderboardVisible` and `receiveWeeklyDigest` definitions

### Frontend Impact
None — the API response shape doesn't change.

### Database Impact
- If the migration was created from the second definition (without `allowNull: false`), a new migration may be needed to add the `NOT NULL` constraint to `receiveWeeklyDigest`
- Check the existing migration files to determine the current database schema state

### API Impact
None — the column behavior doesn't change.

## Acceptance Criteria
- [ ] `leaderboardVisible` is defined exactly once in `User.js`
- [ ] `receiveWeeklyDigest` is defined exactly once in `User.js`
- [ ] `receiveWeeklyDigest` has `allowNull: false` (or the intended constraint)
- [ ] No duplicate column names exist in the model definition
- [ ] Existing tests pass
- [ ] `node -e "require('./models/User')"` doesn't throw

## Edge Cases
- [ ] If the database already has NULL values in `receiveWeeklyDigest`, a migration is needed before adding the constraint
- [ ] If the frontend sets `receiveWeeklyDigest: null` in a request, it should be rejected or default to `true`

## Security Considerations
None directly, but inconsistent schema definitions can lead to unexpected behavior in authorization or data handling logic.

## Accessibility Considerations
None.

## Performance Considerations
None — this is a code quality fix.

## Testing Requirements

### Unit Tests
- [ ] Test: `User.rawAttributes` has exactly one `leaderboardVisible` definition
- [ ] Test: `User.rawAttributes` has exactly one `receiveWeeklyDigest` definition
- [ ] Test: `User.rawAttributes.receiveWeeklyDigest.allowNull` is `false`

### Manual Testing
- [ ] Run `node -e "const U = require('./backend/models/User'); console.log(Object.keys(U.rawAttributes).length)"` — verify no duplicate keys

## Affected Areas
- [x] Backend
- [x] Database

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 1 (Easy / Beginner-friendly) (ECSoC26-L1)

## Definition of Done
- [ ] Implementation completed
- [ ] Duplicate definitions removed
- [ ] Correct constraints preserved
- [ ] Acceptance criteria met
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Ready for production
