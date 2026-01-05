import { usePrivy, useWallets } from "@privy-io/react-auth";
import { ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
	type Address,
	type Chain,
	createWalletClient,
	custom,
	encodeFunctionData,
	formatEther,
	type Hex,
	parseEther,
	type Transport,
	type WalletClient,
} from "viem";
import { Button } from "@/components/ui/button";
import { useNetwork } from "@/contexts/NetworkContext";
import { getEstimatedFees } from "@/utils/client";
import { GAME_CONTRACT_ADDRESS } from "@/utils/constants";
import { post } from "@/utils/fetch";

const TRANSACTION_TIMEOUT_MS = 10_000;

export function useTransactions() {
	const { user } = usePrivy();
	const { ready, wallets } = useWallets();
	const { network, chain, publicClient, explorerUrl, rpcUrl } = useNetwork();

	const userNonce = useRef(0);
	const userBalance = useRef(0n);
	const userAddress = useRef("");

	async function resetNonceAndBalance() {
		if (!user) {
			return;
		}
		const [privyUser] = user.linkedAccounts.filter(
			(account) =>
				account.type === "wallet" && account.walletClientType === "privy",
		);
		if (!privyUser || !(privyUser as any).address) {
			return;
		}
		const privyUserAddress = (privyUser as any).address;

		const nonce = await publicClient.getTransactionCount({
			address: privyUserAddress as Hex,
		});
		const balance = await publicClient.getBalance({
			address: privyUserAddress as Hex,
		});

		console.log("Setting nonce: ", nonce);
		console.log("Setting balance: ", balance.toString());

		userNonce.current = nonce;
		userBalance.current = balance;
		userAddress.current = privyUserAddress;
	}

	useEffect(() => {
		resetNonceAndBalance();
	}, [user, network]);

	const walletClient = useRef<WalletClient<Transport, Chain> | null>(null);
	useEffect(() => {
		async function getWalletClient() {
			if (!ready || !wallets) return;

			const userWallet = wallets.find((w) => w.walletClientType === "privy");
			if (!userWallet) return;

			await userWallet.switchChain(chain.id);

			const ethereumProvider = await userWallet.getEthereumProvider();
			const provider = createWalletClient({
				chain,
				transport: custom(ethereumProvider),
			});

			console.log("Setting provider for chain:", chain.id);
			walletClient.current = provider;
		}

		getWalletClient();
	}, [ready, wallets, chain]);

	async function sendRawTransactionAndConfirm({
		successText,
		gas,
		data,
		nonce,
	}: {
		successText?: string;
		gas: bigint;
		data: Hex;
		nonce: number;
	}) {
		let e: Error | null = null;

		try {
			const provider = walletClient.current;
			if (!provider) {
				throw Error("Wallet not found.");
			}
			const privyUserAddress = userAddress.current;
			if (!privyUserAddress) {
				throw Error("Privy user not found.");
			}

			const startTime = Date.now();
			const { maxFeePerGas, maxPriorityFeePerGas } = await getEstimatedFees(
				publicClient,
				network,
			);
			const signedTransaction = await provider.signTransaction({
				to: GAME_CONTRACT_ADDRESS[network],
				account: privyUserAddress as Address,
				data,
				nonce,
				gas,
				maxFeePerGas,
				maxPriorityFeePerGas,
			});

			const receipt = await post({
				url: rpcUrl,
				params: {
					id: 0,
					jsonrpc: "2.0",
					method: "eth_sendRawTransactionSync",
					params: [signedTransaction, TRANSACTION_TIMEOUT_MS],
				},
			});
			const time = Date.now() - startTime;

			if (receipt.status === "reverted") {
				console.log(`Failed confirmation in ${time} ms`);
				throw Error(
					`Failed to confirm transaction: ${receipt.transactionHash}`,
				);
			}

			console.log(
				`Transaction confirmed in ${time} ms: ${receipt.transactionHash}`,
			);
			toast.success(`Confirmed transaction.`, {
				description: `${successText} Time: ${time} ms`,
				action: (
					<Button
						className="outline outline-white"
						variant="ghost"
						onClick={() =>
							window.open(
								`${explorerUrl}/tx/${receipt.transactionHash}`,
								"_blank",
								"noopener,noreferrer",
							)
						}
					>
						<div className="flex items-center gap-1 p-1">
							<p>View</p>
							<ExternalLink className="w-4 h-4" />
						</div>
					</Button>
				),
			});
		} catch (error) {
			e = error as Error;

			toast.error(`Failed to send transaction.`, {
				description: `Error: ${e.message}`,
			});
		}

		if (e) {
			throw e;
		}
	}

	async function getLatestGameBoard(
		gameId: Hex,
	): Promise<
		readonly [
			readonly [
				number,
				number,
				number,
				number,
				number,
				number,
				number,
				number,
				number,
				number,
				number,
				number,
				number,
				number,
				number,
				number,
			],
			bigint,
		]
	> {
		const [latestBoard, nextMoveNumber] = await publicClient.readContract({
			address: GAME_CONTRACT_ADDRESS[network],
			abi: [
				{
					type: "function",
					name: "getBoard",
					inputs: [
						{
							name: "gameId",
							type: "bytes32",
							internalType: "bytes32",
						},
					],
					outputs: [
						{
							name: "boardArr",
							type: "uint8[16]",
							internalType: "uint8[16]",
						},
						{
							name: "nextMoveNumber",
							type: "uint256",
							internalType: "uint256",
						},
					],
					stateMutability: "view",
				},
			],
			functionName: "getBoard",
			args: [gameId],
		});

		return [latestBoard, nextMoveNumber];
	}

	async function initializeGameTransaction(
		gameId: Hex,
		boards: readonly [bigint, bigint, bigint, bigint],
		moves: readonly [number, number, number],
	): Promise<void> {
		const balance = userBalance.current;
		if (parseFloat(formatEther(balance)) < 0.01) {
			throw Error("Signer has insufficient balance.");
		}

		console.log("Starting game!");

		const nonce = userNonce.current;
		userNonce.current = nonce + 1;
		userBalance.current = balance - parseEther("0.0075");

		await sendRawTransactionAndConfirm({
			nonce: nonce,
			successText: "Started game!",
			gas: BigInt(150_000),
			data: encodeFunctionData({
				abi: [
					{
						type: "function",
						name: "startGame",
						inputs: [
							{
								name: "gameId",
								type: "bytes32",
								internalType: "bytes32",
							},
							{
								name: "boards",
								type: "uint128[4]",
								internalType: "uint128[4]",
							},
							{
								name: "moves",
								type: "uint8[3]",
								internalType: "uint8[3]",
							},
						],
						outputs: [],
						stateMutability: "nonpayable",
					},
				],
				functionName: "startGame",
				args: [gameId, boards, moves],
			}),
		});
	}

	async function playNewMoveTransaction(
		gameId: Hex,
		board: bigint,
		move: number,
		moveCount: number,
	): Promise<void> {
		console.log(`Playing move ${moveCount}!`);

		const balance = userBalance.current;
		if (parseFloat(formatEther(balance)) < 0.01) {
			throw Error("Signer has insufficient balance.");
		}

		const nonce = userNonce.current;
		userNonce.current = nonce + 1;
		userBalance.current = balance - parseEther("0.005");

		await sendRawTransactionAndConfirm({
			nonce,
			successText: `Played move ${moveCount}`,
			gas: BigInt(100_000),
			data: encodeFunctionData({
				abi: [
					{
						type: "function",
						name: "play",
						inputs: [
							{
								name: "gameId",
								type: "bytes32",
								internalType: "bytes32",
							},
							{
								name: "move",
								type: "uint8",
								internalType: "uint8",
							},
							{
								name: "resultBoard",
								type: "uint128",
								internalType: "uint128",
							},
						],
						outputs: [],
						stateMutability: "nonpayable",
					},
				],
				functionName: "play",
				args: [gameId, move, board],
			}),
		});
	}

	return {
		resetNonceAndBalance,
		initializeGameTransaction,
		playNewMoveTransaction,
		getLatestGameBoard,
	};
}
