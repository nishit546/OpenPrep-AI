import React from 'react';

/**
 * Global SVG colorblind simulation filters using standard W3C feColorMatrix transformations.
 * Rendered at root level so filters can be applied via CSS: filter: url('#protanopia-filter')
 */
export const ColorblindFilterSVG = () => {
  return (
    <svg
      aria-hidden="true"
      className="absolute w-0 h-0 overflow-hidden pointer-events-none"
      style={{ border: 0, clip: 'rect(0 0 0 0)', height: '1px', margin: '-1px', overflow: 'hidden', padding: 0, position: 'absolute', width: '1px' }}
    >
      <defs>
        {/* Protanopia (Red-Blind) Filter Matrix */}
        <filter id="protanopia-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.56667 0.43333 0       0 0
                    0.55833 0.44167 0       0 0
                    0       0.24167 0.75833 0 0
                    0       0       0       1 0"
          />
        </filter>

        {/* Deuteranopia (Green-Blind) Filter Matrix */}
        <filter id="deuteranopia-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.625 0.375 0   0 0
                    0.7   0.3   0   0 0
                    0     0.3   0.7 0 0
                    0     0     0   1 0"
          />
        </filter>

        {/* Tritanopia (Blue-Blind) Filter Matrix */}
        <filter id="tritanopia-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.95 0.05  0     0 0
                    0    0.433 0.567 0 0
                    0    0.475 0.525 0 0
                    0    0     0     1 0"
          />
        </filter>

        {/* Achromatopsia (Monochromacy) Filter Matrix */}
        <filter id="achromatopsia-filter" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0.299 0.587 0.114 0 0
                    0.299 0.587 0.114 0 0
                    0.299 0.587 0.114 0 0
                    0     0     0     1 0"
          />
        </filter>
      </defs>
    </svg>
  );
};

export default ColorblindFilterSVG;
