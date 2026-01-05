import { usePrivy } from "@privy-io/react-auth";
import { ArrowUpRight, Copy, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatEther, type Hex } from "viem";
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
import { testnetPublicClient } from "@/utils/client";
import { Button } from "./ui/button";

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
	const [resumeLoading, setResumeLoading] = useState(false);
	const [refreshingBalance, setRefreshingBalance] = useState(false);

	async function setupUser() {
		if (!user) {
			setAddress("");
			setBalance(0n);
			return;
		}

		const [privyUser] = user.linkedAccounts.filter(
			(account) =>
				account.type === "wallet" && account.walletClientType === "privy",
		);
		if (!privyUser || !(privyUser as any).address) {
			setAddress("");
			setBalance(0n);
			return;
		}
		const privyUserAddress = (privyUser as any).address;

		const bal = await testnetPublicClient.getBalance({
			address: privyUserAddress as Hex,
		});

		setAddress(privyUserAddress);
		setBalance(bal);
	}

	const handleClose = async () => {
		setResumeLoading(true);
		await resyncGame();
		setResumeLoading(false);
		setIsOpen(false);
	};

	const handleRefreshBalance = async () => {
		setRefreshingBalance(true);
		await setupUser();
		setRefreshingBalance(false);
	};

	useEffect(() => {
		if (!isOpen) return;
		setupUser();
	}, [user, isOpen]);

	const abbreviatedAddress = address
		? `${address.slice(0, 4)}...${address.slice(-2)}`
		: "";

	const copyToClipboard = async () => {
		if (address) {
			await navigator.clipboard.writeText(address);
			toast.info("Copied to clipboard.");
		}
	};

	const alreadyFunded = parseFloat(formatEther(balance)) >= 0.5;

	return (
		<AlertDialog open={isOpen}>
			<AlertDialogContent className="bg-yellow-600 w-[95vw] max-w-md sm:max-w-lg rounded-lg px-4 py-6 overflow-y-auto max-h-[90vh]">
				<AlertDialogHeader>
					<AlertDialogTitle className="text-black text-center">
						You need ~0.1 MON more to play moves.
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="flex flex-col gap-3 text-sm sm:text-base text-gray-800">
							<div className="flex items-center justify-center gap-2 text-purple-800 break-all">
								<span className="text-gray-800">
									{`Player: ${abbreviatedAddress}`}
								</span>

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
							<div className="text-purple-800 flex items-center justify-center gap-2">
								<span className="text-gray-800">Balance</span>:{" "}
								{formatEther(balance)} MON
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 p-1"
									onClick={handleRefreshBalance}
									disabled={refreshingBalance}
									aria-label="Refresh balance"
								>
									<RefreshCw className={`h-4 w-4 ${refreshingBalance ? "animate-spin" : ""}`} />
								</Button>
							</div>
							<p className="text-center">
								Fund your player address with testnet MON directly via your
								external wallet, or get 0.5 MON from the game faucet.
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
						{resumeLoading && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
						{!resumeLoading ? "Resume" : "Re-sycing..."}
					</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							className="outline outline-white bg-purple-600 text-white hover:bg-purple-700"
							disabled={alreadyFunded}
							asChild
						>
							<a
								href="https://faucet.monad.xyz"
								target="_blank"
								className="flex items-center"
								rel="noopener"
							>
								<p>Fund via faucet</p>
								<ArrowUpRight className="w-4 h-4 ml-1" />
							</a>
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
