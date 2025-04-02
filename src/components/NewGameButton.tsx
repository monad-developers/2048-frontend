// Hooks
import { useActiveAccount } from "thirdweb/react";

// UI
import FunPurpleButton from "./FunPurpleButton";

type NewGameButtonProps = {
    resetGame: () => void;
}

export default function NewGameButton({ resetGame }: NewGameButtonProps) {

    const account = useActiveAccount();

    return (
        <div className="flex flex-col items-center gap-4">
            <FunPurpleButton text="New Game" onClick={resetGame} />
            <p><span className="font-bold">Player</span>: {account?.address.slice(0,4) + '...' + account?.address.slice(-2)}</p>
        </div>
    )
}