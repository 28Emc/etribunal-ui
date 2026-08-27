import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@utils/helpers';
import { Maximize2 } from 'lucide-react';
import type { Case } from '@typings/index';

interface EvidenceGalleryProps {
  evidence: Case['sideA']['evidence'];
  accentClass: string;
  captionAlignClass?: string;
  onOpen: (url: string) => void;
}

export function EvidenceGallery({
  evidence,
  accentClass,
  captionAlignClass = '',
  onOpen,
}: EvidenceGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!evidence.length) return null;

  const activeEvidence = evidence[Math.min(activeIndex, evidence.length - 1)];

  return (
    <div className="space-y-4">
      <div
        onClick={() => onOpen(activeEvidence.url)}
        className="aspect-[4/3] rounded-[32px] overflow-hidden border border-border-main/10 shadow-2xl relative group cursor-zoom-in bg-card"
      >
        <img src={activeEvidence.url} alt={activeEvidence.caption || ''} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Maximize2 className="w-8 h-8 text-white/85" />
        </div>
      </div>

      {activeEvidence.caption && activeEvidence.caption !== 'Evidence' && (
        <p className={cn("text-xs text-text-muted font-bold italic px-2 uppercase tracking-wider", captionAlignClass)}>
          {activeEvidence.caption}
        </p>
      )}

      {evidence.length > 1 && (
        <div className="overflow-x-auto subtle-scrollbar pb-2">
          <div className="flex gap-3 min-w-max px-1">
            {evidence.map((item, index) => (
              <button
                key={item.id || `evidence-${index}`}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative w-24 h-20 rounded-2xl overflow-hidden border transition-all shrink-0",
                  activeIndex === index ? `border-2 ${accentClass}` : "border-border-main/10 opacity-60 hover:opacity-100"
                )}
              >
                <img src={item.url} alt={item.caption || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
