import OTPLogin from "@/components/OTPLogin";

function CedulaLogin() {
    return <OTPLogin maxLength={10} fieldType="cedula" />;
}

export default CedulaLogin;
