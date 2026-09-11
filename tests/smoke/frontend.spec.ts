import { test as base, expect, type Page, type Request } from '@playwright/test'
import { z } from 'zod'

const apiBase = (process.env.PLAYWRIGHT_API_BASE || 'http://localhost:8787/api').replace(/\/?$/, '/')
const postsURL = new URL('posts', apiBase).href
const meURL = new URL('me', apiBase).href
const expectedRelease = process.env.RELEASE_ID || 'local'

const postListSchema = z.object({
  status: z.union([z.literal(200), z.literal('success')]),
  data: z.array(z.object({ title: z.string().min(1), slug: z.string().min(1) })),
})

// Attach listeners before navigation, including lazy route chunks and API requests.
const test = base.extend<{ browserHealth: void }>({
  browserHealth: [async ({ page }, use, testInfo) => {
    const errors: string[] = []
    const isAPI = (url: string) => url.startsWith(apiBase)
    const isRelevant = (request: Request) =>
      ['document', 'script', 'stylesheet'].includes(request.resourceType()) || isAPI(request.url())

    page.on('pageerror', error => errors.push(`JavaScript: ${error.message}`))
    page.on('console', message => {
      if (/hydration.*mismatch/i.test(message.text())) errors.push(`Hydration: ${message.text()}`)
    })
    page.on('requestfailed', request => {
      if (isRelevant(request)) errors.push(`Network: ${request.url()} (${request.failure()?.errorText})`)
    })
    page.on('response', response => {
      const request = response.request()
      // An anonymous visit to the login page intentionally calls GET /me.
      if (request.method() === 'GET' && response.url() === meURL && response.status() === 401) return
      if (isRelevant(request) && response.status() >= 400) {
        errors.push(`HTTP ${response.status()}: ${response.url()}`)
      }
    })

    await use()

    if (errors.length) {
      await testInfo.attach('browser-errors', {
        body: JSON.stringify(errors, null, 2),
        contentType: 'application/json',
      })
    }
    expect.soft(errors, 'No JavaScript, hydration, resource or unexpected API failures').toEqual([])
  }, { auto: true }],
})

async function openPage(page: Page, path: string) {
  const response = await page.goto(path)
  expect(response?.status(), `${path} HTTP status`).toBe(200)
  await expect(page.locator('meta[name="app-release"]')).toHaveAttribute('content', expectedRelease)
  // SSR content can be visible before Vue attaches event handlers.
  await expect.poll(() => page.evaluate(() => {
    const root = document.querySelector('#__nuxt') as (Element & { __vue_app__?: unknown }) | null
    return Boolean(root?.__vue_app__)
  }), { message: 'Vue has mounted the Nuxt app' }).toBe(true)
}

test('homepage renders this release and client navigation works', async ({ page }) => {
  await openPage(page, '/')
  await expect(page.getByRole('heading', { name: 'Welcome to Gerden Blog!', exact: true })).toBeVisible()
  await expect(page).toHaveTitle('Gerden Blog - Welcome')

  await page.getByRole('button', { name: 'LOGIN', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByPlaceholder('USERNAME', { exact: true })).toBeVisible()
})

test('posts API succeeds and its results render, including an empty list', async ({ page }) => {
  await openPage(page, '/')
  // Navigate from home so the real browser, rather than SSR, requests the API.
  const [response] = await Promise.all([
    page.waitForResponse(response => response.url() === postsURL && response.request().method() === 'GET'),
    page.getByRole('link', { name: 'POSTS', exact: true }).click(),
  ])
  expect(response.status(), 'Posts API HTTP status').toBe(200)
  const payload = postListSchema.parse(await response.json())

  await expect(page).toHaveURL(/\/posts$/)
  await expect(page.getByRole('heading', { name: 'Posts', exact: true })).toBeVisible()
  const links = page.locator('a[href^="/posts/"]')
  await expect(links).toHaveCount(payload.data.length)
  for (const [index, post] of payload.data.slice(0, 3).entries()) {
    await expect(links.nth(index)).toContainText(post.title)
    await expect(links.nth(index)).toHaveAttribute('href', `/posts/${post.slug}`)
  }
})

test('login form is usable and client validation works without submitting', async ({ page }) => {
  await openPage(page, '/login')
  const username = page.getByPlaceholder('USERNAME', { exact: true })
  const password = page.getByPlaceholder('PASSWORD', { exact: true })
  await expect(username).toBeEditable()
  await expect(password).toBeEditable()
  await expect(password).toHaveAttribute('type', 'password')
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeEnabled()

  await username.focus()
  await username.blur()
  await expect(page.getByText('Format Error', { exact: true })).toBeVisible()
  await username.fill('smoke-reader')
  await username.blur()
  await expect(page.getByText('Format Error', { exact: true })).toHaveCount(0)
})
