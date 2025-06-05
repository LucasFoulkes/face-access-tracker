import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyIndicator } from "@/components/KeyIndicator";

interface OTPLoginProps {
    maxLength: number;
    fieldType: 'cedula' | 'pin';
}

function OTPLogin({ maxLength, fieldType }: OTPLoginProps) {
    const navigate = useNavigate();
    const { state } = useLocation();
    const [value, setValue] = useState("");

    // Check if this is a face registration flow
    const isRegistration = state?.isRegistration;
    const faceDescriptor = state?.faceDescriptor;

    // Query matching user when input is complete
    const matchingUser = useLiveQuery(
        async () => value.length === maxLength
            ? await db.usuarios.where(fieldType).equals(value).first()
            : null,
        [value, fieldType, maxLength]
    );    // Keyboard shortcuts
    const keyboard = useKeyboardShortcuts({
        shortcuts: [
            {
                key: 'Enter',
                action: () => value.length > 0
                    ? setValue("")
                    : navigate(isRegistration ? "/face-registration" : "/",
                        isRegistration ? { state: { faceDescriptor } } : undefined)
            }
        ],
        focusSelectors: ['[data-slot="input-otp"] input', 'input[inputmode="numeric"]', 'input[type="text"]'],
        focusDelay: 200
    });// Handle auto-navigation and auto-clear
    useEffect(() => {
        if (value.length !== maxLength) return;

        if (matchingUser) {
            if (isRegistration && faceDescriptor) {
                // Face registration flow - navigate to confirmation with face registration data
                navigate("/confirmation", {
                    state: {
                        userId: matchingUser.id,
                        authMethod: fieldType,
                        authValue: value,
                        faceDescriptor: faceDescriptor,
                        isRegistration: true
                    }
                });
            } else {
                // Normal login flow
                navigate("/confirmation", {
                    state: {
                        userId: matchingUser.id,
                        authMethod: fieldType,
                        authValue: value
                    }
                });
            }
        } else {
            // No matching user found - clear input after delay
            setTimeout(() => setValue(""), 1000);
        }
    }, [matchingUser, value.length, maxLength, navigate, fieldType, value, isRegistration, faceDescriptor]);

    return (
        <div
            ref={keyboard.containerRef}
            className="flex items-center justify-center min-h-screen"
            tabIndex={0}
            style={{ outline: 'none' }}>
            <div className="inline-flex gap-4 flex-col items-center">
                <InputOTP maxLength={maxLength} value={value} onChange={setValue}>
                    <InputOTPGroup>
                        {Array.from({ length: maxLength }, (_, i) => (
                            <InputOTPSlot
                                key={i}
                                index={i}
                                className="size-16 text-2xl"
                            />
                        ))}
                    </InputOTPGroup>
                </InputOTP>
                <KeyIndicator
                    keyLabel="⏎"
                    isPressed={keyboard.isPressed('Enter')}
                    color='black'
                    position="top-right">                    <Button
                        className={`uppercase text-2xl !p-4 !h-auto ${value.length === 0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(maxLength, 5) * 64}px` }}
                        onClick={() => value.length > 0
                            ? setValue("")
                            : navigate(isRegistration ? "/face-registration" : "/",
                                isRegistration ? { state: { faceDescriptor } } : undefined)}>
                        {value.length === 0 ? "regresar" : "borrar"}
                    </Button>
                </KeyIndicator>
            </div>
        </div>
    );
}

export default OTPLogin;
