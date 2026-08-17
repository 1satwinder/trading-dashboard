<script setup lang="ts">
import { ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useAuthStore } from '@/stores/auth'

/**
 * Owner sign-in for the paper-trading actions (ADR-024). Opened from anywhere
 * via `useAuthStore().openPrompt()`; mounted once in the top bar.
 */

const auth = useAuthStore()
const passcode = ref('')

watch(
  () => auth.promptVisible,
  (open) => {
    if (open) passcode.value = ''
  },
)

async function submit() {
  if (!passcode.value || auth.submitting) return
  await auth.logIn(passcode.value)
}
</script>

<template>
  <Dialog
    v-model:visible="auth.promptVisible"
    modal
    header="Sign in to trade"
    :style="{ width: '22rem' }"
    :draggable="false"
  >
    <p class="text-sm text-muted-color">
      Browsing is open to everyone. Placing and cancelling paper orders needs the owner passcode.
    </p>

    <div class="mt-4">
      <label for="passcode" class="mb-1 block text-sm text-muted-color">Passcode</label>
      <Password
        v-model="passcode"
        input-id="passcode"
        :feedback="false"
        toggle-mask
        autofocus
        fluid
        @keyup.enter="submit"
      />
    </div>

    <Message v-if="auth.error" severity="error" :closable="false" class="mt-3" size="small">
      {{ auth.error }}
    </Message>

    <template #footer>
      <Button
        label="Cancel"
        text
        severity="secondary"
        :disabled="auth.submitting"
        @click="auth.promptVisible = false"
      />
      <Button label="Sign in" :loading="auth.submitting" :disabled="!passcode" @click="submit" />
    </template>
  </Dialog>
</template>
