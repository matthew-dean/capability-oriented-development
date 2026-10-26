<script setup>
import SharedButton from './Button.vue';
defineProps({ busy: Boolean });
defineEmits(['activate']);
</script>

<template>
  <!-- Real component, but its radius is replaced at the consumer boundary. -->
  <SharedButton :busy="busy" style="border-radius: 10px" @activate="$emit('activate')">Save</SharedButton>
</template>
