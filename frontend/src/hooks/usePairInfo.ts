"use client";

import { useReadContract } from "wagmi";
import { formatEther, type Address } from "viem";
import { CONTRACTS, ABIS } from "@/config/contracts";

export function usePairInfo(tokenA: Address, tokenB: Address, user?: Address) {
  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.multicall,
    abi: ABIS.multicall,
    functionName: "getPairInfo",
    args: [tokenA, tokenB, user ?? "0x0000000000000000000000000000000000000000"],
    query: {
      enabled: !!CONTRACTS.multicall && !!tokenA && !!tokenB,
      refetchInterval: 5000,
    },
  });

  const info = data as
    | {
        pair: Address;
        reserve0: bigint;
        reserve1: bigint;
        totalSupply: bigint;
        userLpBalance: bigint;
        userToken0Balance: bigint;
        userToken1Balance: bigint;
        token0Allowance: bigint;
        token1Allowance: bigint;
        lpAllowance: bigint;
      }
    | undefined;

  return {
    pair: info?.pair,
    reserve0: info?.reserve0 ?? 0n,
    reserve1: info?.reserve1 ?? 0n,
    totalSupply: info?.totalSupply ?? 0n,
    userLpBalance: info?.userLpBalance ?? 0n,
    userToken0Balance: info?.userToken0Balance ?? 0n,
    userToken1Balance: info?.userToken1Balance ?? 0n,
    token0Allowance: info?.token0Allowance ?? 0n,
    token1Allowance: info?.token1Allowance ?? 0n,
    lpAllowance: info?.lpAllowance ?? 0n,
    formatted: {
      reserve0: formatEther(info?.reserve0 ?? 0n),
      reserve1: formatEther(info?.reserve1 ?? 0n),
      userLpBalance: formatEther(info?.userLpBalance ?? 0n),
      userToken0Balance: formatEther(info?.userToken0Balance ?? 0n),
      userToken1Balance: formatEther(info?.userToken1Balance ?? 0n),
    },
    isLoading,
    refetch,
  };
}
