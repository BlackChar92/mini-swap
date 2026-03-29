// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {MiniPair} from "./MiniPair.sol";

/// @title MiniFactory
/// @notice Creates and manages MiniPair trading pairs
contract MiniFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 index);

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "MiniFactory: IDENTICAL_ADDRESSES");

        // Sort tokens to ensure consistent ordering
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "MiniFactory: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "MiniFactory: PAIR_EXISTS");

        MiniPair pairContract = new MiniPair();
        pair = address(pairContract);
        pairContract.initialize(token0, token1);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }
}
