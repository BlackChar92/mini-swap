// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {MockERC20} from "../src/tokens/MockERC20.sol";
import {MiniFactory} from "../src/core/MiniFactory.sol";
import {MiniPair} from "../src/core/MiniPair.sol";
import {MiniRouter} from "../src/periphery/MiniRouter.sol";

contract MiniSwapTest is Test {
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    MiniFactory public factory;
    MiniRouter public router;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    uint256 constant INITIAL_MINT = 100_000 ether;

    function setUp() public {
        // Deploy core contracts
        factory = new MiniFactory();
        router = new MiniRouter(address(factory));

        // Deploy test tokens
        tokenA = new MockERC20("Token A", "TKA", 18);
        tokenB = new MockERC20("Token B", "TKB", 18);

        // Mint tokens to users
        tokenA.mint(alice, INITIAL_MINT);
        tokenB.mint(alice, INITIAL_MINT);
        tokenA.mint(bob, INITIAL_MINT);
        tokenB.mint(bob, INITIAL_MINT);

        // Alice approves router
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);
        vm.stopPrank();

        // Bob approves router
        vm.startPrank(bob);
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);
        vm.stopPrank();
    }

    // ============ Factory Tests ============

    function test_createPair() public {
        address pair = factory.createPair(address(tokenA), address(tokenB));
        assertTrue(pair != address(0));
        assertEq(factory.allPairsLength(), 1);
        assertEq(factory.getPair(address(tokenA), address(tokenB)), pair);
        assertEq(factory.getPair(address(tokenB), address(tokenA)), pair);
    }

    function test_createPair_revertsOnDuplicate() public {
        factory.createPair(address(tokenA), address(tokenB));
        vm.expectRevert("MiniFactory: PAIR_EXISTS");
        factory.createPair(address(tokenA), address(tokenB));
    }

    function test_createPair_revertsOnIdentical() public {
        vm.expectRevert("MiniFactory: IDENTICAL_ADDRESSES");
        factory.createPair(address(tokenA), address(tokenA));
    }

    // ============ Add Liquidity Tests ============

    function test_addLiquidity_initial() public {
        vm.startPrank(alice);
        (uint256 amountA, uint256 amountB, uint256 liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            10_000 ether,
            10_000 ether,
            0,
            0,
            alice,
            block.timestamp + 1
        );
        vm.stopPrank();

        assertEq(amountA, 10_000 ether);
        assertEq(amountB, 10_000 ether);
        assertTrue(liquidity > 0);

        address pair = factory.getPair(address(tokenA), address(tokenB));
        (uint112 reserve0, uint112 reserve1) = MiniPair(pair).getReserves();
        assertEq(uint256(reserve0) + uint256(reserve1), 20_000 ether);
    }

    function test_addLiquidity_subsequent() public {
        // Alice adds initial liquidity
        vm.startPrank(alice);
        router.addLiquidity(
            address(tokenA), address(tokenB),
            10_000 ether, 10_000 ether, 0, 0, alice, block.timestamp + 1
        );
        vm.stopPrank();

        // Bob adds more liquidity
        vm.startPrank(bob);
        (uint256 amountA, uint256 amountB, uint256 liquidity) = router.addLiquidity(
            address(tokenA), address(tokenB),
            5_000 ether, 5_000 ether, 0, 0, bob, block.timestamp + 1
        );
        vm.stopPrank();

        assertEq(amountA, 5_000 ether);
        assertEq(amountB, 5_000 ether);
        assertTrue(liquidity > 0);
    }

    // ============ Swap Tests ============

    function test_swapExactTokensForTokens() public {
        // Alice provides liquidity
        vm.startPrank(alice);
        router.addLiquidity(
            address(tokenA), address(tokenB),
            10_000 ether, 10_000 ether, 0, 0, alice, block.timestamp + 1
        );
        vm.stopPrank();

        // Bob swaps
        uint256 bobTokenBBefore = tokenB.balanceOf(bob);
        vm.startPrank(bob);
        uint256 amountOut = router.swapExactTokensForTokens(
            1_000 ether,  // amountIn
            0,            // amountOutMin (no slippage protection for test)
            address(tokenA),
            address(tokenB),
            bob,
            block.timestamp + 1
        );
        vm.stopPrank();

        assertTrue(amountOut > 0);
        assertEq(tokenB.balanceOf(bob), bobTokenBBefore + amountOut);
        // With 0.3% fee and constant product, output should be less than input
        assertTrue(amountOut < 1_000 ether);
    }

    function test_swapTokensForExactTokens() public {
        // Alice provides liquidity
        vm.startPrank(alice);
        router.addLiquidity(
            address(tokenA), address(tokenB),
            10_000 ether, 10_000 ether, 0, 0, alice, block.timestamp + 1
        );
        vm.stopPrank();

        uint256 bobTokenABefore = tokenA.balanceOf(bob);
        vm.startPrank(bob);
        uint256 amountIn = router.swapTokensForExactTokens(
            500 ether,           // amountOut (exact)
            type(uint256).max,   // amountInMax
            address(tokenA),
            address(tokenB),
            bob,
            block.timestamp + 1
        );
        vm.stopPrank();

        assertEq(tokenB.balanceOf(bob), INITIAL_MINT + 500 ether);
        assertEq(tokenA.balanceOf(bob), bobTokenABefore - amountIn);
        // Should require more than 500 due to fee + price impact
        assertTrue(amountIn > 500 ether);
    }

    // ============ Remove Liquidity Tests ============

    function test_removeLiquidity() public {
        // Alice adds liquidity
        vm.startPrank(alice);
        (, , uint256 liquidity) = router.addLiquidity(
            address(tokenA), address(tokenB),
            10_000 ether, 10_000 ether, 0, 0, alice, block.timestamp + 1
        );

        // Approve LP token for router
        address pair = factory.getPair(address(tokenA), address(tokenB));
        MiniPair(pair).approve(address(router), liquidity);

        uint256 aliceABefore = tokenA.balanceOf(alice);
        uint256 aliceBBefore = tokenB.balanceOf(alice);

        (uint256 amountA, uint256 amountB) = router.removeLiquidity(
            address(tokenA), address(tokenB),
            liquidity, 0, 0, alice, block.timestamp + 1
        );
        vm.stopPrank();

        assertTrue(amountA > 0 && amountB > 0);
        assertEq(tokenA.balanceOf(alice), aliceABefore + amountA);
        assertEq(tokenB.balanceOf(alice), aliceBBefore + amountB);
    }

    // ============ Edge Cases ============

    function test_swap_revertsOnExpiredDeadline() public {
        vm.startPrank(alice);
        router.addLiquidity(
            address(tokenA), address(tokenB),
            10_000 ether, 10_000 ether, 0, 0, alice, block.timestamp + 1
        );
        vm.stopPrank();

        vm.warp(block.timestamp + 100);
        vm.startPrank(bob);
        vm.expectRevert("MiniRouter: EXPIRED");
        router.swapExactTokensForTokens(
            100 ether, 0, address(tokenA), address(tokenB), bob, block.timestamp - 1
        );
        vm.stopPrank();
    }

    function test_swap_revertsOnInsufficientOutput() public {
        vm.startPrank(alice);
        router.addLiquidity(
            address(tokenA), address(tokenB),
            10_000 ether, 10_000 ether, 0, 0, alice, block.timestamp + 1
        );
        vm.stopPrank();

        vm.startPrank(bob);
        vm.expectRevert("MiniRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        router.swapExactTokensForTokens(
            100 ether,
            1_000 ether,  // unrealistic minimum
            address(tokenA),
            address(tokenB),
            bob,
            block.timestamp + 1
        );
        vm.stopPrank();
    }

    // ============ Fuzz Tests ============

    function testFuzz_swap_invariant(uint256 amountIn) public {
        // Bound input to reasonable range
        amountIn = bound(amountIn, 1 ether, 9_000 ether);

        vm.startPrank(alice);
        router.addLiquidity(
            address(tokenA), address(tokenB),
            10_000 ether, 10_000 ether, 0, 0, alice, block.timestamp + 1
        );
        vm.stopPrank();

        address pair = factory.getPair(address(tokenA), address(tokenB));
        (uint112 r0Before, uint112 r1Before) = MiniPair(pair).getReserves();
        uint256 kBefore = uint256(r0Before) * uint256(r1Before);

        vm.startPrank(bob);
        router.swapExactTokensForTokens(
            amountIn, 0, address(tokenA), address(tokenB), bob, block.timestamp + 1
        );
        vm.stopPrank();

        (uint112 r0After, uint112 r1After) = MiniPair(pair).getReserves();
        uint256 kAfter = uint256(r0After) * uint256(r1After);

        // k should never decrease (it increases due to fees)
        assertTrue(kAfter >= kBefore, "k invariant violated");
    }

    function testFuzz_addRemoveLiquidity_noLoss(uint256 amount) public {
        amount = bound(amount, 1 ether, 50_000 ether);

        vm.startPrank(alice);
        (, , uint256 liquidity) = router.addLiquidity(
            address(tokenA), address(tokenB),
            amount, amount, 0, 0, alice, block.timestamp + 1
        );

        address pair = factory.getPair(address(tokenA), address(tokenB));
        MiniPair(pair).approve(address(router), liquidity);

        (uint256 amountA, uint256 amountB) = router.removeLiquidity(
            address(tokenA), address(tokenB),
            liquidity, 0, 0, alice, block.timestamp + 1
        );
        vm.stopPrank();

        // Due to MINIMUM_LIQUIDITY lock, first LP loses a tiny amount
        // but should still get back most of their deposit
        assertTrue(amountA >= amount - 1_001, "lost too much token A");
        assertTrue(amountB >= amount - 1_001, "lost too much token B");
    }
}
