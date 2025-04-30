import { Copy } from "lucide-react";
import { useLogout, usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import FunPurpleButton from "./FunPurpleButton";
import { toast } from "sonner";
import { useEffect, useState } from "react";

type NewGameButtonProps = {
    resetGame: () => void;
};

export default function NewGameButton({ resetGame }: NewGameButtonProps) {
    const { user } = usePrivy();
    const { logout } = useLogout();

    const [smartWalletAddress, setSmartWalletAddress] = useState("");
    useEffect(() => {
        if (!user) {
            return;
        }

        const userSmartWallet = user.linkedAccounts.find(
            (account) => account.type === "smart_wallet"
        );

        if (!userSmartWallet) {
            return;
        }

        setSmartWalletAddress(userSmartWallet.address);
    }, [user]);

    const copyToClipboard = async () => {
        if (user) {
            const userSmartWallet = user.linkedAccounts.find(
                (account) => account.type === "smart_wallet"
            );
            if (!userSmartWallet) {
                throw new Error("Privy smart wallet not detected");
            }
            await navigator.clipboard.writeText(userSmartWallet.address);
            toast.info("Copied to clipboard.");
        }
    };

    const abbreviatedAddress = smartWalletAddress
        ? `${smartWalletAddress.slice(0, 4)}...${smartWalletAddress.slice(-2)}`
        : "";

    return (
        user?.wallet && (
            <div className="flex flex-col items-center">
                <FunPurpleButton text="New Game" onClick={resetGame} />
                <Button variant="ghost" className="underline" onClick={logout}>
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
        )
    );
}
