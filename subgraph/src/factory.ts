import { PairCreated } from "../../generated/MiniFactory/MiniFactory";
import { Pair } from "../../generated/schema";
import { MiniPair as MiniPairTemplate } from "../../generated/templates";
import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export function handlePairCreated(event: PairCreated): void {
  let pair = new Pair(event.params.pair);
  pair.token0 = event.params.token0;
  pair.token1 = event.params.token1;
  pair.reserve0 = BigDecimal.zero();
  pair.reserve1 = BigDecimal.zero();
  pair.totalSupply = BigDecimal.zero();
  pair.createdAtTimestamp = event.block.timestamp;
  pair.createdAtBlockNumber = event.block.number;
  pair.save();

  // Start indexing the new pair contract
  MiniPairTemplate.create(event.params.pair);
}
