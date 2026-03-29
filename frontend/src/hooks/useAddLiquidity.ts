import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, parseEther } from "viem";
import { ABIS, CONTRACTS } from "@/config/contracts";

export function useAddLiquidity() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function addLiquidity(
    tokenA: Address,
    tokenB: Address,
    amountA: string,
    amountB: string,
    to: Address,
  ) {
    writeContract({
      address: CONTRACTS.router,
      abi: ABIS.router,
      functionName: "addLiquidity",
      args: [
        tokenA,
        tokenB,
        parseEther(amountA),
        parseEther(amountB),
        parseEther("0"), // amountAMin - no slippage for dev
        parseEther("0"), // amountBMin
        to,
        BigInt(Math.floor(Date.now() / 1000) + 60 * 20),
      ],
    });
  }

  return { addLiquidity, hash, isPending, isConfirming, isSuccess, error };
}
