import { waitForTransactionReceipt } from "@wagmi/core";
import { type Address, parseEther } from "viem";
import { useConfig, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ABIS, CONTRACTS } from "@/config/contracts";

export function useSwap() {
  const config = useConfig();
  const { data: hash, writeContractAsync, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  async function swap(
    amountIn: string,
    amountOutMin: string,
    tokenIn: Address,
    tokenOut: Address,
    to: Address,
  ) {
    const txHash = await writeContractAsync({
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

    await waitForTransactionReceipt(config, { hash: txHash });
    return txHash;
  }

  return { swap, hash, isPending, isConfirming, isSuccess, error };
}
