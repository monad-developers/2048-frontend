// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "lib/forge-std/src/Test.sol";

library Board {
    // =============================================================//
    //                            ERRORS                            //
    // =============================================================//

    error MoveInvalid();

    // =============================================================//
    //                          CONSTANTS                           //
    // =============================================================//

    uint8 public constant UP = 0;
    uint8 public constant DOWN = 1;
    uint8 public constant LEFT = 2;
    uint8 public constant RIGHT = 3;

    // =============================================================//
    //                            START                             //
    // =============================================================//

    function getStartPosition(bytes32 seed) public pure returns (uint128 position) {
        // Generate pseudo-random seed and get first tile to populate.
        uint256 rseed = uint256(keccak256(abi.encodePacked(seed)));
        uint8 pos1 = uint8(rseed % 16);
        rseed >>= 16;

        // Get second tile to populate.
        uint8 pos2 = uint8(rseed % 15);
        if (pos2 >= pos1) {
            pos2++;
        }

        position = setTile(setTile(position, pos2, (rseed % 100) > 90 ? 2 : 1), pos1, (rseed % 100) > 90 ? 2 : 1);
    }

    // =============================================================//
    //                          VALIDATIONS                         //
    // =============================================================//

    function validateStartPosition(uint128 board) public pure returns (bool) {
        uint128 mask = 0x03030303030303030303030303030303;

        // any bit except last two bits in a slot cannot be active
        // also, both of the last two cannot be active at the same time
        if (board & ~mask != 0 || board & (board >> 1) != 0) {
            return false;
        }

        uint256 count;
        while (board != 0) {
            // eliminate last active bit
            board &= board - 1;
            count++;
        }

        return count == 2;
    }

    function validateTransformation(uint128 prevBoard, uint8 move, uint128 nextBoard, uint256 seed)
        public
        pure
        returns (bool)
    {
        return processMove(prevBoard, move, seed) == nextBoard;
    }

    // =============================================================//
    //                        TRANSFORMATIONS                       //
    // =============================================================//

    function processMove(uint128 board, uint8 move, uint256 seed) public pure returns (uint128 result) {
        // Check: the move is valid.
        require(move < 4, MoveInvalid());

        // Perform transformation on board to get resultant
        result = processMove(board, move <= DOWN, move % 2 == 0);

        // Check: the move is playable.
        require(board != result, MoveInvalid());

        uint128 slotMask = 0xFF000000000000000000000000000000;

        uint128 emptyIndices;
        uint128 emptySlots;
        uint128 index;

        while (slotMask != 0) {
            if (result & slotMask == 0) {
                emptyIndices |= index << (8 * emptySlots++);
            }
            slotMask >>= 8;
            index++;
        }

        if (emptySlots > 0) {
            // Set a 2 (90% probability) or a 4 (10% probability) on the randomly chosen tile.
            uint8 tile = uint8((emptyIndices >> (8 * (seed % emptySlots))) & 0xFF);
            result = setTile(result, tile, (seed % 100) > 90 ? 2 : 1);
        }
    }

    function processMove(uint128 board, bool isVertical, bool isLeft) public pure returns (uint128 result) {
        uint128 shift = 0;
        uint128 extractMask = isVertical ? 0x000000FF000000FF000000FF000000FF : 0xFFFFFFFF;
        for (uint256 i = 0; i < 4; i++) {
            uint128 compressed = compress(extractMask & board, isVertical, isLeft);
            uint128 merged = merge(compressed, isVertical, isLeft);

            result |= (merged << shift);
            shift += isVertical ? 8 : 32;

            board >>= isVertical ? 8 : 32;
        }
    }

    function compress(uint128 data, bool isVertical, bool isLeft) internal pure returns (uint128 compressed) {
        uint128 shift = isVertical ? 32 : 8;
        uint128 mask = isLeft ? (isVertical ? 0x000000FF000000000000000000000000 : 0xFF000000) : 0xFF;
        uint128 reminderMask = isVertical ? 0x000000FF000000FF000000FF000000FF : 0xFFFFFFFF;
        while (mask != 0 && data != 0) {
            while (data & reminderMask > 0 && data & mask == 0) {
                data = isLeft ? data << shift : data >> shift;
            }
            compressed |= data & mask;
            mask = isLeft ? mask >> shift : mask << shift;
        }
    }

    function merge(uint128 compressed, bool isVertical, bool isLeft) internal pure returns (uint128 merged) {
        uint128 shift = isVertical ? 32 : 8;

        uint128 mask = isLeft ? (isVertical ? 0x000000FF000000000000000000000000 : 0xFF000000) : 0xFF;
        uint128 reminderMask = isVertical ? 0x000000FF000000FF000000FF000000FF : 0xFFFFFFFF;
        uint128 frontMask = isLeft ? mask >> shift : mask << shift;
        uint128 addition = isLeft ? (isVertical ? 0x00000001000000000000000000000000 : 0x01000000) : 0x01;

        while (reminderMask & compressed != 0) {
            uint128 front = isLeft ? (compressed & frontMask) << shift : (compressed & frontMask) >> shift;
            if (compressed & mask == front) {
                compressed = isLeft ? compressed << shift : compressed >> shift;
                compressed += addition;
            }
            merged |= (compressed & mask);

            mask = isLeft ? mask >> shift : mask << shift;
            frontMask = isLeft ? frontMask >> shift : frontMask << shift;
            addition = isLeft ? addition >> shift : addition << shift;
            reminderMask = isLeft ? reminderMask >> shift : reminderMask << shift;
        }
    }

    function getTile(uint128 board, uint8 pos) public pure returns (uint8) {
        return uint8((board >> ((15 - pos) * 8)) & 0xFF);
    }

    function setTile(uint128 board, uint8 pos, uint8 value) public pure returns (uint128) {
        uint128 mask = uint128(0xFF) << ((15 - pos) * 8);
        uint128 tile = uint128(value) << ((15 - pos) * 8);
        return (board & ~mask) | tile;
    }
}
