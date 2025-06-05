import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyIndicator } from "@/components/KeyIndicator";
import { useEffect } from "react";

function FaceRegistration() {
    const navigate = useNavigate();
    const { state } = useLocation();

    // Redirect if no face descriptor is provided
    useEffect(() => {
        if (!state?.faceDescriptor) {
            console.error("No face descriptor provided, redirecting to facial login");
            navigate("/facial");
        }
    }, [state, navigate]);

    const buttons = [
        { text: "pin", route: "/pin", key: "1" },
        { text: "cedula", route: "/cedula", key: "2" }
    ];

    const keyboard = useKeyboardShortcuts({
        shortcuts: [
            ...buttons.map(button => ({
                key: button.key,
                action: () => handleAuthMethodSelection(button.route.substring(1) as 'pin' | 'cedula')
            })),
            { key: 'Enter', action: () => navigate("/facial") } // Back to facial login
        ]
    });

    const handleAuthMethodSelection = (authMethod: 'pin' | 'cedula') => {
        // Navigate to OTP login with face registration data
        navigate(`/${authMethod}`, {
            state: {
                faceDescriptor: state?.faceDescriptor,
                isRegistration: true
            }
        });
    };

    function loginButton(text: string, authMethod: 'pin' | 'cedula', keyNumber: string) {
        return (
            <KeyIndicator
                keyLabel={keyNumber}
                isPressed={keyboard.isPressed(keyNumber)}
                color="black"
            >
                <Button
                    className="size-48 uppercase text-xl"
                    onClick={() => handleAuthMethodSelection(authMethod)}
                    variant='outline'
                >
                    {text}
                </Button>
            </KeyIndicator>
        );
    }

    // Don't render if no face descriptor
    if (!state?.faceDescriptor) {
        return null;
    }

    return (
        <div className="flex flex-col gap-8 items-center justify-center min-h-screen">
            <div
                ref={keyboard.containerRef}
                className="flex flex-row gap-16"
                tabIndex={0}
                style={{ outline: 'none' }}
            >                {buttons.map((button) =>
                loginButton(button.text, button.route.substring(1) as 'pin' | 'cedula', button.key)
            )}
            </div>

            {/* Back button */}
            <KeyIndicator
                keyLabel="⏎"
                isPressed={keyboard.isPressed('Enter')}
                color='black'
                position="top-right"
            >
                <Button
                    className="uppercase text-xl !p-4 !px-12 !h-auto bg-amber-500 hover:bg-amber-600"
                    onClick={() => navigate("/facial")}
                >
                    regresar
                </Button>
            </KeyIndicator>
        </div>
    );
}

export default FaceRegistration;
