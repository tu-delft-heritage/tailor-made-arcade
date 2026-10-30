export function siteHomeUrl(value: string | undefined) {
  if (!value?.trim()) return undefined
  const url = new URL(value.trim())
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('PUBLIC_SITE_URL must be an absolute HTTP(S) URL')
  url.search = ''
  url.hash = ''
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/`
  return url.href
}
