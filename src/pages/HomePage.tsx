import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyIndicator } from "@/components/KeyIndicator";

function HomePage() {
    const navigate = useNavigate();

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

    function loginButton(text: string, route: string, keyNumber: string) {
        return (
            <KeyIndicator
                keyLabel={keyNumber}
                isPressed={keyboard.isPressed(keyNumber)}
                color="black" // White background for better contrast on dark outline buttons
            >
                <Button
                    className="size-48 uppercase text-xl"
                    onClick={() => navigate(route)}
                    variant='outline'
                >
                    {text}
                </Button>
            </KeyIndicator>
        );
    }

    return (
        <div
            ref={keyboard.containerRef}
            className="flex flex-row gap-16"
            tabIndex={0}
            style={{ outline: 'none' }}
        >
            {buttons.map((button) => (
                <div key={button.key}>
                    {loginButton(button.text, button.route, button.key)}
                </div>
            ))}        </div>)
}

export default HomePage;
