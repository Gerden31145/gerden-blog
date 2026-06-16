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

// 根据密码、盐和迭代次数，计算出一个稳定的哈希结果
async function derive(password: string, salt:
  Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2', hash: 'SHA-256', salt,
      iterations
    },
    key,
    KEY_BITS
  )

  return new Uint8Array(bits)
}

// 哈希加密密码
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt, ITERATIONS)

  return `pbkdf2-sha256$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`
}

// 配对密码
export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterations, salt, expectedHash]
    = stored.split('$')

  if (scheme !== 'pbkdf2-sha256') return false

  const actual = await derive(
    password,
    fromBase64Url(salt),
    Number(iterations)
  )

  const expected = fromBase64Url(expectedHash)

  if (actual.length !== expected.length) return false

  let diff = 0
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i] ^ expected[i]
  }

  return diff === 0
}
