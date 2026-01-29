import React from "react";
import { Leaderboard } from "@/components/Leaderboard";

type ContainerProps = {
	children: React.ReactNode;
	playerAddress?: string;
};

export default function Container({ children, playerAddress }: ContainerProps) {
	return (
		<div className="min-h-[100dvh] flex flex-col lg:flex-row lg:justify-center lg:items-start pb-8 pt-6 px-2 lg:px-8 bg-gray-100 overflow-x-hidden gap-6 xl:gap-8">
			{/* Left side: Header + Game */}
			<div className="flex flex-col items-center w-full max-w-md mx-auto lg:mx-0 shrink-0">
				{/* Header */}
				<div className="pt-4 text-center">
					<h1 className="text-6xl md:text-8xl font-extrabold text-yellow-400 drop-shadow-[4px_4px_0px_rgba(255,0,0,1)] md:drop-shadow-[8px_8px_0px_rgba(255,0,0,1)] uppercase tracking-wider transform rotate-[-2deg]">
						2048
					</h1>
					<h3 className="text-2xl md:text-4xl font-extrabold text-purple-600 drop-shadow-[1px_1px_0px_rgba(255,0,0,1)] md:drop-shadow-[2px_2px_0px_rgba(255,0,0,1)] tracking-wider transform rotate-[-2deg]">
						on MONAD
					</h3>
				</div>

				{/* Game board */}
				<div className="shrink-0 w-full max-w-md">
					{children}
				</div>
			</div>

			{/* Right side: Leaderboard - pinned to right */}
			<div className="shrink-0 w-full max-w-sm mx-auto lg:mx-0 mt-6 lg:mt-0 px-4 lg:px-0 lg:sticky lg:top-6 lg:self-start">
				<Leaderboard currentPlayerAddress={playerAddress} />
			</div>
		</div>
	);
}
