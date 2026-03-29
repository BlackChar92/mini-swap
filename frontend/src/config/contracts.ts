import { type Address } from "viem";
import { foundry, sepolia } from "wagmi/chains";

import MiniFactoryABI from "@/abi/MiniFactory.json";
import MiniRouterABI from "@/abi/MiniRouter.json";
import MiniPairABI from "@/abi/MiniPair.json";
import MockERC20ABI from "@/abi/MockERC20.json";
import MiniMulticallABI from "@/abi/MiniMulticall.json";

export const CONTRACTS = {
  factory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS as Address,
  router: process.env.NEXT_PUBLIC_ROUTER_ADDRESS as Address,
  tokenA: process.env.NEXT_PUBLIC_TOKEN_A_ADDRESS as Address,
  tokenB: process.env.NEXT_PUBLIC_TOKEN_B_ADDRESS as Address,
  multicall: process.env.NEXT_PUBLIC_MULTICALL_ADDRESS as Address,
} as const;

export const ABIS = {
  factory: MiniFactoryABI,
  router: MiniRouterABI,
  pair: MiniPairABI,
  erc20: MockERC20ABI,
  multicall: MiniMulticallABI,
} as const;

export const SUPPORTED_CHAIN =
  process.env.NEXT_PUBLIC_NETWORK === "sepolia" ? sepolia : foundry;
