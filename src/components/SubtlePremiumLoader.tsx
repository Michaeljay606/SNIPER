import React from 'react';

export const SubtlePremiumLoader = ({ size = "sm" }: { size?: "sm" | "md" }) => {
  const dimensions = size === "sm" ? "w-5 h-5" : "w-8 h-8";
  const fontSize = size === "sm" ? "text-[8px]" : "text-[10px]";

  return (
    <div className="flex items-center gap-2">
      <div className={`relative ${dimensions} flex items-center justify-center`}>
        <div className="absolute inset-0 border-2 border-accent-neon/20 rounded-full"></div>
        <div className="absolute inset-0 border-t-2 border-accent-neon rounded-full animate-spin"></div>
        <div className={`font-black text-text-primary ${fontSize} animate-pulse`}>ONX</div>
      </div>
      <span className={`uppercase font-black tracking-[0.2em] ${fontSize} text-accent-neon animate-pulse`}>
        Processing
      </span>
    </div>
  );
};
