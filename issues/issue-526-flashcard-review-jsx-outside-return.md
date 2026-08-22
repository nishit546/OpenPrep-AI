---
title: '[BUG]: FlashcardReview JSX Rendered Outside Return Statement — 3 UI Elements Invisible'
labels: 'ECSoC26, ECSoC26-L2, bug, frontend'
assignees: ''
---

## Issue Type
Bug / UI Rendering

## Priority
P1 High

## Summary
In `FlashcardReview.jsx`, three UI elements are written as bare JSX expressions between early-return statements instead of inside the component's `return` block. These expressions are evaluated as JavaScript (and discarded), so the "Create from Audio" button and `GenerateFlashcardsFromAudioModal` are never rendered. Additionally, `RemediationQuizModal` is used on line 615 but never imported, causing a `ReferenceError` when the session summary screen is shown.

## Problem Statement
In `frontend/src/pages/FlashcardReview.jsx`:

**Lines 532–540** — A `<button>` for "Create from Audio" appears as a bare JSX expression between the `useEffect` cleanup (line 531) and the `if (loading)` check (line 541). This JSX is evaluated and silently discarded — it is never rendered.

```javascript
// Line 531: end of useEffect
}, [isSessionComplete, noCardsDue]);
{noCardsDue && (                    // <-- bare JSX, not in return
  <button ...>
    Create from Audio
  </button>
)}
if (loading) {                      // <-- back to normal code
```

**Lines 560–570** — `<GenerateFlashcardsFromAudioModal>` appears as a bare JSX expression between the `if (error)` block (line 550) and the session summary check (line 572). Same issue — evaluated and discarded.

**Line 615** — `<RemediationQuizModal>` is referenced in the session summary JSX, but the component is **never imported** at the top of the file. This will throw `ReferenceError: RemediationQuizModal is not defined` when a user completes a review session.

## Current Behavior
- "Create from Audio" button never appears on the no-cards-due screen
- `GenerateFlashcardsFromAudioModal` never opens from the review page
- Session summary screen crashes with `ReferenceError` when `RemediationQuizModal` is rendered

## Expected Behavior
- All three UI elements are properly inside the component's `return` JSX tree
- `RemediationQuizModal` is imported and renders correctly on the session summary screen

## Root Cause Analysis
The JSX expressions at lines 532–540 and 560–570 were likely inserted during a code review or merge at the wrong indentation level, placing them outside the `return` statement. The `RemediationQuizModal` import was likely removed during a cleanup pass.

## User Story
As a student reviewing flashcards
I want to see the "Create from Audio" button and remediation quiz when appropriate
So that I can generate new cards from audio and retake failed cards

## Proposed Solution
1. Move the JSX at lines 532–540 and 560–570 into the component's `return` tree (inside the session summary section around line 572+)
2. Add the missing import for `RemediationQuizModal`:
   ```javascript
   import RemediationQuizModal from '../components/flashcards/RemediationQuizModal';
   ```
3. Verify the component file exists at the expected path

## Technical Scope

### Frontend Impact
- **File:** `frontend/src/pages/FlashcardReview.jsx`
  - **Lines 532–540:** Move `<button>` into the return JSX
  - **Lines 560–570:** Move `<GenerateFlashcardsFromAudioModal>` into the return JSX
  - **Line 615:** Add import for `RemediationQuizModal`
  - **Top of file:** Add missing import statement

### Backend Impact
None.

### Database Impact
None.

### API Impact
None.

## Acceptance Criteria
- [ ] No bare JSX expressions exist outside the component's `return` statement
- [ ] `RemediationQuizModal` is imported at the top of the file
- [ ] "Create from Audio" button renders on the no-cards-due screen
- [ ] `GenerateFlashcardsFromAudioModal` opens when triggered
- [ ] Session summary screen renders `RemediationQuizModal` without `ReferenceError`
- [ ] No `console.error` or runtime exceptions in the flashcard review flow

## Edge Cases
- [ ] When `noCardsDue` is true and `isAudioGeneratorOpen` is false — button should show
- [ ] When session is complete with failed cards — `RemediationQuizModal` should display
- [ ] When `RemediationQuizModal` component file doesn't exist at the import path — verify the path

## Security Considerations
None.

## Accessibility Considerations
Ensure the "Create from Audio" button has proper focus management and keyboard accessibility.

## Performance Considerations
None.

## Testing Requirements

### Unit Tests
- [ ] Test: `FlashcardReview` renders without runtime errors when `noCardsDue` is true
- [ ] Test: `FlashcardReview` renders the session summary without `ReferenceError`
- [ ] Test: All imports resolve correctly (no missing modules)

### Manual Testing
- [ ] Complete a flashcard review session → verify session summary shows remediation quiz
- [ ] Navigate to flashcards with no cards due → verify "Create from Audio" button is visible

## Affected Areas
- [x] Frontend
- [x] Flashcards

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 2 (Medium) (ECSoC26-L2)

## Definition of Done
- [ ] Implementation completed
- [ ] All JSX moved into return tree
- [ ] Missing import added
- [ ] Acceptance criteria met
- [ ] Tests pass
- [ ] Ready for production
