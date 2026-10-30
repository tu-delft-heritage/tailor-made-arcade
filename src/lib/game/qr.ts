import qrcode from 'qrcode-generator'

/** Keep a four-module quiet zone and the encoder's square modules intact. */
export function qrCode(url: string) {
  const code = qrcode(0, 'M')
  code.addData(url, 'Byte')
  code.make()
  const modules = code.getModuleCount()
  const path: string[] = []
  for (let row = 0; row < modules; row++) for (let column = 0; column < modules; column++) {
    if (code.isDark(row, column)) path.push(`M${column + 4} ${row + 4}h1v1h-1z`)
  }
  return { url, size: modules + 8, path: path.join('') }
}
