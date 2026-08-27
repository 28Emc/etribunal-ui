import React from 'react';
import { cn } from '@utils/helpers';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const { t } = useTranslation();

  const categories = [
    { key: 'All', label: t('categories.all') },
    { key: 'Relationship', label: t('categories.relationship') },
    { key: 'Friendship', label: t('categories.friendship') },
    { key: 'Work', label: t('categories.work') },
    { key: 'Family', label: t('categories.family') },
    { key: 'Other', label: t('categories.other') }
  ];

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = React.useState(false);
  const [showRightArrow, setShowRightArrow] = React.useState(false);

  const checkArrows = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setShowLeftArrow(el.scrollLeft > 0);
    setShowRightArrow(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.7;
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  React.useEffect(() => {
    checkArrows();
    const el = scrollContainerRef.current;
    if (el) {
      el.addEventListener('scroll', checkArrows);
      window.addEventListener('resize', checkArrows);
      checkArrows();
    }
    return () => {
      el?.removeEventListener('scroll', checkArrows);
      window.removeEventListener('resize', checkArrows);
    };
  }, []);

  return (
    <div className="relative">
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-card border border-border-main/20 rounded-full shadow-lg hover:bg-border-main/5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-text-main" />
        </button>
      )}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-card border border-border-main/20 rounded-full shadow-lg hover:bg-border-main/5 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-text-main" />
        </button>
      )}
      <div ref={scrollContainerRef} className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar py-6 px-6 md:px-8">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onCategoryChange(cat.key)}
            className={cn(
              "px-4 md:px-5 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
              selectedCategory === cat.key
                ? "bg-primary border-primary text-white"
                : "bg-transparent border-border-main/10 text-text-muted hover:bg-border-main/5 hover:text-text-main"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
