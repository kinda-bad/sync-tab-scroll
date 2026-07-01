import { createTabRenderer } from './tab-renderer';

/**
 * The lyrics-part participant renders no staff (ui.md), but still runs a
 * full alphaTab instance for the shared clock and metronome/count-in audio
 * (infrastructure.md Session & Real-Time Sync) — the same mechanism as an
 * instrument participant, not a bespoke lighter clock. The container is a
 * real element (alphaTab's browser facade requires one) kept out of the
 * visible layout rather than appended to it.
 */
export function createHeadlessPlayer(gpFilePath: string, trackIndex: number) {
  const container = document.createElement('div');
  container.style.display = 'none';
  document.body.appendChild(container);

  const api = createTabRenderer({ container, gpFilePath, trackIndex });

  const originalDestroy = api.destroy.bind(api);
  api.destroy = () => {
    originalDestroy();
    container.remove();
  };

  return api;
}
