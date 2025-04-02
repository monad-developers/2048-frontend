// Hooks
import { useState } from "react";
import { useConnect } from "thirdweb/react";

// UI
import FunPurpleButton from "./FunPurpleButton"


// Utils
import { client } from "@/utils/client";
import { inAppWallet } from "thirdweb/wallets";
import { hasStoredPasskey } from "thirdweb/wallets/in-app";

type LoginButtonProps = {
    initFn: () => void;
}

export default function LoginButton({ initFn }: LoginButtonProps) {
    const { connect } = useConnect()
      
    const [loginLoading, setLoginLoading] = useState(false);
    
    const handleLogin = async () => {
        setLoginLoading(true);
    
        try {
            await connect(async () => {
                const wallet = inAppWallet({
                    auth: {
                        options: ["passkey"],
                    },
                });
                const hasPasskey = await hasStoredPasskey(client);
                await wallet.connect({
                    client,
                    strategy: "passkey",
                    type: hasPasskey ? "sign-in" : "sign-up",
                });
                return wallet;
            });

            initFn();

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