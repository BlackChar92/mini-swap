import { BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Swap as SwapEvent,
  Mint as MintEvent,
  Burn as BurnEvent,
  Sync as SyncEvent,
} from "../../generated/templates/MiniPair/MiniPair";
import { Pair, Swap, Mint, Burn } from "../../generated/schema";

function toDecimal(value: BigInt): BigDecimal {
  return value.toBigDecimal().div(
    BigInt.fromI32(10).pow(18).toBigDecimal()
  );
}

export function handleSwap(event: SwapEvent): void {
  let swap = new Swap(
    Bytes.fromHexString(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    )
  );
  swap.pair = event.address;
  swap.sender = event.params.sender;
  swap.to = event.params.to;
  swap.amount0In = toDecimal(event.params.amount0In);
  swap.amount1In = toDecimal(event.params.amount1In);
  swap.amount0Out = toDecimal(event.params.amount0Out);
  swap.amount1Out = toDecimal(event.params.amount1Out);
  swap.timestamp = event.block.timestamp;
  swap.blockNumber = event.block.number;
  swap.transactionHash = event.transaction.hash;
  swap.save();
}

export function handleMint(event: MintEvent): void {
  let mint = new Mint(
    Bytes.fromHexString(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    )
  );
  mint.pair = event.address;
  mint.sender = event.params.sender;
  mint.amount0 = toDecimal(event.params.amount0);
  mint.amount1 = toDecimal(event.params.amount1);
  mint.timestamp = event.block.timestamp;
  mint.blockNumber = event.block.number;
  mint.transactionHash = event.transaction.hash;
  mint.save();
}

export function handleBurn(event: BurnEvent): void {
  let burn = new Burn(
    Bytes.fromHexString(
      event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
    )
  );
  burn.pair = event.address;
  burn.sender = event.params.sender;
  burn.to = event.params.to;
  burn.amount0 = toDecimal(event.params.amount0);
  burn.amount1 = toDecimal(event.params.amount1);
  burn.timestamp = event.block.timestamp;
  burn.blockNumber = event.block.number;
  burn.transactionHash = event.transaction.hash;
  burn.save();
}

export function handleSync(event: SyncEvent): void {
  let pair = Pair.load(event.address);
  if (pair === null) return;
  pair.reserve0 = toDecimal(event.params.reserve0);
  pair.reserve1 = toDecimal(event.params.reserve1);
  pair.save();
}
