"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { CONTRACTS } from "@/config/contracts";
import { useMintTestTokens } from "@/hooks/useMintTestTokens";
import { useTokenBalance } from "@/hooks/useTokenBalance";

export function FaucetCard() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("10000");

  const { formatted: balanceA } = useTokenBalance(CONTRACTS.tokenA, address);
  const { formatted: balanceB } = useTokenBalance(CONTRACTS.tokenB, address);

  const {
    mint: mintA,
    isPending: isMintingA,
    isConfirming: isConfirmingA,
    isSuccess: isSuccessA,
  } = useMintTestTokens(CONTRACTS.tokenA);

  const {
    mint: mintB,
    isPending: isMintingB,
    isConfirming: isConfirmingB,
    isSuccess: isSuccessB,
  } = useMintTestTokens(CONTRACTS.tokenB);

  return (
    <div className="w-full max-w-md mx-auto bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-1">Faucet</h2>
      <p className="text-sm text-gray-500 mb-5">Mint test tokens to your wallet</p>

      {/* Current balances */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-500">TKA Balance</p>
          <p className="text-lg text-white font-medium">{Number(balanceA).toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-xs text-gray-500">TKB Balance</p>
          <p className="text-lg text-white font-medium">{Number(balanceB).toFixed(2)}</p>
        </div>
      </div>

      {/* Amount input */}
      <div className="bg-gray-800 rounded-xl p-4 mb-4">
        <p className="text-sm text-gray-400 mb-2">Amount to mint</p>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-transparent text-2xl text-white outline-none placeholder-gray-600 [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      {/* Mint buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => address && mintA(address, amount)}
          disabled={!address || !amount || isMintingA || isConfirmingA}
          className="flex-1 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isMintingA ? "Confirming..." : isConfirmingA ? "Minting..." : "Mint TKA"}
        </button>
        <button
          onClick={() => address && mintB(address, amount)}
          disabled={!address || !amount || isMintingB || isConfirmingB}
          className="flex-1 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isMintingB ? "Confirming..." : isConfirmingB ? "Minting..." : "Mint TKB"}
        </button>
      </div>

      {(isSuccessA || isSuccessB) && (
        <p className="mt-3 text-center text-sm text-green-400">Tokens minted!</p>
      )}
    </div>
  );
}
