import type { RouterConfig } from '@nuxt/schema';
import { createWebHashHistory, createWebHistory } from 'vue-router';

function isWebOS(): boolean {
  if (process.env.WEBOS_BUILD === 'true') return true;
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') return true;
  return false;
}

export default <RouterConfig>{
  history: (base) => (isWebOS() ? createWebHashHistory(base) : createWebHistory(base)),
};
