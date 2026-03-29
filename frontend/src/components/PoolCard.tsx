"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { formatEther, type Address } from "viem";
import { CONTRACTS, ABIS } from "@/config/contracts";
import { useAddLiquidity } from "@/hooks/useAddLiquidity";
import { useRemoveLiquidity } from "@/hooks/useRemoveLiquidity";
import { useApprove } from "@/hooks/useApprove";
import { useTokenBalance } from "@/hooks/useTokenBalance";

type Tab = "add" | "remove";

export function PoolCard() {
  const { address } = useAccount();
  const [tab, setTab] = useState<Tab>("add");
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [lpAmount, setLpAmount] = useState("");

  const { formatted: balanceA } = useTokenBalance(CONTRACTS.tokenA, address);
  const { formatted: balanceB } = useTokenBalance(CONTRACTS.tokenB, address);

  const {
    addLiquidity,
    isPending: isAddPending,
    isConfirming: isAddConfirming,
    isSuccess: isAddSuccess,
  } = useAddLiquidity();

  const {
    removeLiquidity,
    isPending: isRemovePending,
    isConfirming: isRemoveConfirming,
    isSuccess: isRemoveSuccess,
  } = useRemoveLiquidity();

  const { approve: approveA, isPending: isApprovingA } = useApprove(CONTRACTS.tokenA);
  const { approve: approveB, isPending: isApprovingB } = useApprove(CONTRACTS.tokenB);

  // Read pair address
  const { data: pairAddress } = useReadContract({
    address: CONTRACTS.factory,
    abi: ABIS.factory,
    functionName: "getPair",
    args: [CONTRACTS.tokenA, CONTRACTS.tokenB],
  });

  const pairExists = !!pairAddress && pairAddress !== "0x0000000000000000000000000000000000000000";

  // Read reserves
  const { data: reserves } = useReadContract({
    address: pairAddress as Address | undefined,
    abi: ABIS.pair,
    functionName: "getReserves",
    query: { enabled: pairExists },
  });

  // Read LP balance
  const { balance: lpBalance, formatted: lpFormatted } = useTokenBalance(
    pairAddress as Address,
    address,
  );

  // Read LP total supply
  const { data: lpTotalSupply } = useReadContract({
    address: pairAddress as Address | undefined,
    abi: ABIS.pair,
    functionName: "totalSupply",
    query: { enabled: pairExists },
  });

  // Approve LP token for router (for remove liquidity)
  const { approve: approveLp, isPending: isApprovingLp } = useApprove(
    pairAddress as Address,
  );

  // Reset inputs on success
  useEffect(() => {
    if (isAddSuccess) { setAmountA(""); setAmountB(""); }
  }, [isAddSuccess]);

  useEffect(() => {
    if (isRemoveSuccess) setLpAmount("");
  }, [isRemoveSuccess]);

  const [r0, r1] = (reserves as [bigint, bigint]) || [0n, 0n];
  const totalSupply = (lpTotalSupply as bigint) || 0n;

  // Calculate share percentage
  const sharePercent = lpBalance && totalSupply > 0n
    ? (Number(lpBalance) / Number(totalSupply) * 100).toFixed(2)
    : "0.00";

  // Calculate estimated token amounts when removing
  const removeAmountA = lpAmount && totalSupply > 0n && r0 > 0n
    ? (Number(lpAmount) / Number(formatEther(totalSupply)) * Number(formatEther(r0))).toFixed(4)
    : "0";
  const removeAmountB = lpAmount && totalSupply > 0n && r1 > 0n
    ? (Number(lpAmount) / Number(formatEther(totalSupply)) * Number(formatEther(r1))).toFixed(4)
    : "0";

  function handleAdd() {
    if (!address || !amountA || !amountB) return;
    addLiquidity(CONTRACTS.tokenA, CONTRACTS.tokenB, amountA, amountB, address);
  }

  function handleRemove() {
    if (!address || !lpAmount) return;
    removeLiquidity(CONTRACTS.tokenA, CONTRACTS.tokenB, lpAmount, address);
  }

  function setRemovePercent(pct: number) {
    if (!lpBalance) return;
    const amount = Number(formatEther(lpBalance)) * pct / 100;
    setLpAmount(amount.toString());
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Pool Stats */}
      {pairExists && (
        <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 mb-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Pool Overview</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">TKA Reserve</p>
              <p className="text-lg text-white font-medium">
                {Number(formatEther(r0)).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">TKB Reserve</p>
              <p className="text-lg text-white font-medium">
                {Number(formatEther(r1)).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Your LP Tokens</p>
              <p className="text-lg text-white font-medium">
                {Number(lpFormatted).toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pool Share</p>
              <p className="text-lg text-white font-medium">{sharePercent}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Add / Remove Card */}
      <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
        {/* Tab Switch */}
        <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-5">
          <button
            onClick={() => setTab("add")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "add" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Add
          </button>
          <button
            onClick={() => setTab("remove")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "remove" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Remove
          </button>
        </div>

        {tab === "add" ? (
          <>
            {/* Token A */}
            <div className="bg-gray-800 rounded-xl p-4 mb-3">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>TKA</span>
                <button
                  onClick={() => setAmountA(balanceA)}
                  className="hover:text-white transition-colors"
                >
                  Balance: {Number(balanceA).toFixed(4)}
                </button>
              </div>
              <input
                type="number"
                placeholder="0.0"
                value={amountA}
                onChange={(e) => setAmountA(e.target.value)}
                className="w-full bg-transparent text-2xl text-white outline-none placeholder-gray-600 [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Token B */}
            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>TKB</span>
                <button
                  onClick={() => setAmountB(balanceB)}
                  className="hover:text-white transition-colors"
                >
                  Balance: {Number(balanceB).toFixed(4)}
                </button>
              </div>
              <input
                type="number"
                placeholder="0.0"
                value={amountB}
                onChange={(e) => setAmountB(e.target.value)}
                className="w-full bg-transparent text-2xl text-white outline-none placeholder-gray-600 [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => approveA()}
                  disabled={isApprovingA || !address}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isApprovingA ? "..." : "Approve TKA"}
                </button>
                <button
                  onClick={() => approveB()}
                  disabled={isApprovingB || !address}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isApprovingB ? "..." : "Approve TKB"}
                </button>
              </div>
              <button
                onClick={handleAdd}
                disabled={!amountA || !amountB || isAddPending || isAddConfirming || !address}
                className="w-full py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAddPending ? "Confirm in Wallet..." : isAddConfirming ? "Adding..." : "Add Liquidity"}
              </button>
            </div>

            {isAddSuccess && (
              <p className="mt-3 text-center text-sm text-green-400">Liquidity added!</p>
            )}
          </>
        ) : (
          <>
            {/* LP Amount */}
            <div className="bg-gray-800 rounded-xl p-4 mb-3">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>LP Tokens</span>
                <button
                  onClick={() => setLpAmount(lpFormatted)}
                  className="hover:text-white transition-colors"
                >
                  Balance: {Number(lpFormatted).toFixed(4)}
                </button>
              </div>
              <input
                type="number"
                placeholder="0.0"
                value={lpAmount}
                onChange={(e) => setLpAmount(e.target.value)}
                className="w-full bg-transparent text-2xl text-white outline-none placeholder-gray-600 [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Quick percent buttons */}
            <div className="flex gap-2 mb-4">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setRemovePercent(pct)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Estimated output */}
            {lpAmount && Number(lpAmount) > 0 && (
              <div className="bg-gray-800 rounded-xl p-3 mb-4 text-sm">
                <p className="text-gray-500 mb-1">You will receive (estimated):</p>
                <div className="flex justify-between text-gray-300">
                  <span>{removeAmountA} TKA</span>
                  <span>{removeAmountB} TKB</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={() => approveLp()}
                disabled={isApprovingLp || !address || !pairExists}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isApprovingLp ? "Approving..." : "Approve LP Token"}
              </button>
              <button
                onClick={handleRemove}
                disabled={!lpAmount || isRemovePending || isRemoveConfirming || !address}
                className="w-full py-3 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRemovePending ? "Confirm in Wallet..." : isRemoveConfirming ? "Removing..." : "Remove Liquidity"}
              </button>
            </div>

            {isRemoveSuccess && (
              <p className="mt-3 text-center text-sm text-green-400">Liquidity removed!</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
