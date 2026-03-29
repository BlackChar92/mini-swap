import { useReadContract } from "wagmi";
import { type Address, formatEther } from "viem";
import { ABIS } from "@/config/contracts";

export function useTokenBalance(token: Address, account: Address | undefined) {
  const { data, ...rest } = useReadContract({
    address: token,
    abi: ABIS.erc20,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: !!account },
  });

  return {
    balance: data as bigint | undefined,
    formatted: data ? formatEther(data as bigint) : "0",
    ...rest,
  };
}
