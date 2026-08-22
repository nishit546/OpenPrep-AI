---
title: '[SECURITY]: XSS via toast.innerHTML in API Client — Unsanitized Error Messages'
labels: 'ECSoC26, ECSoC26-L1, security, frontend'
assignees: ''
---

## Issue Type
Security / Cross-Site Scripting (XSS)

## Priority
P1 High

## Summary
The `showBackgroundErrorToast` function in `frontend/src/services/api.js` creates a toast element using `innerHTML` with an unsanitized `message` parameter. If an API error response contains HTML or JavaScript in its message field, it will execute in the user's browser, enabling stored XSS attacks.

## Problem Statement
In `frontend/src/services/api.js` lines 130–146:

```javascript
const showBackgroundErrorToast = (message) => {
  // ...
  const toast = document.createElement('div');
  toast.className = '...';
  toast.innerHTML = `
    <svg ...>...</svg>
    <span>${message}</span>    // <-- unsanitized user-controlled content
  `;
  container.appendChild(toast);
```

The `message` parameter comes from API error responses (e.g., `error.response.data.error`). If a backend endpoint returns an error message containing HTML, it will be inserted verbatim into the DOM via `innerHTML`.

### Attack Scenario
1. An attacker crafts a request that triggers a server error with a malicious message
2. The backend includes the attacker's input in the error response (e.g., `error: "<img src=x onerror=alert(document.cookie)>"`)
3. The frontend's response interceptor calls `showBackgroundErrorToast(errorMessage)`
4. The HTML is inserted into the DOM via `innerHTML`
5. The `<img>` tag's `onerror` handler executes, stealing the user's cookies or session token

### Realistic Trigger Points
- Registration with a crafted email that causes a database error with the email in the message
- Quiz submission with malformed data that reflects in error messages
- Any endpoint that echoes user input in error responses

## Current Behavior
- Error messages from the API are inserted as raw HTML into the DOM
- Malicious HTML/JS in error messages executes in the user's browser

## Expected Behavior
- Error messages are rendered as plain text, not HTML
- No user-controlled content is inserted via `innerHTML`

## Root Cause Analysis
The `innerHTML` property was used for convenience to include the SVG icon alongside the message text. The `textContent` property should be used instead for the message portion.

## User Story
As a platform user
I want error messages displayed safely
So that no malicious code can execute through error notifications

## Proposed Solution
Replace `innerHTML` with `textContent` for the message span, or use `createElement` + `textContent` for the entire toast:

```javascript
// BEFORE
toast.innerHTML = `
  <svg ...>...</svg>
  <span>${message}</span>
`;

// AFTER — option 1: use textContent for the message
const icon = `<svg class="w-4 h-4 text-yellow-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
</svg>`;
toast.innerHTML = icon;
const span = document.createElement('span');
span.textContent = message;  // safe — treats as plain text
toast.appendChild(span);

// AFTER — option 2: fully DOM-based (safest)
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('class', 'w-4 h-4 text-yellow-500 shrink-0');
svg.setAttribute('fill', 'none');
svg.setAttribute('viewBox', '0 0 24 24');
svg.setAttribute('stroke', 'currentColor');
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('stroke-linecap', 'round');
path.setAttribute('stroke-linejoin', 'round');
path.setAttribute('stroke-width', '2');
path.setAttribute('d', 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z');
svg.appendChild(path);
const span = document.createElement('span');
span.textContent = message;
toast.appendChild(svg);
toast.appendChild(span);
```

## Technical Scope

### Frontend Impact
- **File:** `frontend/src/services/api.js`
  - **Lines 141–146:** Replace `innerHTML` with safe DOM construction

### Backend Impact
None — this is a frontend sanitization fix.

### Database Impact
None.

### API Impact
None.

## Acceptance Criteria
- [ ] `innerHTML` is not used with the `message` parameter
- [ ] Error messages are rendered as plain text via `textContent` or `createElement`
- [ ] SVG icon is still displayed correctly in the toast
- [ ] Toast appears and disappears with the same animation
- [ ] No `innerHTML` with user-controlled content exists in `api.js`

## Edge Cases
- [ ] Error message is `undefined` or `null` → toast shows empty message gracefully
- [ ] Error message contains HTML entities (`<`, `>`, `&`) → displayed as literal text
- [ ] Error message is very long → toast truncates or wraps appropriately

## Security Considerations
This is an XSS vulnerability. Any attacker who can influence API error responses can execute arbitrary JavaScript in users' browsers.

## Accessibility Considerations
The toast should have `role="alert"` and `aria-live="assertive"` for screen readers.

## Performance Considerations
DOM-based construction is slightly slower than `innerHTML` but negligible for a single toast element.

## Testing Requirements

### Unit Tests
- [ ] Test: `showBackgroundErrorToast('<script>alert(1)</script>')` does not execute the script
- [ ] Test: `showBackgroundErrorToast('Normal error message')` renders the message as text
- [ ] Test: `showBackgroundErrorToast(undefined)` doesn't throw

### Manual Testing
- [ ] Trigger an error with HTML in the message → verify it's displayed as plain text, not executed

## Affected Areas
- [x] Frontend
- [x] Security

## Open Source Programs
- [x] Elite Summer of Code (ECSoC26)

## Difficulty Level (ECSoC26)
- [x] Level 1 (Easy / Beginner-friendly) (ECSoC26-L1)

## Definition of Done
- [ ] Implementation completed
- [ ] `innerHTML` removed for message content
- [ ] Toast renders safely with plain text
- [ ] Acceptance criteria met
- [ ] Tests pass
- [ ] Ready for production
