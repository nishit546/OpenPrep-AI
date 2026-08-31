import React, { useState, useEffect } from 'react';

// Global dispatch event pattern to trigger announcements cleanly from any file
export function announceToScreenReader(message, priority = 'polite') {
  const event = new CustomEvent('a11y-announce', { detail: { message, priority } });
  window.dispatchEvent(event);
}

export default function AriaAnnouncer() {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  useEffect(() => {
    const handleAnnouncement = (e) => {
      const { message, priority } = e.detail;
      if (priority === 'assertive') {
        setAssertiveMessage(message);
        // Clear message immediately after parsing to avoid duplicate chatter loops
        setTimeout(() => setAssertiveMessage(''), 1000);
      } else {
        setPoliteMessage(message);
        setTimeout(() => setPoliteMessage(''), 1000);
      }
    };

    window.addEventListener('a11y-announce', handleAnnouncement);
    return () => window.removeEventListener('a11y-announce', handleAnnouncement);
  }, []);

  return (
    <div className="sr-only" pwa-a11y-container="true">
      {/* aria-live="polite" avoids interrupting active dictation pipelines unless critical */}
      <div aria-live="polite" aria-atomic="true">{politeMessage}</div>
      <div aria-live="assertive" aria-atomic="true">{assertiveMessage}</div>
    </div>
  );
}
