// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "lib/forge-std/src/Test.sol";
import {Monad2048} from "src/Monad2048.sol";
import {Board} from "src/LibBoard.sol";

contract Monad2048Test is Test {
    // Target game contract.
    Monad2048 internal game;

    // Game player
    address player;

    function setUp() public {
        // Setup actors.
        player = makeAddr("Player");

        // Deploy game.
        game = new Monad2048();
    }

    function testShowcase() public {
        // Come up with a game ID.
        bytes32 gameId =
            bytes32((uint256(uint160(player)) << 96) + (uint256(keccak256(abi.encodePacked(player, "random"))) >> 160));

        uint8[3] memory moves = [Board.UP, Board.DOWN, Board.RIGHT];
        uint128[4] memory boards;

        // The new tile on every move uses the seed `uint256(keccak256(abi.encodePacked(gameId, moveNumber)))` where moveNumber starts at `1`.
        boards[0] = Board.getStartPosition(bytes32("random"));
        boards[1] = Board.processMove(boards[0], moves[0], uint256(keccak256(abi.encodePacked(gameId, uint256(1)))));
        boards[2] = Board.processMove(boards[1], moves[1], uint256(keccak256(abi.encodePacked(gameId, uint256(2)))));
        boards[3] = Board.processMove(boards[2], moves[2], uint256(keccak256(abi.encodePacked(gameId, uint256(3)))));

        bytes32 gameHash = keccak256(abi.encodePacked(boards));

        assertEq(game.gameHashOf(gameHash), bytes32(0));

        // Start game by revealing commited boards.
        vm.prank(player);
        game.startGame(gameId, boards, moves);

        assertEq(game.gameHashOf(gameHash), gameId);

        assertEq(game.latestBoard(gameId), boards[3]);

        // Play move.
        uint128 board4 =
            Board.processMove(boards[3], Board.LEFT, uint256(keccak256(abi.encodePacked(gameId, uint256(4)))));

        // Submit move for validation.
        vm.prank(player);
        game.play(gameId, Board.LEFT, board4);

        assertEq(game.latestBoard(gameId), board4);
    }

    function testLongerGame() public {
        // Come up with a game ID.
        bytes32 gameId =
            bytes32((uint256(uint160(player)) << 96) + (uint256(keccak256(abi.encodePacked(player, "random"))) >> 160));

        uint8[3] memory moves = [Board.UP, Board.DOWN, Board.RIGHT];
        uint128[4] memory boards;

        // The new tile on every move uses the seed `uint256(keccak256(abi.encodePacked(gameId, moveNumber)))` where moveNumber starts at `1`.
        boards[0] = Board.getStartPosition(bytes32("random"));
        boards[1] = Board.processMove(boards[0], moves[0], uint256(keccak256(abi.encodePacked(gameId, uint256(1)))));
        boards[2] = Board.processMove(boards[1], moves[1], uint256(keccak256(abi.encodePacked(gameId, uint256(2)))));
        boards[3] = Board.processMove(boards[2], moves[2], uint256(keccak256(abi.encodePacked(gameId, uint256(3)))));

        bytes32 gameHash = keccak256(abi.encodePacked(boards));
        assertEq(game.gameHashOf(gameHash), bytes32(0));

        // Start game by revealing committed boards.
        vm.prank(player);
        game.startGame(gameId, boards, moves);

        uint128 boardState = boards[3];
        uint256 movesTotal = 4;
        uint8[4] memory playMoves = [Board.DOWN, Board.LEFT, Board.UP, Board.RIGHT];
        bool gameOver;
        while (!gameOver) {
            assertEq(game.latestBoard(gameId), boardState);

            uint256 i = 0;

            // find move
            while (
                i < 4 && boardState == Board.processMove(boardState, playMoves[i] <= Board.DOWN, playMoves[i] % 2 == 0)
            ) {
                i++;
            }

            if (i < 4) {
                boardState = Board.processMove(
                    boardState, playMoves[i], uint256(keccak256(abi.encodePacked(gameId, movesTotal++)))
                );
                vm.prank(player);
                game.play(gameId, playMoves[i], boardState);
            } else {
                gameOver = true;
            }
        }
    }
}
