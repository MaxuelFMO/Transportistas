import React from 'react';

const SeatIcon = ({ occupied, index = 0 }) => {
    // Monochromatic progression of shades
    const shades = ["#000000", "#404040", "#737373", "#a3a3a3"];
    const fill = occupied ? shades[index] || "black" : "white";

    return (
        <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill={fill} 
            stroke="black" 
            strokeWidth="2" 
            style={{ transitionDelay: `${index * 100}ms` }}
            className="transition-all duration-500 ease-in-out transform hover:scale-110"
        >
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <rect x="5" y="11" width="14" height="8" rx="2" />
            <path d="M5 19v2m14-2v2" />
        </svg>
    );
};

export default SeatIcon;
