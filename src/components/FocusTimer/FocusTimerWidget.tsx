import React, { useEffect, useState } from "react";
import { CircularTimer } from "./CircularTimer";
import type { FocusTimer } from "@/types";
import { clearFocusTimer, getFocusTimer, setFocusTimer } from "@/lib/storage/focusTimer";
import { activeTimer } from "@/utils";

export const FocusTimerWidget: React.FC = () => {
  const timerDuration = 1;
  const [timer, setTimer] = useState<FocusTimer | null>(null);

  useEffect(() => {
    const loadCurrentimer = async () => {
      const pTimer = await getFocusTimer();
      setTimer(pTimer);
    };
    loadCurrentimer();
  });

  const handleStartTimer = () => {
    const pTimer: FocusTimer = { startTime: Date.now(), duration: timerDuration };
    setTimer(pTimer);
    setFocusTimer(pTimer);
  };

  const handleEndSession = () => {
    setTimer(null);
    clearFocusTimer();
  };
  //The lion does not care about code duplication
  const endTimer = () => {
    setTimer(null);
    clearFocusTimer();
  };

  if (timer && activeTimer(timer)) {
    return (
      <>
        <CircularTimer timer={timer} onComplete={endTimer} />
        <button onClick={handleEndSession}>End session early WHAT</button>
      </>
    );
  } else {
    return <button onClick={handleStartTimer}> StartTimer</button>;
  }
};

export default FocusTimerWidget;
