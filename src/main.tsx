import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// UI
import App from "./App.tsx";
import { Toaster } from "@/components/ui/sonner";
import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";

// Utils
import { monadTestnet } from "viem/chains";

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
                supportedChains: [monadTestnet],
                loginMethods: ["google", "passkey"],
                embeddedWallets: {
                    ethereum: { createOnLogin: "users-without-wallets" },
                },
            }}
        >
            <SmartWalletsProvider>
                <App />
                <Toaster richColors expand={true} />
            </SmartWalletsProvider>
        </PrivyProvider>
    </StrictMode>
);
