<script setup>
import SharedButton from './Button.vue';
defineProps({ busy: Boolean });
defineEmits(['activate']);
</script>

<template>
  <div class="page-layout">
    <SharedButton :busy="busy" @activate="$emit('activate')">Save</SharedButton>
  </div>
</template>
