import { createContext } from "react";

export interface CountdownTimerContextValue {
  secondsLeft: number;
  isRunning: boolean;
  start: () => void;
  reset: () => void;
}

export const CountdownTimerContext = createContext<CountdownTimerContextValue | undefined>(undefined);
