import { Copy } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import FunPurpleButton from "./FunPurpleButton";

type NewGameButtonProps = {
  resetGame: () => void;
};

export default function NewGameButton({ resetGame }: NewGameButtonProps) {
  const { user } = usePrivy();

  const copyToClipboard = async () => {
    if (user?.wallet?.address) {
      await navigator.clipboard.writeText(user.wallet.address);
      // You could add some subtle UI feedback here if needed
    }
  };

  const abbreviatedAddress = user?.wallet?.address
    ? `${user.wallet.address.slice(0, 4)}...${user.wallet.address.slice(-2)}`
    : "";

  return (
    user?.wallet && (
      <div className="flex flex-col items-center gap-4">
        <FunPurpleButton text="New Game" onClick={resetGame} />
        <div className="flex items-center gap-2">
          <p>
            <span className="font-bold">Player</span>: {abbreviatedAddress}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 p-1"
            onClick={copyToClipboard}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  );
}
