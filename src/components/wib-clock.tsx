"use client";

import { useEffect, useState } from "react";
import { formatWibTime } from "./labels";

/** Live WIB clock. Server renders the initial value so there is no hydration mismatch or layout shift. */
export function WibClock({ initial }: { initial: string }) {
  const [now, setNow] = useState(initial);
  useEffect(() => {
    const tick = () => setNow(formatWibTime(new Date()));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);
  return (
    <time className="tabular-nums" suppressHydrationWarning>
      {now}
    </time>
  );
}
