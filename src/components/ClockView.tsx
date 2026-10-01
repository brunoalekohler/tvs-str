import React, { useState, useEffect } from 'react';

export const ClockView: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');

  // Format date in Portuguese
  const dayOfWeek = time.toLocaleDateString('pt-BR', { weekday: 'long' });
  const formattedDayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
  const formattedDate = time.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 w-full select-none">
      {/* Massive high-contrast digital clock */}
      <div className="flex items-center justify-center font-mono font-black tracking-tight text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)] leading-none">
        <span className="text-[18vw] sm:text-[16vw] md:text-[15vw] font-mono tracking-tighter">
          {hours}
        </span>
        <span className="text-[14vw] sm:text-[13vw] md:text-[12vw] text-blue-500 font-bold px-1 sm:px-3 animate-pulse">
          :
        </span>
        <span className="text-[18vw] sm:text-[16vw] md:text-[15vw] font-mono tracking-tighter">
          {minutes}
        </span>
        <span className="text-[14vw] sm:text-[13vw] md:text-[12vw] text-blue-500 font-bold px-1 sm:px-3 animate-pulse">
          :
        </span>
        <span className="text-[18vw] sm:text-[16vw] md:text-[15vw] font-mono tracking-tighter text-blue-400">
          {seconds}
        </span>
      </div>

      {/* Large readable date for high wall display */}
      <div className="mt-4 sm:mt-8 text-center">
        <span className="text-xl sm:text-3xl md:text-4xl font-extrabold text-slate-300 uppercase tracking-widest font-sans">
          {formattedDayOfWeek}, <span className="text-blue-400">{formattedDate}</span>
        </span>
      </div>
    </div>
  );
};
