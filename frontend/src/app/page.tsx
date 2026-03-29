import { SwapCard } from "@/components/SwapCard";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function SwapPage() {
  return (
    <div className="w-full flex flex-col items-center">
      <SwapCard />
      <ActivityFeed />
    </div>
  );
}
