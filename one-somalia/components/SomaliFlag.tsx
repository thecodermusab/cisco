import React from 'react';

export const SomaliFlag: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`relative overflow-hidden shadow-sm border border-white/10 ${className}`} style={{ aspectRatio: '3/2' }}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 900 600" 
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Official Azure Blue */}
        <rect width="900" height="600" fill="#4189DD" />
        
        {/* Centered White 5-Pointed Star */}
        <polygon 
          fill="#FFFFFF" 
          points="450,180 523,405 331,265 569,265 377,405"
        />
      </svg>
      
      {/* Subtle Gradient Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>
    </div>
  );
};