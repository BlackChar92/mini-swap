"use client";

import { useReadContract } from "wagmi";
import { parseEther, formatEther, type Address } from "viem";
import { CONTRACTS, ABIS } from "@/config/contracts";

export function useSwapQuote(amountIn: string, tokenIn: Address, tokenOut: Address) {
  const enabled =
    !!CONTRACTS.multicall && !!amountIn && Number(amountIn) > 0;

  const { data, isLoading } = useReadContract({
    address: CONTRACTS.multicall,
    abi: ABIS.multicall,
    functionName: "getSwapQuote",
    args: [parseEther(amountIn || "0"), tokenIn, tokenOut],
    query: { enabled },
  });

  const quote = data as
    | {
        amountOut: bigint;
        priceImpactBps: bigint;
        reserveIn: bigint;
        reserveOut: bigint;
      }
    | undefined;

  return {
    amountOut: quote?.amountOut ?? 0n,
    formattedAmountOut: quote?.amountOut ? formatEther(quote.amountOut) : "",
    priceImpactPercent: quote?.priceImpactBps
      ? Number(quote.priceImpactBps) / 100
      : null,
    reserveIn: quote?.reserveIn ?? 0n,
    reserveOut: quote?.reserveOut ?? 0n,
    isLoading,
  };
}
