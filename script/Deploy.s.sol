// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/tokens/MockERC20.sol";
import {MiniFactory} from "../src/core/MiniFactory.sol";
import {MiniRouter} from "../src/periphery/MiniRouter.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy tokens
        MockERC20 tokenA = new MockERC20("Token A", "TKA", 18);
        MockERC20 tokenB = new MockERC20("Token B", "TKB", 18);

        // Deploy core
        MiniFactory factory = new MiniFactory();
        MiniRouter router = new MiniRouter(address(factory));

        // Mint tokens to deployer for initial liquidity
        tokenA.mint(msg.sender, 100_000 ether);
        tokenB.mint(msg.sender, 100_000 ether);

        // Create pair and add initial liquidity
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);
        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            10_000 ether,
            10_000 ether,
            0,
            0,
            msg.sender,
            block.timestamp + 300
        );

        vm.stopBroadcast();

        console.log("TokenA:", address(tokenA));
        console.log("TokenB:", address(tokenB));
        console.log("Factory:", address(factory));
        console.log("Router:", address(router));
    }
}
