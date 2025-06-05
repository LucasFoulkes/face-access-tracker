import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyIndicator } from "@/components/KeyIndicator";
import Webcam from "react-webcam";

function FacialLogin() {
    const navigate = useNavigate();

    // Keyboard shortcuts
    const keyboard = useKeyboardShortcuts({
        shortcuts: [
            {
                key: 'Enter',
                action: () => navigate("/")
            }
        ]
    });

    return (
        <div
            ref={keyboard.containerRef}
            className="flex flex-col gap-4 items-center justify-center min-h-screen"
            tabIndex={0}
            style={{ outline: 'none' }}>
            <Webcam
                audio={false}
                screenshotFormat="image/jpeg"
                className="rounded-lg"
                style={{ transform: "scaleX(-1)" }}
            />

            <KeyIndicator
                keyLabel="⏎"
                isPressed={keyboard.isPressed('Enter')}
                color='black'
                position="top-right">
                <Button
                    className="uppercase text-2xl !p-4 !px-12 !h-auto bg-amber-500 hover:bg-amber-600"
                    onClick={() => navigate("/")}>
                    regresar
                </Button>
            </KeyIndicator>
        </div>
    );
}
export default FacialLogin;