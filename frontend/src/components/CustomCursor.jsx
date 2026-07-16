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

    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
      requestAnimationFrame(animateRing);
    };

    const addHover = () => ring.classList.add('cursor-hover');
    const removeHover = () => ring.classList.remove('cursor-hover');

    const addClick = () => {
      dot.classList.add('cursor-click');
      ring.classList.add('cursor-click');
    };
    const removeClick = () => {
      dot.classList.remove('cursor-click');
      ring.classList.remove('cursor-click');
    };

    window.addEventListener('mousemove', moveDot);
    window.addEventListener('mousedown', addClick);
    window.addEventListener('mouseup', removeClick);
    const frame = requestAnimationFrame(animateRing);

    const hoverTargets = document.querySelectorAll(
      'a, button, input, textarea, select, [role="button"], .cursor-pointer'
    );
    hoverTargets.forEach((el) => {
      el.addEventListener('mouseenter', addHover);
      el.addEventListener('mouseleave', removeHover);
    });

    return () => {
      window.removeEventListener('mousemove', moveDot);
      window.removeEventListener('mousedown', addClick);
      window.removeEventListener('mouseup', removeClick);
      cancelAnimationFrame(frame);
      hoverTargets.forEach((el) => {
        el.removeEventListener('mouseenter', addHover);
        el.removeEventListener('mouseleave', removeHover);
      });
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