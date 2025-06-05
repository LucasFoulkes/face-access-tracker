import type { ReactNode } from "react";

interface KeyIndicatorProps {
    children: ReactNode;
    keyLabel: string;
    isPressed?: boolean;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    variant?: 'default' | 'small';
    color?: 'primary' | 'secondary' | 'accent' | 'destructive' | 'white' | 'black' | 'blue' | 'green' | 'red' | 'yellow';
}

const positionClasses = {
    'top-left': 'top-1 left-1',
    'top-right': 'top-1 right-1',
    'bottom-left': 'bottom-1 left-1',
    'bottom-right': 'bottom-1 right-1'
};

const variantClasses = {
    'default': 'w-6 h-6 text-sm',
    'small': 'w-5 h-5 text-xs'
};

const colorClasses = {
    'primary': 'bg-primary text-primary-foreground',
    'secondary': 'bg-secondary text-secondary-foreground',
    'accent': 'bg-accent text-accent-foreground',
    'destructive': 'bg-destructive text-destructive-foreground',
    'white': 'bg-white text-black border border-gray-300',
    'black': 'bg-black text-white',
    'blue': 'bg-blue-500 text-white',
    'green': 'bg-green-500 text-white',
    'red': 'bg-red-500 text-white',
    'yellow': 'bg-yellow-500 text-black'
};

export function KeyIndicator({
    children,
    keyLabel,
    isPressed = false,
    position = 'top-left',
    variant = 'default',
    color = 'primary'
}: KeyIndicatorProps) {
    return (
        <div className={`relative transition-all duration-150 ${isPressed ? 'scale-95 bg-primary/80' : ''}`}>
            {/* Key indicator badge */}
            <div className={`
                absolute ${positionClasses[position]} ${variantClasses[variant]}
                ${colorClasses[color]} rounded font-bold 
                flex items-center justify-center z-10
            `}>
                {keyLabel}
            </div>
            {children}
        </div>
    );
}
