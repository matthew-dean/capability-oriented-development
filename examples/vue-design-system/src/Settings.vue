<script setup>
import SharedButton from './Button.vue';
defineProps({ busy: Boolean });
defineEmits(['activate']);
</script>

<template>
  <SharedButton :busy="busy" @activate="$emit('activate')">Save</SharedButton>
</template>
