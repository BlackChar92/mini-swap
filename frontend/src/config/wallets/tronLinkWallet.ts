import { createConnector } from "wagmi";
import { injected } from "wagmi/connectors";
import type { Wallet } from "@rainbow-me/rainbowkit";
import { getTronLinkProvider, hasTronLinkEvmProvider } from "./tronLink";

const tronLinkWallet = (): Wallet => ({
  id: "tronLink",
  name: "TronLink",
  iconUrl: "https://www.tronlink.org/favicon.ico",
  iconBackground: "#fff",
  installed: hasTronLinkEvmProvider(),
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
