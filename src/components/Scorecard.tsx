// Hooks
import { useEffect, useState } from "react";

// UI
import { Card } from "./ui/card";

type ScorecardProps = {
    score: number;
};

export default function Scorecard({ score }: ScorecardProps) {
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        const targetScore = score;
        if (displayScore !== targetScore) {
            const duration = 150; // Total animation duration in ms
            const startTime = Date.now();
            const startScore = displayScore;

            const animate = () => {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;

                if (elapsed < duration) {
                    const progress = elapsed / duration;
                    const nextScore = Math.round(
                        startScore + (targetScore - startScore) * progress
                    );
                    setDisplayScore(nextScore);
                    requestAnimationFrame(animate);
                } else {
                    setDisplayScore(targetScore);
                }
            };

            requestAnimationFrame(animate);
        }
    }, [score, displayScore]);

    return (
        <Card className="p-4 text-center bg-purple-600 font-bold shadow-[0_8px_0_rgb(107,33,168)] uppercase tracking-widest">
            <h2 className="text-sm font-bold text-white">SCORE</h2>
            <p className="text-4xl font-extrabold text-yellow-400 retro-number">
                {displayScore}
            </p>
            <style>{`
                @keyframes flicker {
                0% { opacity: 1; }
                50% { opacity: 0.8; }
                100% { opacity: 1; }
                }
                .retro-number {
                font-family: 'Press Start 2P', cursive;
                animation: flicker 1s infinite alternate;
                }
            `}</style>
        </Card>
    );
}
