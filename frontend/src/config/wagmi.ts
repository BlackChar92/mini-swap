import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  okxWallet,
  trustWallet,
  phantomWallet,
  rabbyWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { foundry, sepolia } from "wagmi/chains";
import tronLinkWallet from "./wallets/tronLinkWallet";

const chains =
  process.env.NEXT_PUBLIC_NETWORK === "sepolia"
    ? ([sepolia] as const)
    : ([foundry] as const);

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "mini-swap-dev";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular",
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
        coinbaseWallet,
        okxWallet,
        rabbyWallet,
      ],
    },
    {
      groupName: "More",
      wallets: [
        trustWallet,
        phantomWallet,
        tronLinkWallet,
        injectedWallet,
      ],
    },
  ],
  { projectId, appName: "MiniSwap" },
);

export const config = createConfig({
  chains,
  connectors,
  transports: Object.fromEntries(
    chains.map((c) => [c.id, http()]),
  ) as Record<(typeof chains)[number]["id"], ReturnType<typeof http>>,
  ssr: true,
});
