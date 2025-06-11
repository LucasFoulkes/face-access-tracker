import { useState, useEffect } from 'react';

/**
 * Hook to detect viewport size and orientation
 * @returns An object with viewport information
 */
export function useViewport() {
    const [width, setWidth] = useState(window.innerWidth);
    const [height, setHeight] = useState(window.innerHeight);
    const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setWidth(window.innerWidth);
            setHeight(window.innerHeight);
            setIsLandscape(window.innerWidth > window.innerHeight);
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return { width, height, isLandscape, isMobile };
}
