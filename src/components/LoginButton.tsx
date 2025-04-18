// Hooks
import { useState } from "react";
import { useLogin, useLogout, usePrivy } from "@privy-io/react-auth";

// UI
import FunPurpleButton from "./FunPurpleButton";

type LoginButtonProps = {
    initFn?: () => void;
};

export default function LoginButton({ initFn }: LoginButtonProps) {
    const { login } = useLogin();
    const { logout } = useLogout();

    const { user, authenticated } = usePrivy();

    const [loginLoading, setLoginLoading] = useState(false);

    const handleLogin = async () => {
        setLoginLoading(true);

        try {
            if (initFn) {
                initFn();
            }
            login();

            setLoginLoading(false);
        } catch (err) {
            console.log("Problem logging in: ", err);
            setLoginLoading(false);
        }
    };

    return (
        <>
            {user && authenticated ? (
                <FunPurpleButton text="Logout" onClick={logout} />
            ) : (
                <FunPurpleButton
                    text="Login"
                    loadingText="Creating player..."
                    isLoading={loginLoading}
                    onClick={handleLogin}
                />
            )}
        </>
    );
}
