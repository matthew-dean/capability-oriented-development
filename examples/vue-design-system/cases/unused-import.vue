<script setup>
import SharedButton from './Button.vue';
defineProps({ busy: Boolean });
defineEmits(['activate']);
</script>

<template>
  <!-- Importing the real component does not make this copy use it. -->
  <button :disabled="busy" :aria-busy="busy ? 'true' : undefined"
    style="border-radius: 10px" @click="$emit('activate')">Save</button>
</template>
