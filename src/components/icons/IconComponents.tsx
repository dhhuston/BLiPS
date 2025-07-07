

import React from 'react';

export const LoadingSpinner: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg className={`animate-spin ${className} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export const CalculatorIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h3m-3-10h.01M9 10h.01M12 10h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01M4 7h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z" />
    </svg>
);

export const SaveIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
);

export const LoadIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

export const ExternalLinkIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
);

export const CloseIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export const WindArrowIcon: React.FC<{ rotation: number; className?: string }> = ({ rotation, className = "w-5 h-5" }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className={`${className} text-cyan-400 transition-transform duration-500`} 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
        style={{ transform: `rotate(${rotation}deg)` }}
    >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 14l-4-4m4 4l4-4" transform="rotate(180 12 12)" />
    </svg>
);


// Helper function to convert SVG string to Base64 Data URL for use in Cesium etc.
export const svgToDataURL = (svgString: string): string => `data:image/svg+xml;base64,${btoa(svgString)}`;

// Functions to return SVG strings for map markers
export const LaunchIcon = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g><path fill="${color}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12 2L2 7l10 5 10-5-10-5z"></path><path fill="${color}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M2 17l10 5 10-5"></path><path fill="${color}" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M2 12l10 5 10-5"></path></g></svg>`;
export const BurstIcon = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g><circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2"/><path d="M5 12H3M19 12H21M12 5V3M12 19V21M8.46 8.46L7.05 7.05M15.54 15.54L16.95 16.95M8.46 15.54L7.05 16.95M15.54 8.46L16.95 7.05" stroke="white" stroke-width="2" stroke-linecap="round"/></g></svg>`;
export const LandingIcon = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g><path fill="${color}" stroke="white" stroke-width="1.5" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></g></svg>`;
