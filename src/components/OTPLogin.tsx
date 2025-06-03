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
    const [value, setValue] = useState("");    // Query the database to find a user with the matching field value
    const matchingUser = useLiveQuery(
        async () => {
            if (value.length === maxLength) {
                return await db.usuarios.where(fieldType).equals(value).first();
            }
            return null;
        },
        [value, fieldType, maxLength]
    );

    // Handle auto-navigation and auto-clear
    useEffect(() => {
        if (value.length !== maxLength) return;

        if (matchingUser) {
            navigate("/confirmation", {
                state: { userId: matchingUser.id, authMethod: fieldType, authValue: value }
            });
        } else {
            const timer = setTimeout(() => setValue(""), 1000);
            return () => clearTimeout(timer);
        }
    }, [matchingUser, value.length, maxLength, navigate, fieldType, value]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="inline-flex gap-4 flex-col items-center">
                <InputOTP maxLength={maxLength} value={value} onChange={setValue}>
                    <InputOTPGroup>
                        {[...Array(maxLength)].map((_, i) => (
                            <InputOTPSlot key={i} index={i} />
                        ))}
                    </InputOTPGroup>
                </InputOTP>
                <Button
                    className="uppercase w-full min-w-0"
                    style={{ width: 'min(100%, 10rem)' }}
                    onClick={() => value.length > 0 ? setValue("") : navigate("/")}
                >
                    {value.length === 0 ? "regresar" : "borrar"}
                </Button>
            </div>
        </div>
    );
}

export default OTPLogin;
