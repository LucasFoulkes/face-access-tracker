import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

function HomePage() {
    const navigate = useNavigate();

    function loginButton(text: string, route: string) {
        return (
            <Button
                className='size-48 uppercase text-xl'
                onClick={() => navigate(route)}
                variant='outline'
            >
                {text}
            </Button>
        )
    }

    return (
        <div className="flex flex-row gap-16">
            {loginButton("facial", "/facial")}
            {loginButton("pin", "/pin")}
            {loginButton("cedula", "/cedula")}
        </div>
    )
}

export default HomePage;
