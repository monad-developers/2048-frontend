import { useState } from "react";
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
import { type Network, useNetwork } from "@/contexts/NetworkContext";

type NetworkToggleProps = {
	hasActiveGame: boolean;
	onNetworkChange?: () => void;
};

export default function NetworkToggle({
	hasActiveGame,
	onNetworkChange,
}: NetworkToggleProps) {
	const { network, setNetwork } = useNetwork();
	const [pendingNetwork, setPendingNetwork] = useState<Network | null>(null);

	const handleToggle = (newNetwork: Network) => {
		if (newNetwork === network) return;

		if (hasActiveGame) {
			setPendingNetwork(newNetwork);
		} else {
			setNetwork(newNetwork);
			onNetworkChange?.();
		}
	};

	const confirmSwitch = () => {
		if (pendingNetwork) {
			setNetwork(pendingNetwork);
			onNetworkChange?.();
			setPendingNetwork(null);
		}
	};

	return (
		<>
			<div className="relative flex">
				<button
					type="button"
					onClick={() => handleToggle("testnet")}
					className={`
						relative
						px-4 py-3
						font-bold text-sm
						rounded-l-xl
						transition-all duration-150
						${
							network === "testnet"
								? `bg-purple-600 text-white
									 shadow-[0_6px_0_rgb(107,33,168)]
									 before:absolute before:content-[''] before:inset-0
									 before:bg-white/20 before:rounded-l-xl`
								: `bg-gray-200 text-gray-600
									 shadow-[0_6px_0_rgb(156,163,175)]
									 hover:bg-gray-300`
						}
					`}
				>
					Testnet
				</button>
				<button
					type="button"
					onClick={() => handleToggle("mainnet")}
					className={`
						relative
						px-4 py-3
						font-bold text-sm
						rounded-r-xl
						transition-all duration-150
						${
							network === "mainnet"
								? `bg-purple-600 text-white
									 shadow-[0_6px_0_rgb(107,33,168)]
									 before:absolute before:content-[''] before:inset-0
									 before:bg-white/20 before:rounded-r-xl`
								: `bg-gray-200 text-gray-600
									 shadow-[0_6px_0_rgb(156,163,175)]
									 hover:bg-gray-300`
						}
					`}
				>
					Mainnet
				</button>
			</div>

			<AlertDialog
				open={pendingNetwork !== null}
				onOpenChange={(open) => !open && setPendingNetwork(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Switch Network?</AlertDialogTitle>
						<AlertDialogDescription>
							Switching networks will end your current game. Your progress on
							this network will not be saved.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmSwitch}
							className="bg-purple-600 hover:bg-purple-700"
						>
							Switch to {pendingNetwork === "mainnet" ? "Mainnet" : "Testnet"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
