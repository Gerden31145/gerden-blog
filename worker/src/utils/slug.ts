export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'post'
}

export function uniqueSlug(value: string, id: string | number) {
  return `${slugify(value)}-${id}`
}