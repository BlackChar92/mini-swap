import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, maxUint256 } from "viem";
import { ABIS, CONTRACTS } from "@/config/contracts";

export function useApprove(token: Address) {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function approve() {
    writeContract({
      address: token,
      abi: ABIS.erc20,
      functionName: "approve",
      args: [CONTRACTS.router, maxUint256],
    });
  }

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}
