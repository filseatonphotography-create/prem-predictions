import { useEffect, useRef } from "react";

export default function useLiveResultsPolling(refresh, mode, intervalMs) {
  const latestRefresh = useRef(refresh);
  useEffect(() => { latestRefresh.current = refresh; }, [refresh]);
  useEffect(() => {
    let cancelled = false;
    let timer;
    const tick = async () => {
      try { await latestRefresh.current(); }
      catch { /* The refresh handler reports its own connection status. Retry next tick. */ }
      finally { if (!cancelled) timer = setTimeout(tick, intervalMs); }
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [mode, intervalMs]);
}
