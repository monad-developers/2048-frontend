import { useState } from "react";
import { Loader2 } from "lucide-react";

interface LoginButtonProps {
    text: string;
    loadingText?: string;
    isLoading?: boolean;
    onClick?: () => void;
}

export default function FunPurpleButton({
    text,
    loadingText,
    onClick,
    isLoading = false,
}: LoginButtonProps) {
    const [isPressed, setIsPressed] = useState(false);

    const handleClick = () => {
        setIsPressed(true);
        onClick?.();
        setTimeout(() => setIsPressed(false), 150);
    };

    return (
        <button
            onClick={handleClick}
            disabled={isLoading}
            className={`
        relative
        px-8 py-3
        font-bold text-white
        bg-purple-600
        rounded-xl
        transform
        transition-all duration-150
        hover:scale-105
        active:scale-95
        disabled:opacity-70
        disabled:cursor-not-allowed
        shadow-[0_8px_0_rgb(107,33,168)]
        hover:shadow-[0_6px_0_rgb(107,33,168)]
        active:shadow-[0_4px_0_rgb(107,33,168)]
        ${isPressed ? "translate-y-2" : ""}
        before:absolute
        before:content-['']
        before:inset-0
        before:bg-white/20
        before:rounded-xl
        before:transition-all
        hover:before:bg-white/30
        active:before:bg-white/10
      `}
        >
            <span className="flex items-center gap-2">
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{loadingText}</span>
                    </>
                ) : (
                    `${text}`
                )}
            </span>
        </button>
    );
}
