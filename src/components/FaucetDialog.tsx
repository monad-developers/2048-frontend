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
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { publicClient } from "@/utils/client";
import { formatEther, Hex } from "viem";
import { post } from "@/utils/fetch";

export type FaucetDialogProps = {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
};
export function FaucetDialog({ isOpen, setIsOpen }: FaucetDialogProps) {
    const { user } = usePrivy();

    const [address, setAddress] = useState("");
    const [balance, setBalance] = useState(0n);
    const [loading, setLoading] = useState(false);

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

    const handleFaucetRequest = async () => {
        if (!user || !user.wallet) {
            toast.error("Please log-in.");
            return;
        }

        if (parseFloat(formatEther(balance)) >= 0.01) {
            toast.error("Balance already more than 0.01 MON.");
            return;
        }

        setLoading(true);

        try {
            const response = await post({
                url: import.meta.env.VITE_2048_FAUCET_URL,
                params: {
                    address: user.wallet.address,
                },
            });

            const transactionHash = response.txHash;
            console.log("Funded tx: ", transactionHash);

            toast.success(`"Player funded!`);

            await setupUser();
        } catch (e) {
            console.log("Error fetching testnet MON: ", e);
            toast.error(`Failed to send transaction.`, {
                description: `Error: ${(e as Error).message}`,
            });
        }

        setLoading(false);
    };

    useEffect(() => {
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
                        You need at least 0.1 MON to play a few moves.
                    </AlertDialogTitle>
                    {/*
                      Add `asChild` to AlertDialogDescription.
                      This prevents it from rendering its own <p> tag.
                      Instead, it merges its props onto the direct child (the <div>).
                      Now, the inner <div> elements are valid descendants of the outer <div>.
                    */}
                    <AlertDialogDescription asChild>
                        <div className="flex flex-col">
                            {" "}
                            {/* This div now receives props from AlertDialogDescription */}
                            <div className="flex items-center gap-2">
                                <div className="text-purple-800">
                                    {" "}
                                    {/* Keep inner elements as div */}
                                    <span className="text-gray-800">
                                        Player
                                    </span>
                                    : {address}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 p-1"
                                    onClick={copyToClipboard}
                                    aria-label="Copy player address"
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="text-purple-800">
                                {" "}
                                {/* Keep inner elements as div */}
                                <span className="text-gray-800">
                                    Balance
                                </span>: {formatEther(balance)} MON
                            </div>
                            <div className="text-gray-800 my-2">
                                {" "}
                                {/* Keep inner elements as div */}
                                Fund your player address with testnet MON. Then,
                                re-sync and resume your game.
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={() => setIsOpen(false)}
                        className="bg-red-600 text-white hover:bg-red-700"
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button
                            className="outline outline-white bg-purple-600 text-white hover:bg-purple-700"
                            onClick={handleFaucetRequest}
                            // disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : null}
                            {loading ? "Funding..." : "Fund"}
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
