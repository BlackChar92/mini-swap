// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MiniMulticall} from "../src/periphery/MiniMulticall.sol";

contract DeployLocalMulticallScript is Script {
    function run() external {
        address factory = vm.envAddress("FACTORY_ADDRESS");
        address router = vm.envAddress("ROUTER_ADDRESS");

        vm.startBroadcast();
        MiniMulticall multicall = new MiniMulticall(factory, router);
        vm.stopBroadcast();

        console.log("MiniMulticall:", address(multicall));
    }
}
