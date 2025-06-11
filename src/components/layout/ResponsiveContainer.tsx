import React, { ReactNode } from 'react';

interface ResponsiveContainerProps {
    children: ReactNode;
    className?: string;
}

/**
 * A responsive container component that adapts to different screen sizes and orientations
 */
export function ResponsiveContainer({ children, className = '' }: ResponsiveContainerProps) {
    return (
        <div
            className={`
        w-full max-w-screen min-h-screen p-4
        flex flex-col items-center justify-center
        sm:p-6 md:p-8
        ${className}
      `}
        >
            <div className="w-full max-w-7xl mx-auto">
                {children}
            </div>
        </div>
    );
}
