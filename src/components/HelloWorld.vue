<script lang="ts" setup>
import { ref } from 'vue'

const props = defineProps<{
  msg: string
}>()

const count = ref(0)

function increment() {
  count.value++
}
</script>

<template>
  <h1>{{ props.msg }}</h1>
  <button @click="increment">Increment {{ count }}</button>
</template>

<style scoped>
button {
  margin-top: 20px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
}
</style>
