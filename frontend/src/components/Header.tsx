"use client";

import { useSyncExternalStore } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasTronLinkEvmProvider, hasTronLinkInstalled } from "@/config/wallets/tronLink";

const NAV_ITEMS = [
  { href: "/", label: "Swap" },
  { href: "/pool", label: "Pool" },
  { href: "/faucet", label: "Faucet" },
];

export function Header() {
  const pathname = usePathname();
  const showTronLinkWarning = useSyncExternalStore(
    () => () => {},
    () => hasTronLinkInstalled() && !hasTronLinkEvmProvider(),
    () => false,
  );

  return (
    <header className="border-b border-gray-800">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-white">MiniSwap</h1>
          <nav className="flex gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <ConnectButton />
      </div>
      {showTronLinkWarning && (
        <div className="border-t border-amber-500/20 bg-amber-500/10 px-6 py-3 text-sm text-amber-100">
          TronLink is installed, but no EVM provider was detected. MiniSwap only supports EVM wallets here, so use MetaMask or enable TronLink EVM support before connecting.
        </div>
      )}
    </header>
  );
}
