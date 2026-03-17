import React, { useEffect, useRef, useState } from "react";
import { CountdownTimerContext } from "./CountdownTimerContextObject";

const COUNTDOWN_SECONDS = 180;

export const CountdownTimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const start = () => {
    setIsRunning(true);
  };

  const reset = () => {
    setIsRunning(false);
    setSecondsLeft(COUNTDOWN_SECONDS);
  };

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  return (
    <CountdownTimerContext.Provider value={{ secondsLeft, isRunning, start, reset }}>
      {children}
    </CountdownTimerContext.Provider>
  );
};

