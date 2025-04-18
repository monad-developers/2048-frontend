import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// import App from './App.tsx'
import App from "./AltApp";
import { monadTestnet } from "viem/chains";
import { PrivyProvider } from "@privy-io/react-auth";
import { Toaster } from "@/components/ui/sonner";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <PrivyProvider
            appId={import.meta.env.VITE_PRIVY_APP_ID}
            config={{
                // Customize Privy's appearance in your app
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
            <App />
            <Toaster richColors expand={true} />
        </PrivyProvider>
    </StrictMode>
);
