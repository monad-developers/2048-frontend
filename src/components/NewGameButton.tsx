// Hooks
import { usePrivy } from "@privy-io/react-auth";

// UI
import FunPurpleButton from "./FunPurpleButton";

type NewGameButtonProps = {
    resetGame: () => void;
}

export default function NewGameButton({ resetGame }: NewGameButtonProps) {

    const { user } = usePrivy();

    return (
        user && user.wallet &&
        <div className="flex flex-col items-center gap-4">
            <FunPurpleButton text="New Game" onClick={resetGame} />
            <p><span className="font-bold">Player</span>: {user.wallet.address.slice(0,4) + '...' + user.wallet.address.slice(-2)}</p>
        </div>
    )
}