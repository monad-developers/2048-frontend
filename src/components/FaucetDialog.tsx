import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { publicClient } from "@/utils/client";
import { formatEther, Hex } from "viem";

export type FaucetDialogProps = {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
};
export function FaucetDialog({ isOpen, setIsOpen }: FaucetDialogProps) {
    const { user } = usePrivy();

    const [address, setAddress] = useState("");
    const [balance, setBalance] = useState(0n);

    useEffect(() => {
        async function setupUser() {
            if (!user) {
                return;
            }

            if (!user.wallet) {
                return;
            }

            const bal = await publicClient.getBalance({
                address: user.wallet.address as Hex,
            });

            setAddress(user.wallet.address);
            setBalance(bal);
        }
        setupUser();
    }, [user, isOpen]);

    const copyToClipboard = async () => {
        if (user?.wallet?.address) {
            await navigator.clipboard.writeText(user.wallet.address);
            toast.info("Copied to clipboard.");
        }
    };

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent className="bg-yellow-600">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-black">
                        You need testnet MON to play the game.
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <p className="text-purple-800">
                                    <span className="text-gray-800">
                                        Player
                                    </span>
                                    : {address}
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
                            <p className="text-purple-800">
                                <span className="text-gray-800">Balance</span>:{" "}
                                {formatEther(balance)} MON
                            </p>
                            <p className="text-gray-800 my-2">
                                Copy your player address and fund it with
                                testnet MON. Then, re-sync and resume your game.
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={() => setIsOpen(false)}
                        className="bg-red-600 text-white"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction>
                        <Button
                            className="outline outline-white bg-purple-600 text-white"
                            onClick={() =>
                                window.open(
                                    `https://faucet.monad.xyz`,
                                    "_blank",
                                    "noopener,noreferrer"
                                )
                            }
                        >
                            <div className="flex items-center gap-1 p-1">
                                <p>Faucet</p>
                                <ExternalLink className="w-4 h-4" />
                            </div>
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
