import { useStore } from './index'

/** Run `fn` exactly once, as soon as the persisted store has hydrated. */
export function whenHydrated(fn: () => void): void {
  let done = false
  const run = () => {
    if (done) return
    done = true
    fn()
  }
  if (useStore.persist.hasHydrated()) {
    run()
  } else {
    useStore.persist.onFinishHydration(run)
  }
}
