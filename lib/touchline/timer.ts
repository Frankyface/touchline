export type ClockState = { remaining: number; deadline: number | null };
export function secondsRemaining(clock: ClockState, now: number): number {
  return clock.deadline === null
    ? clock.remaining
    : Math.ceil((clock.deadline - now) / 1000);
}
export function pauseClock(clock: ClockState, now: number): ClockState {
  return { remaining: secondsRemaining(clock, now), deadline: null };
}
export function toggleClock(clock: ClockState, now: number): ClockState {
  return clock.deadline === null
    ? { ...clock, deadline: now + clock.remaining * 1000 }
    : pauseClock(clock, now);
}
export function extendClock(clock: ClockState, seconds: number): ClockState {
  return {
    remaining: clock.remaining + seconds,
    deadline: clock.deadline === null ? null : clock.deadline + seconds * 1000,
  };
}
export function formatClock(seconds: number): string {
  const absolute = Math.abs(seconds);
  return `${seconds < 0 ? "+" : ""}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}
