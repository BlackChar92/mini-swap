import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { foundry, sepolia } from "wagmi/chains";

const chains =
  process.env.NEXT_PUBLIC_NETWORK === "sepolia"
    ? ([sepolia] as const)
    : ([foundry] as const);

export const config = getDefaultConfig({
  appName: "MiniSwap",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "mini-swap-dev",
  chains,
  ssr: true,
});
