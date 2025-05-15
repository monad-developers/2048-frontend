import React, { useState } from "react";

type ContainerProps = {
    children: React.ReactNode; // Accepts any valid React element(s)
};

export default function Container({ children }: ContainerProps) {
    const [showModal, setShowModal] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowModal(false);
            setIsClosing(false);
        }, 300); // Match animation duration
    };

    return (
        <div className="h-[100dvh] flex flex-col items-center justify-between px-2 bg-gray-100 overflow-hidden">
            <div className="pt-4 text-center">
                <h1 className="text-6xl md:text-8xl font-extrabold text-yellow-400 drop-shadow-[4px_4px_0px_rgba(255,0,0,1)] md:drop-shadow-[8px_8px_0px_rgba(255,0,0,1)] uppercase tracking-wider transform rotate-[-2deg] transition-transform duration-300 hover:rotate-[2deg]">
                    2048
                </h1>
                <h3 className="text-2xl md:text-4xl font-extrabold text-purple-600 drop-shadow-[1px_1px_0px_rgba(255,0,0,1)] md:drop-shadow-[2px_2px_0px_rgba(255,0,0,1)] tracking-wider transform rotate-[-2deg] transition-transform duration-300 hover:rotate-[2deg]">
                    on MONAD
                </h3>
            </div>

            {/* Main content area */}
            <div className="flex-1 w-full max-w-md flex flex-col justify-between overflow-hidden">
                {children}
            </div>

            {/* Help Button */}
            <div 
                className="fixed bottom-0 left-0 cursor-pointer transition-all duration-300 hover:translate-y-[-40%] hover:scale-110 z-20"
                onClick={() => setShowModal(true)}
            >
                <img 
                    src="/butt.png" 
                    alt="Help" 
                    className="w-32 h-auto transform translate-y-[60%] hover:drop-shadow-[0_0_10px_rgba(0,0,0,0.3)]"
                />
            </div>

            {/* Modal */}
            {showModal && (
                <div 
                    className="fixed inset-0 flex items-center justify-center z-30" 
                    onClick={handleClose}
                >
                    <div 
                        className={`bg-white/90 backdrop-blur-sm p-6 rounded-lg max-w-md m-4 shadow-lg border border-gray-200 ${isClosing ? 'animate-modal-out' : 'animate-modal-in'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-2xl font-bold mb-4">How to Play 2048</h2>
                        <div className="space-y-4">
                            <p>2048 is a sliding puzzle game where you combine matching numbers to create larger ones!</p>
                            
                            <div className="space-y-2">
                                <h3 className="font-semibold">Game Rules:</h3>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Use arrow keys or swipe to move all tiles</li>
                                    <li>When two tiles with the same number touch, they merge into one!</li>
                                    <li>Each merge adds to your score</li>
                                    <li>The goal is to create a tile with the number 2048</li>
                                </ul>
                            </div>

                            <p className="text-sm text-gray-600">
                                P.S. every move is on chain.
                            </p>
                        </div>
                        <button 
                            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                            onClick={handleClose}
                        >
                            Got it!
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modalIn {
                    from {
                        opacity: 0;
                        transform: scale(0.8) translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }

                @keyframes modalOut {
                    from {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                    to {
                        opacity: 0;
                        transform: scale(0.8) translateY(20px);
                    }
                }

                .animate-modal-in {
                    animation: modalIn 0.3s ease-out forwards;
                }

                .animate-modal-out {
                    animation: modalOut 0.3s ease-in forwards;
                }
            `}</style>
        </div>
    );
}
