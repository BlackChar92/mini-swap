import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, parseEther } from "viem";
import { ABIS, CONTRACTS } from "@/config/contracts";

export function useSwap() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function swap(
    amountIn: string,
    amountOutMin: string,
    tokenIn: Address,
    tokenOut: Address,
    to: Address,
  ) {
    writeContract({
      address: CONTRACTS.router,
      abi: ABIS.router,
      functionName: "swapExactTokensForTokens",
      args: [
        parseEther(amountIn),
        parseEther(amountOutMin),
        tokenIn,
        tokenOut,
        to,
        BigInt(Math.floor(Date.now() / 1000) + 60 * 20), // 20 min deadline
      ],
    });
  }

  return { swap, hash, isPending, isConfirming, isSuccess, error };
}
