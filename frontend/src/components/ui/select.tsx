import * as React from "react"

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  value?: string;
  onValueChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLDivElement, { children: React.ReactNode; value?: string; onValueChange?: (value: string) => void }>(
  ({ children, value, onValueChange, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedValue, setSelectedValue] = React.useState(value || '');

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value);
      }
    }, [value]);

    const handleSelect = (val: string) => {
      setSelectedValue(val);
      if (onValueChange) {
        onValueChange(val);
      }
      setIsOpen(false);
    };

    return (
      <div ref={ref} className="relative" {...props}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              selectedValue,
              isOpen,
              setIsOpen,
              onSelect: handleSelect,
            });
          }
          return child;
        })}
      </div>
    );
  }
);
Select.displayName = "Select";

const SelectTrigger = React.forwardRef<HTMLButtonElement, { children: React.ReactNode; selectedValue?: string; isOpen?: boolean; setIsOpen?: (open: boolean) => void }>(
  ({ children, selectedValue, isOpen, setIsOpen, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => setIsOpen && setIsOpen(!isOpen)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...props}
      >
        <div className="flex-1 text-left flex items-center">
          {children}
        </div>
        <svg className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = React.forwardRef<HTMLSpanElement, { placeholder?: string; selectedValue?: string; children?: React.ReactNode }>(
  ({ placeholder, selectedValue, children }, ref) => {
    // If children are provided, use them (allows custom rendering)
    if (children) {
      return <span ref={ref}>{children}</span>;
    }
    // Otherwise, display the selected value or placeholder
    return <span ref={ref}>{selectedValue || placeholder}</span>;
  }
);
SelectValue.displayName = "SelectValue";

const SelectContent = React.forwardRef<HTMLDivElement, { children: React.ReactNode; isOpen?: boolean; onSelect?: (value: string) => void }>(
  ({ children, isOpen, onSelect, ...props }, ref) => {
    if (!isOpen) return null;

    return (
      <div
        ref={ref}
        className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg"
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as React.ReactElement<any>, {
              onSelect,
            });
          }
          return child;
        })}
      </div>
    );
  }
);
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<HTMLDivElement, { value: string; children: React.ReactNode; onSelect?: (value: string) => void }>(
  ({ value, children, onSelect, ...props }, ref) => {
    return (
      <div
        ref={ref}
        onClick={() => onSelect && onSelect(value)}
        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 dark:hover:bg-gray-700"
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectItem.displayName = "SelectItem";

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };

