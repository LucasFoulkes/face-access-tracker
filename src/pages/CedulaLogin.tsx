import OTPLogin from "@/components/OTPLogin";

function CedulaLogin() {
    return <OTPLogin maxLength={11} fieldType="cedula" />;
}

export default CedulaLogin;
