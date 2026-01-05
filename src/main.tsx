import "./index.css";

import { PrivyProvider } from "@privy-io/react-auth";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { monad, monadTestnet } from "viem/chains";
import App from "./App.tsx";
import { NetworkProvider } from "./contexts/NetworkContext";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<PrivyProvider
			appId={import.meta.env.VITE_PRIVY_APP_ID}
			config={{
				appearance: {
					theme: "light",
					walletChainType: "ethereum-only",
				},
				defaultChain: monadTestnet,
				supportedChains: [monadTestnet, monad],
				loginMethods: ["google", "passkey", "wallet"],
				embeddedWallets: {
					ethereum: { createOnLogin: "all-users" },
				},
			}}
		>
			<NetworkProvider>
				<App />
			</NetworkProvider>
		</PrivyProvider>
	</StrictMode>,
);
