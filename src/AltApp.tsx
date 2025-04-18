// UI
import { toast } from "sonner";
import LoginButton from "./components/LoginButton";
import FunPurpleButton from "./components/FunPurpleButton";

// React hooks
import { useEffect, useState } from "react";

// Wallet hooks
import { usePrivy, useWallets } from "@privy-io/react-auth";

// Web3 utils
import { monadTestnet } from "viem/chains";
import { publicClient } from "./utils/client";
import { createWalletClient, custom, Hex, parseGwei } from "viem";

// Utils
import { post } from "./utils/fetch";
import { Button } from "./components/ui/button";

export default function App() {
    // Get connected user and wallet.
    const { user } = usePrivy();
    const { ready, wallets } = useWallets();

    // Fetch user nonce on new login.
    const [userNonce, setUserNonce] = useState(0);
    useEffect(() => {
        async function getNonce() {
            if (!user || !user.wallet) {
                return;
            }

            const nonce = await publicClient.getTransactionCount({
                address: user.wallet.address as Hex,
            });

            setUserNonce(nonce);
        }

        getNonce();
    }, [user]);

    // Sign and send simple transaction on button click.
    async function sendTransaction() {
        // Increment nonce manually.
        const nonce = userNonce;
        setUserNonce(nonce + 1);

        try {
            // Check for wallet.
            if (!ready || !wallets) {
                throw Error("Cannot find wallet.");
            }

            // Find and check for privy wallet specifically.
            const userWallet = wallets.find(
                (w) => w.walletClientType == "privy"
            );
            if (!userWallet) {
                throw Error("Privy wallet not detected.");
            }

            // Get provider.
            const ethereumProvider = await userWallet.getEthereumProvider();
            const provider = createWalletClient({
                chain: monadTestnet,
                transport: custom(ethereumProvider),
            });

            // Sign and send transaction.
            const startTime = Date.now();
            const signedTransaction = await provider.signTransaction({
                nonce,
                to: userWallet.address as Hex,
                gas: BigInt(21000),
                maxFeePerGas: parseGwei("50"),
                account: userWallet.address as Hex,
            });

            const response = await post({
                url: monadTestnet.rpcUrls.default.http[0],
                params: {
                    id: 0,
                    jsonrpc: "2.0",
                    method: "eth_sendRawTransaction",
                    params: [signedTransaction],
                },
            });
            const time = Date.now() - startTime;

            if (response.error) {
                console.log(`Failed in ${time} ms`);
                throw Error(response.error);
            }

            // Fire toast confirmation with benchmark and transaction hash.
            console.log(`Succeeded in ${time} ms: ${response.result}`);
            toast.success(`Confirmed transaction in: ${time} ms`, {
                action: (
                    <Button
                        onClick={() =>
                            window.open(
                                `https://testnet.monadexplorer.com/tx/${response.result}`,
                                "_blank",
                                "noopener,noreferrer"
                            )
                        }
                    >
                        View
                    </Button>
                ),
            });
        } catch (error) {
            console.log(error);
            alert(`Error making transaction: ${(error as Error).message}`);
        }
    }
    return (
        <div className="flex gap-2 p-4">
            <LoginButton initFn={() => {}} />
            <FunPurpleButton
                text="Make a transaction"
                onClick={sendTransaction}
            />
            <p>
                <span className="font-bold">{`Connected as: `}</span>
                {user?.wallet?.address || "User not found."}
            </p>
        </div>
    );
}
