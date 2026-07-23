import { useEffect, useRef, useState } from 'react';

function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const touchCheck = window.matchMedia('(pointer: coarse)').matches;
    if (touchCheck) {
      setIsTouch(true);
      return;
    }

    const dot = dotRef.current;
    const ring = ringRef.current;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    const moveDot = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    };

    let frame;

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
      frame = requestAnimationFrame(animateRing);
    };

    const addClick = () => {
      dot.classList.add('cursor-click');
      ring.classList.add('cursor-click');
    };
    const removeClick = () => {
      dot.classList.remove('cursor-click');
      ring.classList.remove('cursor-click');
    };

    const hoverSelector = 'a, button, input, textarea, select, [role="button"], .cursor-pointer';

    const handleBodyMouseEnter = (e) => {
      if (e.target.closest(hoverSelector)) {
        ring.classList.add('cursor-hover');
      }
    };

    const handleBodyMouseLeave = (e) => {
      if (e.target.closest(hoverSelector)) {
        ring.classList.remove('cursor-hover');
      }
    };

    window.addEventListener('mousemove', moveDot);
    window.addEventListener('mousedown', addClick);
    window.addEventListener('mouseup', removeClick);
    document.body.addEventListener('mouseenter', handleBodyMouseEnter, true);
    document.body.addEventListener('mouseleave', handleBodyMouseLeave, true);
    frame = requestAnimationFrame(animateRing);

    return () => {
      window.removeEventListener('mousemove', moveDot);
      window.removeEventListener('mousedown', addClick);
      window.removeEventListener('mouseup', removeClick);
      document.body.removeEventListener('mouseenter', handleBodyMouseEnter, true);
      document.body.removeEventListener('mouseleave', handleBodyMouseLeave, true);
      cancelAnimationFrame(frame);
    };
  }, []);

  if (isTouch) return null;

  return (
    <>
      <div ref={dotRef} className="custom-cursor-dot" />
      <div ref={ringRef} className="custom-cursor-ring" />
    </>
  );
}

export default CustomCursor;