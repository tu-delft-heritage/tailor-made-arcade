export const IDLE_MILLISECONDS = 60_000
export const IDLE_WARNING_MILLISECONDS = 15_000

/** One-shot inactivity timer: input resets it; expiry stays asleep until input. */
export function createInactivityTimer(onIdle: () => void, delay = IDLE_MILLISECONDS, onWarning?: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let warning: ReturnType<typeof setTimeout> | undefined
  function stop() { clearTimeout(timer); clearTimeout(warning); timer = undefined; warning = undefined }
  function reset() {
    stop()
    if (onWarning) warning = setTimeout(() => { warning = undefined; onWarning() }, Math.max(0, delay - IDLE_WARNING_MILLISECONDS))
    timer = setTimeout(() => { timer = undefined; onIdle() }, delay)
  }
  reset()
  return { reset, stop }
}
