import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, parseEther } from "viem";
import { ABIS } from "@/config/contracts";

export function useMintTestTokens(token: Address) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function mint(to: Address, amount: string) {
    writeContract({
      address: token,
      abi: ABIS.erc20,
      functionName: "mint",
      args: [to, parseEther(amount)],
    });
  }

  return { mint, hash, isPending, isConfirming, isSuccess, error };
}
