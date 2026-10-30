import { qrCode } from './qr.ts'

export function objectQr(objectId: string) {
  return qrCode(`https://heritage.tudelft.nl/objects/${objectId}`)
}
