import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyIndicator } from "@/components/KeyIndicator";
import { useEffect, useState } from "react";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";

function HomePage() {
    const navigate = useNavigate();
    const [isLandscape, setIsLandscape] = useState(false);
    const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

    const buttons = [
        { text: "facial", route: "/facial", key: "1" },
        { text: "pin", route: "/pin", key: "2" },
        { text: "cedula", route: "/cedula", key: "3" }
    ];

    const keyboard = useKeyboardShortcuts({
        shortcuts: buttons.map(button => ({
            key: button.key,
            action: () => navigate(button.route)
        }))
    });

    // Update screen orientation and size on mount and when window is resized
    useEffect(() => {
        const handleResize = () => {
            setIsLandscape(window.innerWidth > window.innerHeight);
            setScreenSize({ width: window.innerWidth, height: window.innerHeight });
        };

        // Initial check
        handleResize();

        // Add event listener
        window.addEventListener("resize", handleResize);

        // Clean up
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    function loginButton(text: string, route: string, keyNumber: string) {
        // Calculate button size based on screen size and orientation
        const getButtonSize = () => {
            const smallScreen = screenSize.width < 640;
            const verySmallScreen = screenSize.width < 400;

            if (verySmallScreen) return "size-24 text-sm";
            if (smallScreen) return "size-32 text-base";
            if (isLandscape && screenSize.height < 600) return "size-32 text-base";
            return "size-48 text-xl";
        };

        return (
            <KeyIndicator
                keyLabel={keyNumber}
                isPressed={keyboard.isPressed(keyNumber)}
                color="black"
            >
                <Button
                    className={`${getButtonSize()} uppercase`}
                    onClick={() => navigate(route)}
                    variant='outline'
                >
                    {text}
                </Button>
            </KeyIndicator>
        );
    }

    return (
        <ResponsiveContainer>
            <div
                ref={keyboard.containerRef}
                className={`flex ${isLandscape ? "flex-row" : "flex-col sm:flex-row"} gap-4 sm:gap-8 md:gap-16 portrait-preferred justify-center items-center`}
                tabIndex={0}
                style={{ outline: 'none' }}
            >
                {buttons.map((button) => (
                    <div key={button.key}>
                        {loginButton(button.text, button.route, button.key)}
                    </div>
                ))}
            </div>        </ResponsiveContainer>
    );
}

export default HomePage;
