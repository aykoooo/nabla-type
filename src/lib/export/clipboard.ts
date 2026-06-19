/**
 * Clipboard helpers for export.
 *
 * Writes PNG images or SVG text when the Clipboard API is available and
 * the page is served over a secure context. Returns false on failure so
 * callers can fall back to a download.
 */

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard || !window.isSecureContext) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (e) {
    console.warn('[clipboard] Text copy failed:', e)
    return false
  }
}

export async function copyPngBlobToClipboard(blob: Blob): Promise<boolean> {
  if (!navigator.clipboard || !window.isSecureContext) return false
  try {
    if (!('ClipboardItem' in window)) return false
    const item = new ClipboardItem({ 'image/png': blob })
    await navigator.clipboard.write([item])
    return true
  } catch (e) {
    console.warn('[clipboard] PNG copy failed:', e)
    return false
  }
}
