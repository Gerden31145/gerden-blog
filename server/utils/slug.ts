export function generateSlug(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return slug || `post-${Date.now()}`
}