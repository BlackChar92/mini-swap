// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/tokens/MockERC20.sol";
import {MiniFactory} from "../src/core/MiniFactory.sol";
import {MiniRouter} from "../src/periphery/MiniRouter.sol";

contract DeploySepoliaScript is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy tokens
        MockERC20 tokenA = new MockERC20("Token Alpha", "ALPHA", 18);
        MockERC20 tokenB = new MockERC20("Token Beta", "BETA", 18);

        // Deploy core
        MiniFactory factory = new MiniFactory();
        MiniRouter router = new MiniRouter(address(factory));

        // Mint tokens to deployer
        tokenA.mint(msg.sender, 10_000 ether);
        tokenB.mint(msg.sender, 10_000 ether);

        // Create pair and seed initial liquidity
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);
        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            1_000 ether,
            1_000 ether,
            0,
            0,
            msg.sender,
            block.timestamp + 300
        );

        vm.stopBroadcast();

        console.log("=== MiniSwap Sepolia Deployment ===");
        console.log("TokenA (ALPHA):", address(tokenA));
        console.log("TokenB (BETA):", address(tokenB));
        console.log("Factory:", address(factory));
        console.log("Router:", address(router));
    }
}
