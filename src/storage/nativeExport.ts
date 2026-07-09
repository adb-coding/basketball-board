// Native (Capacitor / Android) file export.
//
// In a browser, `<a download>` saves the blob to the Downloads folder. Inside an
// Android WebView that anchor does nothing — the blob is never written anywhere.
// On native we instead write the blob to the app's cache and open the system
// share sheet, so the user can save it to Files / Gallery / Drive / WhatsApp.
//
// The @capacitor/* packages are only present in the Android build, so they are
// pulled in with dynamic imports and the web bundle never depends on them.

/** true when running inside the Capacitor native runtime (Android/iOS) */
export function isNativePlatform(): boolean {
  const cap = (globalThis as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      // strip the "data:<mime>;base64," prefix
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Write `blob` to the native filesystem and open the share sheet.
 * Returns true if handled natively, false if not on a native platform.
 */
export async function saveAndShare(blob: Blob, filename: string): Promise<boolean> {
  if (!isNativePlatform()) return false;

  // @ts-ignore optional native dependency, only installed in the Capacitor build
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  // @ts-ignore optional native dependency, only installed in the Capacitor build
  const { Share } = await import('@capacitor/share');

  const data = await blobToBase64(blob);
  await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
  const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });

  await Share.share({
    title: filename,
    url: uri,
    dialogTitle: 'Save or share export',
  });
  return true;
}
