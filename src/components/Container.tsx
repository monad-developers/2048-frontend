import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import React from "react";

type ContainerProps = {
    children: React.ReactNode; // Accepts any valid React element(s)
};

export default function Container({ children }: ContainerProps) {
    return (
        <div className="min-h-[100dvh] flex flex-col items-center pb-16 pt-6 justify-between px-2 bg-gray-100 overflow-hidden">
            <div className="pt-4 text-center">
                <h1 className="text-6xl md:text-8xl font-extrabold text-yellow-400 drop-shadow-[4px_4px_0px_rgba(255,0,0,1)] md:drop-shadow-[8px_8px_0px_rgba(255,0,0,1)] uppercase tracking-wider transform rotate-[-2deg]">
                    2048
                </h1>
                <h3 className="text-2xl md:text-4xl font-extrabold text-purple-600 drop-shadow-[1px_1px_0px_rgba(255,0,0,1)] md:drop-shadow-[2px_2px_0px_rgba(255,0,0,1)] tracking-wider transform rotate-[-2deg]">
                    on MONAD
                </h3>
            </div>

            <div className="max-w-md w-full px-4 mt-4 mb-2">
                <Alert className="bg-purple-600 text-white border-purple-700 rounded-xl shadow-[0_8px_0_rgb(107,33,168)]">
                    <InfoIcon className="text-white" />
                    <AlertTitle>
                        2048 Faucet Ended
                    </AlertTitle>
                    <AlertDescription className="mt-1">
                        <p className="!leading-[1.4]">
                            <span>
                                The 2048 game will no longer be funding player addresses at this time. Please claim more tokens at{" "}
                            </span>
                            <a
                                href="https://faucet.monad.xyz"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-yellow-300"
                                >
                                faucet.monad.xyz
                            </a>{" "}
                            <span>
                                and deposit to your player address here.
                            </span>
                        </p>
                    </AlertDescription>
                </Alert>
            </div>

            {/* Main content area */}
            <div className="flex-1 w-full max-w-md flex flex-col justify-between overflow-hidden">
                {children}
            </div>
        </div>
    );
}
