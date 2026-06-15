const encoder = new TextEncoder()
const ITERATIONS = 100_000
const KEY_BITS = 256

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function fromBase64Url(value: string) {
  const base64 = value.replaceAll('-',
    '+').replaceAll('_', '/')
  const padded =
    base64.padEnd(Math.ceil(base64.length / 4) *
      4, '=')
  return Uint8Array.from(atob(padded), (char) =>
    char.charCodeAt(0))
}