type TronLinkWindow = Window & {
  tronLink?: {
    ethereum?: unknown;
  };
};

export function getTronLinkProvider(): unknown | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as TronLinkWindow).tronLink?.ethereum;
}

export function hasTronLinkInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return typeof (window as TronLinkWindow).tronLink !== "undefined";
}

export function hasTronLinkEvmProvider(): boolean {
  return typeof getTronLinkProvider() !== "undefined";
}
