import { createApp, h } from 'vue';
import Settings from './Settings.vue';

const busy = new URLSearchParams(location.search).get('busy') === 'true';
createApp({
  render() {
    return h(Settings, {
      busy,
      onActivate: () => { document.querySelector('[role=status]').textContent = 'Saved'; },
    });
  },
}).mount('#app');
