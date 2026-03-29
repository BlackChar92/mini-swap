// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MiniMulticall} from "../src/periphery/MiniMulticall.sol";

contract DeployMulticallScript is Script {
    function run() external {
        // Sepolia deployed addresses
        address factory = 0x1AE12704Cd62dDf6067A33bdd7e3Cb019B0a8870;
        address router = 0xe22BC7ea7CE10B210aCFBD4ba45a131b1E2D5286;

        vm.startBroadcast();
        MiniMulticall multicall = new MiniMulticall(factory, router);
        vm.stopBroadcast();

        console.log("MiniMulticall:", address(multicall));
    }
}
