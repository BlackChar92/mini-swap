import { parseAbiItem } from "viem";

export const SwapEvent = parseAbiItem(
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)"
);

export const MintEvent = parseAbiItem(
  "event Mint(address indexed sender, uint256 amount0, uint256 amount1)"
);

export const BurnEvent = parseAbiItem(
  "event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to)"
);

export const SyncEvent = parseAbiItem(
  "event Sync(uint112 reserve0, uint112 reserve1)"
);
