import { useCallback, useEffect, useRef, useState } from "react";

export function useCountdown(
  totalSeconds: number,
  onTick: () => void,
  enabled = true
) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!enabled) return;
    setRemaining(totalSeconds);
  }, [totalSeconds, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          onTickRef.current();
          return totalSeconds;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [totalSeconds, enabled]);

  const reset = useCallback(() => setRemaining(totalSeconds), [totalSeconds]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return { remaining, display, reset };
}
