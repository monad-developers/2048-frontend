import {
	useLogin,
	useLogout,
	usePrivy,
	type WalletWithMetadata,
} from "@privy-io/react-auth";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import FunPurpleButton from "./FunPurpleButton";
import { Button } from "./ui/button";

type LoginButtonProps = {
	resetGame: () => void;
};

export default function LoginButton({ resetGame }: LoginButtonProps) {
	const { login } = useLogin();
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

	if (user && authenticated) {
		return <FunPurpleButton text="New Game" onClick={resetGame} />;
	}

	return (
		<FunPurpleButton
			text="Login"
			loadingText="Creating player..."
			isLoading={loginLoading}
			onClick={() => handleLogin()}
		/>
	);
}

export function PlayerInfo() {
	const { logout } = useLogout();
	const { user } = usePrivy();

	const [address, setAddress] = useState("");
	useEffect(() => {
		if (!user) {
			setAddress("");
			return;
		}

		const [privyUser] = user.linkedAccounts.filter(
			(account): account is WalletWithMetadata =>
				account.type === "wallet" && account.walletClientType === "privy",
		);
		if (!privyUser || !privyUser.address) {
			setAddress("");
			return;
		}

		setAddress(privyUser.address);
	}, [user]);

	const copyToClipboard = async () => {
		if (address) {
			await navigator.clipboard.writeText(address);
			toast.info("Copied to clipboard.");
		}
	};

	const abbreviatedAddress = address
		? `${address.slice(0, 4)}...${address.slice(-2)}`
		: "";

	return (
		<div className="flex items-center gap-1 whitespace-nowrap">
			<span>
				<span className="font-bold">Player</span>:
			</span>{" "}
			{abbreviatedAddress}
			<Button
				variant="ghost"
				size="icon"
				className="h-6 w-6 p-0.5"
				onClick={copyToClipboard}
			>
				<Copy className="h-3.5 w-3.5" />
			</Button>
			<span className="text-gray-400 mx-1">|</span>
			<Button
				variant="ghost"
				className="underline text-sm p-0 h-auto"
				onClick={logout}
			>
				Logout
			</Button>
		</div>
	);
}
