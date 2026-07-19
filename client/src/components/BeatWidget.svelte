<script lang="ts">
  // Red-state stub (T007, constitution Principle VII) — full widget lands
  // on the paired green commit.
  export let countInEnabled: boolean = false;
  export let metronomeOn: boolean = false;
  export let phase: 'count-in' | 'playing' | 'idle' = 'idle';
  export let beatInBar: number = 1;
  export let beatCount: number = 4;
  export let barNumber: number = 1;
  export let beatDurationMs: number = 500;

  // Referenced to satisfy the compiler in the stub.
  void countInEnabled;
  void metronomeOn;
  void phase;
  void beatInBar;
  void beatCount;
  void barNumber;
  void beatDurationMs;
</script>
