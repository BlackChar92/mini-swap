"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { CONTRACTS } from "@/config/contracts";
import { useSwap } from "@/hooks/useSwap";
import { useApprove } from "@/hooks/useApprove";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { usePairInfo } from "@/hooks/usePairInfo";

export function SwapCard() {
  const { address } = useAccount();
  const [amountIn, setAmountIn] = useState("");
  const [isReversed, setIsReversed] = useState(false);

  const tokenIn = isReversed ? CONTRACTS.tokenB : CONTRACTS.tokenA;
  const tokenOut = isReversed ? CONTRACTS.tokenA : CONTRACTS.tokenB;
  const tokenInLabel = isReversed ? "TKB" : "TKA";
  const tokenOutLabel = isReversed ? "TKA" : "TKB";

  const { formatted: pairFormatted } = usePairInfo(CONTRACTS.tokenA, CONTRACTS.tokenB, address);
  const balanceIn = isReversed ? pairFormatted.userToken1Balance : pairFormatted.userToken0Balance;
  const balanceOut = isReversed ? pairFormatted.userToken0Balance : pairFormatted.userToken1Balance;

  const { swap, isPending, isConfirming, isSuccess } = useSwap();
  const {
    formattedAmountOut: amountOut,
    priceImpactPercent: priceImpact,
    isLoading: isQuoting,
  } = useSwapQuote(amountIn, tokenIn, tokenOut);
  const { approve, isPending: isApproving } = useApprove(tokenIn);

  async function handleSwap() {
    if (!address || !amountIn) return;
    await swap(amountIn, "0", tokenIn, tokenOut, address);
    setAmountIn("");
  }

  return (
    <div className="w-full max-w-md mx-auto bg-gray-900 rounded-2xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Swap</h2>

      {/* Input */}
      <div className="bg-gray-800 rounded-xl p-4 mb-2">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>From</span>
          <button
            onClick={() => setAmountIn(balanceIn)}
            className="hover:text-white transition-colors"
          >
            Balance: {Number(balanceIn).toFixed(4)}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            placeholder="0.0"
            value={amountIn}
            onChange={(e) => setAmountIn(e.target.value)}
            className="flex-1 bg-transparent text-2xl text-white outline-none placeholder-gray-600 [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="px-3 py-1 bg-gray-700 rounded-lg text-white font-medium">
            {tokenInLabel}
          </span>
        </div>
      </div>

      {/* Reverse button */}
      <div className="flex justify-center -my-1 relative z-10">
        <button
          onClick={() => {
            setIsReversed(!isReversed);
            setAmountIn("");
          }}
          className="bg-gray-800 border-4 border-gray-900 rounded-lg p-1.5 hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      </div>

      {/* Output */}
      <div className="bg-gray-800 rounded-xl p-4 mt-2">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>To</span>
          <span>Balance: {Number(balanceOut).toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="0.0"
            value={isQuoting ? "..." : amountOut}
            readOnly
            className="flex-1 bg-transparent text-2xl text-white outline-none placeholder-gray-600"
          />
          <span className="px-3 py-1 bg-gray-700 rounded-lg text-white font-medium">
            {tokenOutLabel}
          </span>
        </div>
      </div>

      {/* Trade details */}
      {amountIn && amountOut && (
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Rate</span>
            <span>1 {tokenInLabel} = {(Number(amountOut) / Number(amountIn)).toFixed(6)} {tokenOutLabel}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Price Impact</span>
            <span className={priceImpact && priceImpact > 5 ? "text-red-400" : ""}>
              {priceImpact?.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Fee</span>
            <span>0.3%</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={() => approve()}
          disabled={isApproving || !address}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isApproving ? "Approving..." : `Approve ${tokenInLabel}`}
        </button>
        <button
          onClick={() => void handleSwap()}
          disabled={!amountIn || isPending || isConfirming || !address}
          className="w-full py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {!address
            ? "Connect Wallet"
            : isPending
              ? "Confirm in Wallet..."
              : isConfirming
                ? "Swapping..."
                : "Swap"}
        </button>
      </div>

      {isSuccess && (
        <p className="mt-3 text-center text-sm text-green-400">Swap successful!</p>
      )}
    </div>
  );
}
