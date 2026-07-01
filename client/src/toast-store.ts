import { writable } from 'svelte/store';

export interface Toast {
  id: number;
  message: string;
}

let nextId = 0;

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function push(message: string): void {
    const id = nextId++;
    update((toasts) => [...toasts, { id, message }]);
    setTimeout(() => update((toasts) => toasts.filter((t) => t.id !== id)), 5000);
  }

  return { subscribe, push };
}

/** Errors (join-by-code failure, part-not-found, not-host attempts) are surfaced as toasts, not blocking modals (ui.md States). */
export const toastStore = createToastStore();
