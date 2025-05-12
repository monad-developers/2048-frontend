import React from "react";

type ContainerProps = {
    children: React.ReactNode; // Accepts any valid React element(s)
};

export default function Container({ children }: ContainerProps) {
    return (
        <div className="h-[100dvh] flex flex-col items-center justify-between px-2 bg-gray-100 overflow-hidden">
            <div className="pt-4 text-center">
                <h1 className="text-6xl md:text-8xl font-extrabold text-yellow-400 drop-shadow-[4px_4px_0px_rgba(255,0,0,1)] md:drop-shadow-[8px_8px_0px_rgba(255,0,0,1)] uppercase tracking-wider transform rotate-[-2deg]">
                    2048
                </h1>
                <h3 className="text-2xl md:text-4xl font-extrabold text-purple-600 drop-shadow-[1px_1px_0px_rgba(255,0,0,1)] md:drop-shadow-[2px_2px_0px_rgba(255,0,0,1)] tracking-wider transform rotate-[-2deg]">
                    on MONAD
                </h3>
            </div>

            {/* Main content area */}
            <div className="flex-1 w-full max-w-md flex flex-col justify-between overflow-hidden">
                {children}
            </div>
        </div>
    );
}
