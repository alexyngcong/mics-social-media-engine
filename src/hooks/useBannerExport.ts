import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { drawBannerCanvas } from '../components/banner/BannerCanvas';
import { ROOMS } from '../config/rooms';
import { PLATFORMS } from '../config/platforms';

export function useBannerExport() {
  const store = useAppStore();

  const saveBanner = useCallback(async () => {
    const { result, room, bannerVariant, platform, imageDimensionIndex } = store;
    if (!result || !room) return;

    store.setError('');
    const rm = ROOMS.find((r) => r.id === room);
    const plat = PLATFORMS.find((p) => p.id === platform);
    if (!rm || !plat) return;

    const dim = plat.imageDimensions[imageDimensionIndex] || plat.imageDimensions[0];

    try {
      const canvas = drawBannerCanvas(result, rm, bannerVariant, dim.width, dim.height);
      if (!canvas) throw new Error('Render failed');

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Export failed'))),
          'image/png',
          1.0
        );
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MICS_${rm.short.toUpperCase()}_${plat.id}_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      return true;
    } catch (e) {
      store.setError('Save error: ' + (e instanceof Error ? e.message : 'Unknown'));
      return false;
    }
  }, [store.result, store.room, store.bannerVariant, store.platform, store.imageDimensionIndex]);

  return { saveBanner };
}
