// Hooks
import { useState } from "react";
import { useLogin, useLogout, usePrivy } from "@privy-io/react-auth";

// UI
import { toast } from "sonner";
import FunPurpleButton from "./FunPurpleButton";
import { Button } from "./ui/button";
import { Copy } from "lucide-react";

type LoginButtonProps = {
    resetGame: () => void;
};

export default function LoginButton({ resetGame }: LoginButtonProps) {
    const { login } = useLogin();
    const { logout } = useLogout();
    const { user, authenticated } = usePrivy();

    const [loginLoading, setLoginLoading] = useState(false);

    const handleLogin = async () => {
        setLoginLoading(true);

        try {
            login();
            setLoginLoading(false);
        } catch (err) {
            console.log("Problem logging in: ", err);
            setLoginLoading(false);
        }
    };

    const copyToClipboard = async () => {
        if (user?.wallet?.address) {
            await navigator.clipboard.writeText(user.wallet.address);
            toast.info("Copied to clipboard.");
        }
    };

    const abbreviatedAddress = user?.wallet?.address
        ? `${user.wallet.address.slice(0, 4)}...${user.wallet.address.slice(
              -2
          )}`
        : "";

    return (
        <>
            {user && authenticated ? (
                <div className="flex flex-col items-center">
                    <FunPurpleButton text="New Game" onClick={resetGame} />
                    <Button
                        variant="ghost"
                        className="underline"
                        onClick={logout}
                    >
                        Logout
                    </Button>
                    <div className="flex items-center gap-2">
                        <p>
                            <span className="font-bold">Player</span>:{" "}
                            {abbreviatedAddress}
                        </p>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-1"
                            onClick={copyToClipboard}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
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
