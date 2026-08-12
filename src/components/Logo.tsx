import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-20 h-20" }) => {
  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Gold Arc */}
      <path 
        d="M 140,50 A 70 70 0 0 0 60,110" 
        stroke="#C5A059" 
        strokeWidth="6" 
        strokeLinecap="round" 
        fill="none"
      />
      
      {/* Graduation Cap */}
      <path 
        d="M 65,70 L 100,55 L 135,70 L 100,85 Z" 
        fill="#0B2545" 
      />
      <path d="M 135,70 L 135,80" stroke="#0B2545" strokeWidth="4" />
      <circle cx="135" cy="85" r="4" fill="#C5A059" />

      {/* Head */}
      <circle cx="100" cy="95" r="15" fill="#0B2545" />

      {/* Book / Body */}
      <path 
        d="M 65,110 L 65,145 C 80,145 95,135 100,125 C 105,135 120,145 135,145 L 135,110 C 120,110 105,120 100,135 C 95,120 80,110 65,110 Z" 
        fill="#0B2545" 
      />
      {/* Inner pages line */}
      <path d="M 70,135 C 80,135 90,125 100,115 C 110,125 120,135 130,135" stroke="#FAF9F6" strokeWidth="3" fill="none" />

      {/* Gold Checkmark */}
      <path 
        d="M 115,115 L 125,125 L 145,100" 
        stroke="#C5A059" 
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        fill="none"
      />
    </svg>
  );
};
