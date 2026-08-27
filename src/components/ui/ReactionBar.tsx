import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Loader2, ThumbsUp, Heart, Angry } from 'lucide-react';
import { cn, formatNumber } from '@utils/helpers';
import { ReactionIcon } from './ReactionIcon';
import type { ReactionType } from './ReactionIcon';
import { Tooltip } from './Tooltip';

interface ReactionBarProps {
  targetId: string;
  reactions: { LIKE: number; LOVE?: number; ANGRY: number };
  userReaction?: string | null;
  onReaction: (emoji: ReactionType) => Promise<void>;
  isReacting?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  onReactionClick?: () => void;
}

const usePopupPosition = (ref: React.RefObject<HTMLButtonElement | null>) => {
  const calc = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      return {
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left + rect.width / 2,
      };
    }
    return null;
  }, [ref]);
  return calc;
};

const ReactionBarComponent: React.FC<ReactionBarProps> = ({
  reactions,
  userReaction,
  onReaction,
  isReacting = false,
  size = 'md',
  className,
  onReactionClick,
}) => {
  const { t } = useTranslation();
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const buttonRef = useRef<HTMLButtonElement>(null);
  const countsBtnRef = useRef<HTMLButtonElement>(null);
  const calcBtnPos = usePopupPosition(buttonRef);
  const calcCountsPos = usePopupPosition(countsBtnRef);
  const isTouchInteraction = useRef(false);

  const reactionConfig = [
    { 
      type: 'LIKE' as ReactionType, 
      icon: ThumbsUp, 
      labelKey: 'reactions.like', 
      color: isDark ? 'text-blue-400' : 'text-blue-700',
      bg: isDark ? 'bg-blue-400/20' : 'bg-blue-700/20',
      border: isDark ? 'border-blue-400' : 'border-blue-700',
    },
    { 
      type: 'LOVE' as ReactionType, 
      icon: Heart, 
      labelKey: 'reactions.love', 
      color: isDark ? 'text-pink-400' : 'text-pink-700',
      bg: isDark ? 'bg-pink-400/20' : 'bg-pink-700/20',
      border: isDark ? 'border-pink-400' : 'border-pink-700',
    },
    { 
      type: 'ANGRY' as ReactionType, 
      icon: Angry, 
      labelKey: 'reactions.angry', 
      color: isDark ? 'text-red-400' : 'text-red-700',
      bg: isDark ? 'bg-red-400/20' : 'bg-red-700/20',
      border: isDark ? 'border-red-400' : 'border-red-700',
    },
  ];

const isSmall = size === 'sm';
  const [localReactions, setLocalReactions] = useState(reactions);
  const [localUserReaction, setLocalUserReaction] = useState(userReaction);
  const totalReactions = (localReactions.LIKE || 0) + (localReactions.LOVE || 0) + (localReactions.ANGRY || 0);
  const [justReacted, setJustReacted] = useState(false);
  
  useEffect(() => {
    setLocalReactions(reactions);
  }, [reactions]);

  useEffect(() => {
    setLocalUserReaction(userReaction);
  }, [userReaction]);

  useEffect(() => {
    if (localUserReaction && !justReacted) {
      setJustReacted(true);
      const timer = setTimeout(() => setJustReacted(false), 600);
      return () => clearTimeout(timer);
    }
  }, [localUserReaction]);

  const currentReaction = localUserReaction ? reactionConfig.find(r => r.type === localUserReaction) : null;
  const CurrentIcon = currentReaction?.icon || ThumbsUp;

  const handleReactionWithLocal = (type: ReactionType) => {
    const isSameReaction = localUserReaction === type;
    
    setLocalReactions(prev => {
      const newReactions = { ...prev };
      if (isSameReaction) {
        newReactions[type as keyof typeof newReactions] = Math.max(0, ((prev as any)[type] || 0) - 1) as any;
        setLocalUserReaction(null);
      } else {
        if (localUserReaction) {
          newReactions[localUserReaction as keyof typeof newReactions] = Math.max(0, ((prev as any)[localUserReaction] || 0) - 1) as any;
        }
        (newReactions as any)[type] = ((prev as any)[type] || 0) + 1;
        setLocalUserReaction(type);
      }
      return newReactions;
    });
    
    onReaction(type);
  };

  const [showOptions, setShowOptions] = useState(false);
  const [optionsStyle, setOptionsStyle] = useState<React.CSSProperties | null>(null);
  const showOptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideOptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverOptions = useRef(false);

  const clearOptTimers = () => {
    if (showOptTimer.current) { clearTimeout(showOptTimer.current); showOptTimer.current = null; }
    if (hideOptTimer.current) { clearTimeout(hideOptTimer.current); hideOptTimer.current = null; }
  };

  const openOptions = useCallback(() => {
    const pos = calcBtnPos();
    if (pos) setOptionsStyle({ position: 'fixed', bottom: pos.bottom, left: pos.left, transform: 'translateX(-50%)' });
    setShowOptions(true);
  }, [calcBtnPos]);

  const scheduleHideOptions = (delay = 200) => {
    if (hideOptTimer.current) clearTimeout(hideOptTimer.current);
    hideOptTimer.current = setTimeout(() => {
      if (!isOverOptions.current) {
        setShowOptions(false);
        setOptionsStyle(null);
      }
    }, delay);
  };

  const handleMouseEnter = () => {
    if (isTouchInteraction.current) return;
    isOverOptions.current = false;
    clearOptTimers();
    showOptTimer.current = setTimeout(openOptions, 500);
  };

  const handleMouseLeave = () => {
    clearOptTimers();
    scheduleHideOptions(200);
  };

  const [showCounts, setShowCounts] = useState(false);
  const [countsStyle, setCountsStyle] = useState<React.CSSProperties | null>(null);
  const showCountsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideCountsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverCounts = useRef(false);

  const clearCountsTimers = () => {
    if (showCountsTimer.current) { clearTimeout(showCountsTimer.current); showCountsTimer.current = null; }
    if (hideCountsTimer.current) { clearTimeout(hideCountsTimer.current); hideCountsTimer.current = null; }
  };

  const openCounts = useCallback(() => {
    const pos = calcCountsPos();
    if (pos) setCountsStyle({ position: 'fixed', bottom: pos.bottom, left: pos.left, transform: 'translateX(-50%)' });
    setShowCounts(true);
  }, [calcCountsPos]);

  const scheduleHideCounts = (delay = 200) => {
    if (hideCountsTimer.current) clearTimeout(hideCountsTimer.current);
    hideCountsTimer.current = setTimeout(() => {
      if (!isOverCounts.current) {
        setShowCounts(false);
        setCountsStyle(null);
      }
    }, delay);
  };

  const handleCountsMouseEnter = () => {
    if (isTouchInteraction.current) return;
    isOverCounts.current = false;
    clearCountsTimers();
    showCountsTimer.current = setTimeout(openCounts, 50);
  };

  const handleCountsMouseLeave = () => {
    clearCountsTimers();
    scheduleHideCounts(200);
  };

  const handleReactionSelect = (type: ReactionType, e: React.MouseEvent) => {
    e.stopPropagation();
    handleReactionWithLocal(type);
    setShowOptions(false);
    setOptionsStyle(null);
  };

  const handleMainPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      isTouchInteraction.current = true;
      setTimeout(() => { isTouchInteraction.current = false; }, 600);
      e.currentTarget.setPointerCapture(e.pointerId);
      showOptTimer.current = setTimeout(openOptions, 250);
    }
  };

  const handleMainPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && showOptTimer.current) {
      clearTimeout(showOptTimer.current);
      showOptTimer.current = null;
    }
  };

  const handleMainPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && showOptTimer.current) {
      clearTimeout(showOptTimer.current);
      showOptTimer.current = null;
    }
  };

  const handleMainClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleReactionWithLocal('LIKE' as ReactionType);
    setShowOptions(false);
    setOptionsStyle(null);
  };

  const handleCountsPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      isTouchInteraction.current = true;
      setTimeout(() => { isTouchInteraction.current = false; }, 600);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handleCountsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTouchInteraction.current) {
      setShowCounts(prev => !prev);
    }
  };

  useEffect(() => {
    return () => {
      clearOptTimers();
      clearCountsTimers();
    };
  }, []);

  useEffect(() => {
    if (!showOptions && !showCounts) return;
    const handler = () => {
      setShowOptions(false); setOptionsStyle(null);
      setShowCounts(false); setCountsStyle(null);
    };
    window.addEventListener('scroll', handler, true);
    return () => window.removeEventListener('scroll', handler, true);
  }, [showOptions, showCounts]);

  const renderOptionsPopup = () => {
    if (!showOptions || !optionsStyle) return null;
    return createPortal(
      <div style={optionsStyle} className="z-[9999]">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          onMouseEnter={() => { isOverOptions.current = true; clearOptTimers(); }}
          onMouseLeave={() => { isOverOptions.current = false; scheduleHideOptions(200); }}
          className={cn(
            "flex items-center gap-2 p-2 rounded-full",
            isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200",
            "shadow-lg"
          )}
        >
          {reactionConfig.map((config, idx) => (
            <Tooltip key={config.type} content={t(config.labelKey)} position="top">
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05, duration: 0.08 }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                disabled={isReacting}
                onClick={(e) => handleReactionSelect(config.type, e)}
                className={cn(
                  "p-2 rounded-full transition-all",
                  config.bg,
                  config.border,
                  config.color
                )}
              >
                <config.icon className="w-6 h-6" />
              </motion.button>
            </Tooltip>
          ))}
        </motion.div>
      </div>,
      document.body
    );
  };

  const renderCountsPopup = () => {
    if (!showCounts || !countsStyle) return null;
    return createPortal(
      <div style={countsStyle} className="z-[9999]">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          onMouseEnter={() => { isOverCounts.current = true; clearCountsTimers(); }}
          onMouseLeave={() => { isOverCounts.current = false; scheduleHideCounts(200); }}
          className={cn(
            "flex flex-col gap-1 p-1.5 rounded-2xl",
            isDark ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200",
            "shadow-lg"
          )}
        >
          {reactionConfig.map((config, idx) => (
            <motion.div
              key={config.type}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05, duration: 0.08 }}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 rounded-full",
                config.bg,
                config.border
              )}
            >
              <config.icon className="w-4 h-4" />
              <span className={cn("text-xs font-black", config.color)}>
                {formatNumber(localReactions[config.type as keyof typeof localReactions] || 0)}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>,
      document.body
    );
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <motion.button
          ref={buttonRef}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={justReacted ? { scale: [1, 2, 1] } : { scale: 1 }}
          transition={justReacted ? { duration: 0.4, ease: "easeOut" } : {}}
          disabled={isReacting}
          onClick={handleMainClick}
          onPointerDown={handleMainPointerDown}
          onPointerUp={handleMainPointerUp}
          onPointerLeave={handleMainPointerLeave}
          onPointerCancel={handleMainPointerLeave}
          className={cn(
            "flex items-center gap-1.5 rounded-full border transition-all duration-200",
            isSmall ? "px-2 py-0.5" : "px-3 py-1.5",
            currentReaction 
              ? cn(currentReaction.bg, currentReaction.border, currentReaction.color)
              : "bg-transparent border-transparent text-text-muted hover:bg-border-main/5"
          )}
        >
          {isReacting && userReaction ? (
            <Loader2 className={cn("animate-spin", isSmall ? "w-3 h-3" : "w-4 h-4")} />
          ) : (
            <CurrentIcon className={cn(isSmall ? "w-4.5 h-4.5" : "w-5 h-5", currentReaction?.color)} />
          )}
          
          {totalReactions > 0 && (
            <span className={cn(
              "font-black tracking-tight",
              isSmall ? "text-[10px]" : "text-xs",
              currentReaction ? currentReaction.color : "text-text-muted"
            )}>
              {formatNumber(totalReactions)}
            </span>
          )}
        </motion.button>

        {renderOptionsPopup()}
      </div>

      {totalReactions > 0 && (
        <div 
          className="relative"
          onMouseEnter={handleCountsMouseEnter}
          onMouseLeave={handleCountsMouseLeave}
        >
          <motion.button
            ref={countsBtnRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleCountsClick}
            onPointerDown={handleCountsPointerDown}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full border border-border-main/20 bg-card hover:bg-border-main/10 transition-all",
              isSmall ? "h-7" : "h-8"
            )}
          >
            <div className="flex items-center gap-0.5">
              <ReactionIcon type="LIKE" size="md" />
              <ReactionIcon type="LOVE" size="md" />
              <ReactionIcon type="ANGRY" size="md" />
            </div>
          </motion.button>

          {renderCountsPopup()}
        </div>
      )}
    </div>
  );
};

export const ReactionBar = memo(ReactionBarComponent);
