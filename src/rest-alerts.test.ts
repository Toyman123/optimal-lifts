import { describe, expect, it } from 'vitest'
import { urlBase64ToUint8Array } from './rest-alerts'

describe('urlBase64ToUint8Array', () => {
  it('decodes base64url VAPID keys', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID_-8'))).toEqual([1, 2, 3, 255, 239])
  })
})
