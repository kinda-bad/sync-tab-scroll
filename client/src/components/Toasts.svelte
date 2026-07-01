<script lang="ts">
  import { toastStore } from '../toast-store';
</script>

<div class="toasts">
  {#each $toastStore as toast (toast.id)}
    <div class="toast">{toast.message}</div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    z-index: 1000;
  }

  .toast {
    background: #1e1e24;
    color: #ffe600;
    padding: 0.5rem 1rem;
    border-radius: 4px;
  }
</style>
