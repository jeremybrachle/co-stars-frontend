import { useContext } from "react";
import { CountdownTimerContext } from "./CountdownTimerContextObject";

export function useCountdownTimer() {
  const ctx = useContext(CountdownTimerContext);
  if (!ctx) throw new Error("useCountdownTimer must be used within a CountdownTimerProvider");
  return ctx;
}
