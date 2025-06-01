import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

interface OTPLoginProps {
    maxLength: number;
    fieldType: 'cedula' | 'pin';
}

function OTPLogin({ maxLength, fieldType }: OTPLoginProps) {
    const navigate = useNavigate();
    const [value, setValue] = useState("");

    // Query the database to find a user with the matching field value
    const matchingUser = useLiveQuery(
        async () => {
            if (value.length === maxLength) {
                const user = await db.usuarios
                    .where(fieldType)
                    .equals(value)
                    .first();
                return user;
            }
            return null;
        },
        [value, fieldType, maxLength]
    );    // Update validation status when user is found
    useEffect(() => {
        // Auto-navigate if correct input (reached max length and found match)
        if (value.length === maxLength && matchingUser) {
            navigate("/confirmation", {
                state: {
                    userId: matchingUser.id,
                    authMethod: fieldType,
                    authValue: value
                }
            });
        }

        // Auto-clear if wrong input (reached max length but no match)
        if (value.length === maxLength && !matchingUser) {
            const timer = setTimeout(() => {
                setValue("");
            }, 1000); // Clear after 1 second

            return () => clearTimeout(timer);
        }
    }, [matchingUser, value.length, maxLength, navigate, fieldType, value]);

    const handleButtonClick = () => {
        if (value.length > 0) {
            // Just clear the input
            setValue("");
        } else {
            navigate("/");
        }
    };

    const getButtonText = () => {
        if (value.length === 0) return "regresar";
        return "borrar";
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="inline-flex gap-4 flex-col items-center">
                <InputOTP maxLength={maxLength} value={value} onChange={setValue}>
                    <InputOTPGroup>
                        {[...Array(maxLength)].map((_, i) => (
                            <InputOTPSlot key={i} index={i} />
                        ))}                    </InputOTPGroup>
                </InputOTP>
                <Button
                    className="uppercase w-full min-w-0"
                    style={{ width: 'min(100%, 10rem)' }}
                    onClick={handleButtonClick}
                >
                    {getButtonText()}
                </Button>
            </div>
        </div>
    );
}

export default OTPLogin;
