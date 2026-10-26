<script setup>
defineProps({ busy: Boolean });
defineEmits(['activate']);
</script>

<template>
  <!-- Correct today, but this independent radius ignores future owner changes. -->
  <button :disabled="busy" :aria-busy="busy ? 'true' : undefined"
    style="border-radius: 10px" @click="$emit('activate')">Save</button>
</template>
