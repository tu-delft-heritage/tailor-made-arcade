import { copy } from './i18n.ts'
import { siteHomeUrl } from './site-url.ts'
import type { Language } from './types.ts'

type FileSharing = {
  canShare?: (data: ShareData) => boolean
  share?: (data: ShareData) => Promise<void>
}

export function canShareFile(file: File, api: FileSharing): boolean {
  try { return Boolean(api.share && api.canShare?.({ files: [file] })) }
  catch { return false }
}

/** Invoke directly from a click after the PNG is ready to retain user activation. */
export async function shareFile(file: File, api: FileSharing, context: { language: Language; siteUrl?: string }): Promise<'shared' | 'cancelled' | 'unavailable'> {
  if (!canShareFile(file, api)) return 'unavailable'
  try {
    const gameUrl = siteHomeUrl(context.siteUrl) ?? 'https://tu-delft-heritage.github.io/tailor-made-arcade/'
    // Keep the link in the caption so file-sharing targets receive one complete message.
    await api.share!({
      files: [file],
      title: 'Tailor-Made Arcade',
      text: `${copy[context.language].shareInvitation}\n\n${gameUrl}`
    })
    return 'shared'
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'unavailable'
  }
}
