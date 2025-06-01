import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

function HomePage() {
    const navigate = useNavigate();

    function loginButton(text: string, route: string) {
        return (
            <Button
                className='w-40 h-40 uppercase text-lg p-0'
                size="lg"
                onClick={() => navigate(route)}
            >
                {text}
            </Button>
        )
    }

    return (
        <div className="flex flex-col gap-4 items-center justify-center min-h-screen">
            <div className="flex flex-row gap-4">
                {loginButton("facial", "/facial")}
                {loginButton("pin", "/pin")}
                {loginButton("cedula", "/cedula")}
            </div>
        </div>
    )
}

export default HomePage;
