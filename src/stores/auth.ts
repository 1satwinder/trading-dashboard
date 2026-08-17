import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchSession, signIn, signOut } from '@/services/marketData'

/**
 * Session state for the paper-trading write actions (ADR-024).
 *
 * There are no user accounts — a single passcode unlocks placing and cancelling
 * orders, and everything else in the app is readable signed out. The session
 * itself lives in an HttpOnly cookie the browser can't read, so this store
 * mirrors it: the BFF stays the only authority and a 401 on any write flips
 * `isAuthenticated` back to false.
 */
export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const checking = ref(false)
  const submitting = ref(false)
  const error = ref<string | null>(null)

  /** Lets any component open the sign-in dialog without prop-drilling. */
  const promptVisible = ref(false)

  /** Read the cookie's status once on boot (it survives reloads). */
  async function checkSession() {
    checking.value = true
    try {
      const { authenticated } = await fetchSession()
      isAuthenticated.value = authenticated
    } catch {
      // Treat an unreachable BFF as signed out; the writes would fail anyway.
      isAuthenticated.value = false
    } finally {
      checking.value = false
    }
  }

  /** Returns true on success; the error message is exposed for the dialog. */
  async function logIn(passcode: string): Promise<boolean> {
    submitting.value = true
    error.value = null
    try {
      const { authenticated } = await signIn(passcode)
      isAuthenticated.value = authenticated
      promptVisible.value = false
      return authenticated
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Could not sign in.'
      isAuthenticated.value = false
      return false
    } finally {
      submitting.value = false
    }
  }

  async function logOut() {
    try {
      await signOut()
    } finally {
      // Clear locally even if the call failed — the cookie expires on its own.
      isAuthenticated.value = false
    }
  }

  /** Called when a write comes back 401, e.g. the cookie expired mid-session. */
  function markSignedOut() {
    isAuthenticated.value = false
  }

  function openPrompt() {
    error.value = null
    promptVisible.value = true
  }

  return {
    isAuthenticated,
    checking,
    submitting,
    error,
    promptVisible,
    checkSession,
    logIn,
    logOut,
    markSignedOut,
    openPrompt,
  }
})
