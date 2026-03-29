// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {MiniFactory} from "../core/MiniFactory.sol";
import {MiniPair} from "../core/MiniPair.sol";
import {MiniRouter} from "./MiniRouter.sol";

/// @title MiniMulticall
/// @notice Batches multiple read calls into a single RPC request,
///         reducing frontend latency and RPC usage.
contract MiniMulticall {
    address public immutable factory;
    address public immutable router;

    struct PairInfo {
        address pair;
        uint112 reserve0;
        uint112 reserve1;
        uint256 totalSupply;
        uint256 userLpBalance;
        uint256 userToken0Balance;
        uint256 userToken1Balance;
        uint256 token0Allowance;
        uint256 token1Allowance;
        uint256 lpAllowance;
    }

    struct SwapQuote {
        uint256 amountOut;
        uint256 priceImpactBps; // basis points (1 = 0.01%)
        uint256 reserveIn;
        uint256 reserveOut;
    }

    constructor(address _factory, address _router) {
        factory = _factory;
        router = _router;
    }

    /// @notice Get all pair-related data for a user in one call
    function getPairInfo(
        address tokenA,
        address tokenB,
        address user
    ) external view returns (PairInfo memory info) {
        info.pair = MiniFactory(factory).getPair(tokenA, tokenB);
        if (info.pair == address(0)) return info;

        (info.reserve0, info.reserve1) = MiniPair(info.pair).getReserves();
        info.totalSupply = MiniPair(info.pair).totalSupply();

        if (user != address(0)) {
            (address token0,) = _sortTokens(tokenA, tokenB);
            address token1 = tokenA == token0 ? tokenB : tokenA;

            info.userLpBalance = MiniPair(info.pair).balanceOf(user);
            info.userToken0Balance = IERC20(token0).balanceOf(user);
            info.userToken1Balance = IERC20(token1).balanceOf(user);
            info.token0Allowance = IERC20(token0).allowance(user, router);
            info.token1Allowance = IERC20(token1).allowance(user, router);
            info.lpAllowance = MiniPair(info.pair).allowance(user, router);
        }
    }

    /// @notice Get swap quote with price impact
    function getSwapQuote(
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external view returns (SwapQuote memory quote) {
        address pair = MiniFactory(factory).getPair(tokenIn, tokenOut);
        require(pair != address(0), "MiniMulticall: PAIR_NOT_FOUND");

        (uint112 r0, uint112 r1) = MiniPair(pair).getReserves();
        (address token0,) = _sortTokens(tokenIn, tokenOut);

        (quote.reserveIn, quote.reserveOut) = tokenIn == token0
            ? (uint256(r0), uint256(r1))
            : (uint256(r1), uint256(r0));

        quote.amountOut = MiniRouter(router).getAmountOut(amountIn, tokenIn, tokenOut);

        // Price impact in basis points
        // spot price = reserveOut / reserveIn
        // exec price = amountOut / amountIn
        // impact = 1 - execPrice / spotPrice
        //        = 1 - (amountOut * reserveIn) / (amountIn * reserveOut)
        if (amountIn > 0 && quote.reserveOut > 0) {
            uint256 spotNumerator = amountIn * quote.reserveOut;
            uint256 execNumerator = quote.amountOut * quote.reserveIn;
            if (spotNumerator > execNumerator) {
                quote.priceImpactBps = ((spotNumerator - execNumerator) * 10000) / spotNumerator;
            }
        }
    }

    /// @notice Batch-read balances for multiple tokens
    function getBalances(
        address[] calldata tokens,
        address user
    ) external view returns (uint256[] memory balances) {
        balances = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            balances[i] = IERC20(tokens[i]).balanceOf(user);
        }
    }

    /// @notice Get all pairs from factory with their reserves
    function getAllPairs() external view returns (
        address[] memory pairs,
        address[] memory token0s,
        address[] memory token1s,
        uint112[] memory reserves0,
        uint112[] memory reserves1
    ) {
        uint256 len = MiniFactory(factory).allPairsLength();
        pairs = new address[](len);
        token0s = new address[](len);
        token1s = new address[](len);
        reserves0 = new uint112[](len);
        reserves1 = new uint112[](len);

        for (uint256 i = 0; i < len; i++) {
            address pair = MiniFactory(factory).allPairs(i);
            pairs[i] = pair;
            token0s[i] = MiniPair(pair).token0();
            token1s[i] = MiniPair(pair).token1();
            (reserves0[i], reserves1[i]) = MiniPair(pair).getReserves();
        }
    }

    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }
}
