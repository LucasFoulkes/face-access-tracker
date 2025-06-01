import OTPLogin from "@/components/OTPLogin";

function PinLogin() {
    return <OTPLogin maxLength={4} fieldType="pin" />;
}

export default PinLogin;
