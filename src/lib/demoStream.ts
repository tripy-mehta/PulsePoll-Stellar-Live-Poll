import { POLL_OPTIONS, type PollOptionId } from "../config";
import type { PollResults, VoteEvent } from "../types";

const DEMO_VOTERS = [
  "GC4G3WQ3NCX2Z6BVIMPV2Y5H6SQE2A6L3BKJ2CRYNXFLPR5UF22LIVE",
  "GASZ3LXUMWQ3E3EHYR2X5L4KBPZTZVYSM7Q2H43JJH4TVW4X8PULSE",
  "GDY8RMVR37KAZ4NARV8R7GV44H35WMDK2UNH8M4PQL6RSGN5VOTE1"
];

export function createInitialResults(): PollResults {
  return POLL_OPTIONS.reduce(
    (acc, option, index) => ({ ...acc, [option.id]: 3 - index }),
    {} as PollResults
  );
}

export function createDemoEvent(index: number): VoteEvent {
  const option = POLL_OPTIONS[index % POLL_OPTIONS.length].id as PollOptionId;

  return {
    id: `demo-${Date.now()}-${index}`,
    option,
    voter: DEMO_VOTERS[index % DEMO_VOTERS.length],
    ledger: 420000 + index,
    txHash: `demo-${Math.random().toString(16).slice(2, 10)}`,
    createdAt: new Date().toISOString()
  };
}
