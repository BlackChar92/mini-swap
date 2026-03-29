import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, parseEther } from "viem";
import { ABIS, CONTRACTS } from "@/config/contracts";

export function useRemoveLiquidity() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function removeLiquidity(
    tokenA: Address,
    tokenB: Address,
    liquidity: string,
    to: Address,
  ) {
    writeContract({
      address: CONTRACTS.router,
      abi: ABIS.router,
      functionName: "removeLiquidity",
      args: [
        tokenA,
        tokenB,
        parseEther(liquidity),
        parseEther("0"),
        parseEther("0"),
        to,
        BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
      ],
    });
  }

  return { removeLiquidity, hash, isPending, isConfirming, isSuccess, error };
}
