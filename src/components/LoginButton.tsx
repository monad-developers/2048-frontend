// Hooks
import { useState } from "react";
import { useLogin } from "@privy-io/react-auth";

// UI
import FunPurpleButton from "./FunPurpleButton"

type LoginButtonProps = {
    initFn: () => void;
}

export default function LoginButton({ initFn }: LoginButtonProps) {
    const { login } = useLogin();
      
    const [loginLoading, setLoginLoading] = useState(false);
    
    const handleLogin = async () => {
        setLoginLoading(true);
    
        try {
            initFn();
            login()

            setLoginLoading(false);
          
        } catch(err) {
            console.log("Problem logging in: ", err);
            setLoginLoading(false);
        }
    };

    return (
        <FunPurpleButton text="Sign-in to play" loadingText="Creating player..." isLoading={loginLoading} onClick={handleLogin} />
    )
}