import React from 'react';

export const MaahirLogo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`bg-white rounded-full overflow-hidden flex items-center justify-center border-2 border-white shadow-sm ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
         {/* Background */}
         <rect width="100" height="100" fill="white"/>
         
         {/* Hair */}
         <path d="M25 35C25 20 35 10 50 10C65 10 75 20 75 35V45C75 45 80 45 80 55C80 65 75 70 75 70V80C75 90 50 100 50 100C50 100 25 90 25 80V70C25 70 20 65 20 55C20 45 25 45 25 45V35Z" fill="black"/>
         
         {/* Face Shape */}
         <path d="M28 40C28 40 28 85 50 90C72 85 72 40 72 40C72 25 50 25 50 25C50 25 28 25 28 40Z" fill="white"/>
         
         {/* Eyebrows */}
         <path d="M35 42C35 42 38 38 43 40" stroke="black" strokeWidth="2.5" strokeLinecap="round"/>
         <path d="M65 42C65 42 62 38 57 40" stroke="black" strokeWidth="2.5" strokeLinecap="round"/>
         
         {/* Eyes */}
         <circle cx="39" cy="48" r="3" fill="black"/>
         <circle cx="61" cy="48" r="3" fill="black"/>
         
         {/* Nose */}
         <path d="M50 50V58C50 58 48 60 46 60" stroke="black" strokeWidth="2" strokeLinecap="round"/>
         
         {/* Mustache/Mouth Area */}
         <path d="M42 66C45 64 55 64 58 66" stroke="black" strokeWidth="2.5" strokeLinecap="round"/>
         <path d="M47 72C48 73 52 73 53 72" stroke="black" strokeWidth="2" strokeLinecap="round"/>

         {/* Goatee */}
         <path d="M46 78Q50 82 54 78" stroke="black" strokeWidth="3" strokeLinecap="round"/>
      </svg>
    </div>
  );
};