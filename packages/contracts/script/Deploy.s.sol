// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.28 <0.9.0;

// Base
import {Script} from "lib/forge-std/src/Script.sol";
import {StdUtils} from "lib/forge-std/src/StdUtils.sol";

// Targets
import {Monad2048} from "src/Monad2048.sol";

contract Deploy is StdUtils, Script {
    uint256 internal deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

    function run() public returns (address gameContract) {
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployer);
        gameContract = address(new Monad2048());
        vm.stopBroadcast();
    }
}
