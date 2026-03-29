import { useReadContract } from "wagmi";
import { type Address, parseEther, formatEther } from "viem";
import { ABIS, CONTRACTS } from "@/config/contracts";

export function useGetAmountOut(
  amountIn: string,
  tokenIn: Address,
  tokenOut: Address,
) {
  const parsedAmount = amountIn && Number(amountIn) > 0 ? parseEther(amountIn) : undefined;

  const { data, ...rest } = useReadContract({
    address: CONTRACTS.router,
    abi: ABIS.router,
    functionName: "getAmountOut",
    args: parsedAmount ? [parsedAmount, tokenIn, tokenOut] : undefined,
    query: { enabled: !!parsedAmount },
  });

  return {
    amountOut: data as bigint | undefined,
    formatted: data ? formatEther(data as bigint) : "",
    ...rest,
  };
}
