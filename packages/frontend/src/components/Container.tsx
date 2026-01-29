import React from "react";
import { Leaderboard } from "@/components/Leaderboard";

type ContainerProps = {
	children: React.ReactNode;
	playerAddress?: string;
};

export default function Container({ children, playerAddress }: ContainerProps) {
	return (
		<div className="min-h-[100dvh] flex flex-col items-center pb-8 pt-6 px-2 bg-gray-100 overflow-x-hidden">
			{/* Header */}
			<div className="pt-4 text-center">
				<h1 className="text-6xl md:text-8xl font-extrabold text-yellow-400 drop-shadow-[4px_4px_0px_rgba(255,0,0,1)] md:drop-shadow-[8px_8px_0px_rgba(255,0,0,1)] uppercase tracking-wider transform rotate-[-2deg]">
					2048
				</h1>
				<h3 className="text-2xl md:text-4xl font-extrabold text-purple-600 drop-shadow-[1px_1px_0px_rgba(255,0,0,1)] md:drop-shadow-[2px_2px_0px_rgba(255,0,0,1)] tracking-wider transform rotate-[-2deg]">
					on MONAD
				</h3>
			</div>

			{/* Main content area: Game + Leaderboard */}
			<div className="flex-1 w-full flex flex-col lg:flex-row lg:justify-center lg:items-start lg:gap-6 xl:gap-8">
				{/* Game board - fixed max width, never shrinks */}
				<div className="shrink-0 w-full max-w-md mx-auto lg:mx-0">
					{children}
				</div>

				{/* Leaderboard - right side on desktop, below on mobile */}
				<div className="shrink-0 w-full max-w-sm mx-auto lg:mx-0 mt-6 lg:mt-0 px-4 lg:px-0 lg:sticky lg:top-6">
					<Leaderboard currentPlayerAddress={playerAddress} />
				</div>
			</div>
		</div>
	);
}
