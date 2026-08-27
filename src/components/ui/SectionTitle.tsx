import React from 'react';

interface SectionTitleProps {
  children: React.ReactNode;
}

export function SectionTitle({ children }: SectionTitleProps) {
  return (
    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em] px-6 mb-4 italic opacity-80">
      {children}
    </h4>
  );
}
