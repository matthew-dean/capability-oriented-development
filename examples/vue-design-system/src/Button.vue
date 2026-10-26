<script setup>
import { theme } from './theme.mjs';
defineProps({ busy: Boolean });
defineEmits(['activate']);
</script>

<template>
  <button
    :disabled="busy"
    :aria-busy="busy ? 'true' : undefined"
    :style="{ borderRadius: theme.radius }"
    @click="$emit('activate')"
  ><slot /></button>
</template>
