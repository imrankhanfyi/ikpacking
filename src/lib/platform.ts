import { Capacitor } from '@capacitor/core'

/** True when running inside the Capacitor iOS shell (not in a browser). */
export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}
