import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@utils/helpers';
import { Tooltip } from '@shared/components/Tooltip';

interface IconButtonProps {
  icon: React.ElementType;
  onClick: () => void;
  tooltip?: string;
  className?: string;
}

export interface PageLayoutProps {
  title?: string;
  children?: React.ReactNode;
  leftButton?: IconButtonProps;
  rightButton?: IconButtonProps | IconButtonProps[];
  hideNav?: boolean;
  className?: string;
  rightButtonMenu?: React.ReactNode;
  showRightButtonMenu?: boolean;
  onCloseRightButtonMenu?: () => void;
}

export function PageLayout({
  title,
  children,
  leftButton,
  rightButton,
  hideNav = false,
  className,
  rightButtonMenu,
  showRightButtonMenu = false,
  onCloseRightButtonMenu
}: PageLayoutProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const defaultLeftButton: IconButtonProps = {
    icon: ChevronLeft,
    onClick: handleBack,
    tooltip: 'Atrás'
  };

  const renderButton = (btn?: IconButtonProps, isDefaultLeft = false) => {
    if (!btn && !isDefaultLeft) return null;
    const buttonProps = btn || defaultLeftButton;
    const Icon = buttonProps.icon;
    
    const buttonElement = (
      <button
        onClick={buttonProps.onClick}
        className={cn(
          "p-2 rounded-full hover:bg-white/10 transition-colors text-text-main",
          buttonProps.className
        )}
      >
        <Icon className="w-5 h-5" />
      </button>
    );

    if (buttonProps.tooltip) {
      return <Tooltip content={buttonProps.tooltip}>{buttonElement}</Tooltip>;
    }
    
    return buttonElement;
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-background theme-transition">
      {!hideNav && (
        <header className="relative z-40 bg-background/80 backdrop-blur-md theme-transition">
          <div className="flex items-center justify-between h-14 px-4 w-full">
            <div className="flex-1 flex justify-start">
              {renderButton(leftButton, true)}
            </div>
            
            {title && (
              <h1 className="text-xs md:text-sm font-black uppercase tracking-[0.2em] text-text-main text-center flex-1 md:truncate md:px-4">
                {title}
              </h1>
            )}
            
            <div className="flex-1 flex justify-end gap-1">
              {Array.isArray(rightButton) 
                ? rightButton.map((btn, i) => (
                    <React.Fragment key={i}>
                      {renderButton(btn)}
                    </React.Fragment>
                  ))
                : renderButton(rightButton)}
            </div>
          </div>
          <AnimatePresence>
            {showRightButtonMenu && rightButtonMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={onCloseRightButtonMenu} />
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-4 top-full mt-1 bg-card border border-border-main/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  {rightButtonMenu}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </header>
      )}
      
      <main className={cn("flex-1 w-full mx-auto", className)}>
        {children}
      </main>
    </div>
  );
}
