type FileSharing = {
  canShare?: (data: ShareData) => boolean
  share?: (data: ShareData) => Promise<void>
}

export function canShareFile(file: File, api: FileSharing): boolean {
  try { return Boolean(api.share && api.canShare?.({ files: [file] })) }
  catch { return false }
}

/** Invoke directly from a click after the PNG is ready to retain user activation. */
export async function shareFile(file: File, api: FileSharing): Promise<'shared' | 'cancelled' | 'unavailable'> {
  if (!canShareFile(file, api)) return 'unavailable'
  try {
    await api.share!({ files: [file], title: 'Tailor-Made Arcade' })
    return 'shared'
  } catch (error) {
    return error instanceof Error && error.name === 'AbortError' ? 'cancelled' : 'unavailable'
  }
}
