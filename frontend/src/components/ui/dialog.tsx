import * as React from "react"

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && onOpenChange) {
        onOpenChange(false);
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange && onOpenChange(false)}
      />
      <div className="relative z-50 w-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 ${className || ''}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`mb-4 ${className || ''}`} {...props}>
      {children}
    </div>
  );
};

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={`text-lg font-semibold text-gray-900 dark:text-white ${className || ''}`}
        {...props}
      >
        {children}
      </h2>
    );
  }
);
DialogTitle.displayName = "DialogTitle";

const DialogFooter = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`flex justify-end space-x-2 ${className || ''}`} {...props}>
      {children}
    </div>
  );
};

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter };

