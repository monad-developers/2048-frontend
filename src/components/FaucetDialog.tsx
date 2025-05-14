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
import { Copy, ArrowDownLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { publicClient } from "@/utils/client";
import { formatEther, Hex } from "viem";
import { post } from "@/utils/fetch";

export type FaucetDialogProps = {
    isOpen: boolean;
    resyncGame: () => Promise<void>;
    setIsOpen: (open: boolean) => void;
};
export function FaucetDialog({
    isOpen,
    setIsOpen,
    resyncGame,
}: FaucetDialogProps) {
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

    const handleClose = async () => {
        await resyncGame();
        setIsOpen(false);
    };

    const handleFaucetRequest = async () => {
        if (!user || !user.wallet) {
            toast.error("Please log-in.");
            return;
        }

        if (parseFloat(formatEther(balance)) >= 0.5) {
            toast.error("Balance already more than 0.5 MON.");
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

            toast.success(`Player funded!`);

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
        if (!isOpen) return;
        handleFaucetRequest();
    }, [user, isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        setupUser();
    }, [user, isOpen]);

    const abbreviatedAddress = address
        ? `${address.slice(0, 4)}...${address.slice(-2)}`
        : "";

    const copyToClipboard = async () => {
        if (user?.wallet?.address) {
            await navigator.clipboard.writeText(address);
            toast.info("Copied to clipboard.");
        }
    };

    const alreadyFunded = parseFloat(formatEther(balance)) >= 0.5;

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent className="bg-yellow-600 w-[95vw] max-w-md sm:max-w-lg rounded-lg px-4 py-6 overflow-y-auto max-h-[90vh]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-black">
                        You need at least 0.1 MON to play moves.
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="flex flex-col gap-3 text-sm sm:text-base text-gray-800">
                            <div className="flex items-center justify-center gap-2 text-purple-800 break-all">
                                <span className="text-gray-800 font-bold">
                                    Player
                                </span>
                                : {abbreviatedAddress}
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
                                <span className="text-gray-800 font-bold">
                                    Balance
                                </span>
                                : {formatEther(balance)} MON
                            </div>
                            <p>
                                Fund your player address with testnet MON
                                directly via your external wallet, or get 0.5
                                MON from the game faucet.
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel
                        disabled={!alreadyFunded}
                        onClick={handleClose}
                        className="bg-blue-500 text-white hover:bg-blue-600"
                    >
                        Resume
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <Button
                            className="outline outline-white bg-purple-600 text-white hover:bg-purple-700"
                            onClick={handleFaucetRequest}
                            disabled={loading || alreadyFunded}
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : null}
                            {loading ? (
                                "Funding..."
                            ) : (
                                <div className="flex gap-2">
                                    {alreadyFunded ? (
                                        <p>Already funded</p>
                                    ) : (
                                        <p>Fund via game faucet</p>
                                    )}
                                    <ArrowDownLeft />
                                </div>
                            )}
                        </Button>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
