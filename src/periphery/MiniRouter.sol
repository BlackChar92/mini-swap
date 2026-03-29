// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {MiniFactory} from "../core/MiniFactory.sol";
import {MiniPair} from "../core/MiniPair.sol";

/// @title MiniRouter
/// @notice User-facing contract for swapping tokens and managing liquidity.
///         Handles slippage protection and deadline checks.
contract MiniRouter {
    address public immutable factory;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "MiniRouter: EXPIRED");
        _;
    }

    constructor(address _factory) {
        factory = _factory;
    }

    // ============ Liquidity ============

    /// @notice Add liquidity to a pair
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        // Create pair if it doesn't exist
        if (MiniFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            MiniFactory(factory).createPair(tokenA, tokenB);
        }
        (amountA, amountB) = _calculateLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);
        address pair = MiniFactory(factory).getPair(tokenA, tokenB);
        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = MiniPair(pair).mint(to);
    }

    /// @notice Remove liquidity from a pair
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        address pair = MiniFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "MiniRouter: PAIR_NOT_FOUND");

        // Transfer LP tokens to the pair contract
        MiniPair(pair).transferFrom(msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = MiniPair(pair).burn(to);

        (address token0,) = _sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        require(amountA >= amountAMin, "MiniRouter: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "MiniRouter: INSUFFICIENT_B_AMOUNT");
    }

    // ============ Swap ============

    /// @notice Swap exact input tokens for output tokens
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn,
        address tokenOut,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountOut) {
        address pair = MiniFactory(factory).getPair(tokenIn, tokenOut);
        require(pair != address(0), "MiniRouter: PAIR_NOT_FOUND");

        amountOut = getAmountOut(amountIn, tokenIn, tokenOut);
        require(amountOut >= amountOutMin, "MiniRouter: INSUFFICIENT_OUTPUT_AMOUNT");

        _safeTransferFrom(tokenIn, msg.sender, pair, amountIn);

        (address token0,) = _sortTokens(tokenIn, tokenOut);
        (uint256 amount0Out, uint256 amount1Out) = tokenIn == token0
            ? (uint256(0), amountOut)
            : (amountOut, uint256(0));

        MiniPair(pair).swap(amount0Out, amount1Out, to);
    }

    /// @notice Swap input tokens for exact output tokens
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address tokenIn,
        address tokenOut,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountIn) {
        address pair = MiniFactory(factory).getPair(tokenIn, tokenOut);
        require(pair != address(0), "MiniRouter: PAIR_NOT_FOUND");

        amountIn = getAmountIn(amountOut, tokenIn, tokenOut);
        require(amountIn <= amountInMax, "MiniRouter: EXCESSIVE_INPUT_AMOUNT");

        _safeTransferFrom(tokenIn, msg.sender, pair, amountIn);

        (address token0,) = _sortTokens(tokenIn, tokenOut);
        (uint256 amount0Out, uint256 amount1Out) = tokenIn == token0
            ? (uint256(0), amountOut)
            : (amountOut, uint256(0));

        MiniPair(pair).swap(amount0Out, amount1Out, to);
    }

    // ============ View Helpers ============

    /// @notice Given an input amount, calculate the output amount (with 0.3% fee)
    function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) public view returns (uint256 amountOut) {
        require(amountIn > 0, "MiniRouter: INSUFFICIENT_INPUT_AMOUNT");
        address pair = MiniFactory(factory).getPair(tokenIn, tokenOut);
        (uint112 reserve0, uint112 reserve1) = MiniPair(pair).getReserves();
        (address token0,) = _sortTokens(tokenIn, tokenOut);

        (uint256 reserveIn, uint256 reserveOut) = tokenIn == token0
            ? (uint256(reserve0), uint256(reserve1))
            : (uint256(reserve1), uint256(reserve0));

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /// @notice Given an output amount, calculate the required input amount (with 0.3% fee)
    function getAmountIn(uint256 amountOut, address tokenIn, address tokenOut) public view returns (uint256 amountIn) {
        require(amountOut > 0, "MiniRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        address pair = MiniFactory(factory).getPair(tokenIn, tokenOut);
        (uint112 reserve0, uint112 reserve1) = MiniPair(pair).getReserves();
        (address token0,) = _sortTokens(tokenIn, tokenOut);

        (uint256 reserveIn, uint256 reserveOut) = tokenIn == token0
            ? (uint256(reserve0), uint256(reserve1))
            : (uint256(reserve1), uint256(reserve0));

        require(amountOut < reserveOut, "MiniRouter: INSUFFICIENT_LIQUIDITY");
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    // ============ Internal ============

    function _calculateLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (uint256 amountA, uint256 amountB) {
        address pair = MiniFactory(factory).getPair(tokenA, tokenB);
        (uint112 reserve0, uint112 reserve1) = MiniPair(pair).getReserves();
        (address token0,) = _sortTokens(tokenA, tokenB);
        (uint256 reserveA, uint256 reserveB) = tokenA == token0
            ? (uint256(reserve0), uint256(reserve1))
            : (uint256(reserve1), uint256(reserve0));

        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = (amountADesired * reserveB) / reserveA;
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "MiniRouter: INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = (amountBDesired * reserveA) / reserveB;
                require(amountAOptimal <= amountADesired, "MiniRouter: EXCESSIVE_A_AMOUNT");
                require(amountAOptimal >= amountAMin, "MiniRouter: INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "MiniRouter: TRANSFER_FAILED");
    }
}
