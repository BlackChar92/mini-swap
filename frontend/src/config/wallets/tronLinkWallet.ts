import { createConnector } from "wagmi";
import { injected } from "wagmi/connectors";
import type { Wallet } from "@rainbow-me/rainbowkit";

function getTronLinkProvider(): unknown | undefined {
  if (typeof window === "undefined") return undefined;
  const tronLink = (window as unknown as Record<string, unknown>).tronLink as
    | { ethereum?: unknown }
    | undefined;
  return tronLink?.ethereum;
}

const tronLinkWallet = (): Wallet => ({
  id: "tronLink",
  name: "TronLink",
  iconUrl: "https://www.tronlink.org/favicon.ico",
  iconBackground: "#fff",
  installed:
    typeof window !== "undefined" &&
    !!(window as unknown as Record<string, unknown>).tronLink,
  downloadUrls: {
    chrome:
      "https://chromewebstore.google.com/detail/tronlink/ibnejdfjmmkpcnlpebklmnkoeoihofec",
    browserExtension: "https://www.tronlink.org/",
  },
  createConnector: (walletDetails) =>
    createConnector((config) => ({
      ...injected({
        target: () => ({
          id: "tronLink",
          name: "TronLink",
          provider: getTronLinkProvider() as never,
        }),
      })(config),
      ...walletDetails,
    })),
});

export default tronLinkWallet;
