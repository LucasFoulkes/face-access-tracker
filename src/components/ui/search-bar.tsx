import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import * as React from "react";

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    showClearButton?: boolean;
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
    ({ value, onChange, placeholder = "Buscar...", className, showClearButton = true }, ref) => {
        return (
            <div className={cn("relative w-full max-w-sm", className)}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                <Input
                    ref={ref}
                    type="text"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={cn(
                        "pl-9", // Space for search icon
                        showClearButton && value ? "pr-9" : "pr-3" // Space for clear button when needed
                    )}
                />
                {showClearButton && value && (
                    <button
                        onClick={() => onChange('')}
                        className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm z-10"
                        type="button"
                        tabIndex={-1}
                        aria-label="Limpiar búsqueda"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        );
    }
);

SearchBar.displayName = "SearchBar";

export { SearchBar };
