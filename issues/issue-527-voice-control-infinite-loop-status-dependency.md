---
title: '[BUG]: useVoiceControl Infinite Loop — SpeechRecognition Recreated on Every Status Change'
labels: 'ECSoC26, ECSoC26-L2, bug, frontend, accessibility'
assignees: ''
---

## Issue Type
Bug / Infinite Loop / Performance

## Priority
P1 High

## Summary
The `useVoiceControl` hook includes `status` in its `useEffect` dependency array, causing the entire `SpeechRecognition` instance to be destroyed and recreated every time `status` changes (IDLE → LISTENING → PROCESSING). This creates an infinite re-render loop that freezes the browser tab and makes voice control completely non-functional.

## Problem Statement
In `frontend/src/hooks/useVoiceControl.js` line 163:

```javascript
}, [isEnabled, isPaused, onCommand, onTranscript, language, status]);
```

The `status` state variable changes frequently during normal voice recognition operation:
1. User activates voice → `status` becomes `LISTENING`
2. Speech is detected → `status` becomes `PROCESSING`
3. Result is returned → `status` becomes `IDLE`
4. Each `status` change triggers the `useEffect` cleanup (which calls `recognition.abort()`)
5. The effect re-runs and creates a new `SpeechRecognition` instance
6. The new instance immediately starts, changing `status` back to `LISTENING`
7. Go to step 2 → infinite loop

## Current Behavior
- Activating voice control causes the browser tab to freeze
- CPU usage spikes as SpeechRecognition instances are rapidly created and destroyed
- Voice commands never complete because recognition is aborted before results arrive
- Console shows rapid state change cycling

## Expected Behavior
- `SpeechRecognition` is created once when voice mode is enabled
- Status changes update UI state without recreating the recognition instance
- Voice commands complete normally and return transcripts

## Root Cause Analysis
`status` was added to the dependency array to "keep the effect in sync," but `status` is an output of the recognition callbacks, not an input. Including it creates a circular dependency: effect → status change → effect re-run → abort → status change → ...

## User Story
As a student using voice-controlled flashcard review
I want voice commands to work reliably
So that I can review hands-free without the browser freezing

## Proposed Solution
Remove `status` from the dependency array. The `status` variable is only read inside event callbacks (which use refs or functional state updates), so it doesn't need to be a dependency:

```javascript
// BEFORE
}, [isEnabled, isPaused, onCommand, onTranscript, language, status]);

// AFTER
}, [isEnabled, isPaused, onCommand, onTranscript, language]);
```

If `status` is needed inside the effect body, read it from a ref instead of the state variable.

## Technical Scope

### Frontend Impact
- **File:** `frontend/src/hooks/useVoiceControl.js`
  - **Line 163:** Remove `status` from the dependency array

### Backend Impact
None.

### Database Impact
None.

### API Impact
None.

## Acceptance Criteria
- [ ] `status` is not in the `useEffect` dependency array on line 163
- [ ] Activating voice control does not cause an infinite loop
- [ ] Speech recognition completes and returns transcripts
- [ ] Voice commands (flip card, mark known, mark hard) work correctly
- [ ] CPU usage remains normal during voice control sessions
- [ ] No `React StrictMode` double-mount issues

## Edge Cases
- [ ] Rapid toggling of voice mode on/off doesn't leak recognition instances
- [ ] Changing `language` while voice is active gracefully restarts recognition
- [ ] Browser doesn't support SpeechRecognition — hook degrades gracefully

## Security Considerations
None.

## Accessibility Considerations
This is an accessibility feature (voice control). The fix ensures it actually works for users who depend on hands-free interaction.

## Performance Considerations
Fixing the infinite loop eliminates a CPU-intensive cycle that could drain battery on mobile devices.

## Testing Requirements

### Unit Tests
- [ ] Test: `useVoiceControl` does not recreate `SpeechRecognition` when `status` changes
- [ ] Test: `useVoiceControl` creates `SpeechRecognition` only once when enabled
- [ ] Test: Voice commands trigger callbacks correctly

### Manual Testing
- [ ] Enable voice control → verify browser doesn't freeze
- [ ] Speak a command → verify it's recognized and processed
- [ ] Toggle voice mode off → verify cleanup occurs

## Affected Areas
- [x] Frontend
- [x] Accessibility
- [x] Hooks

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 2 (Medium) (ECSoC26-L2)

## Definition of Done
- [ ] Implementation completed
- [ ] Dependency array fixed
- [ ] Voice control works without freezing
- [ ] Acceptance criteria met
- [ ] Tests pass
- [ ] Ready for production
