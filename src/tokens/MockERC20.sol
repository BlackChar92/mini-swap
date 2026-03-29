// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "../libraries/ERC20.sol";

/// @title MockERC20
/// @notice A simple ERC20 token for testing. Anyone can mint.
contract MockERC20 is ERC20 {
    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}
