import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

test.describe('Deploy smoke tests', () => {
  test('app shell loads without crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await expect(page.locator('#root')).not.toBeEmpty()

    expect(errors.filter((e) => !e.includes('favicon'))).toEqual([])
  })

  test('page title and navigation render', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await expect(page).toHaveTitle(/Budget Engineer/)

    const nav = page.locator('nav, [role="navigation"], header nav')
    await expect(nav.first()).toBeVisible({ timeout: 15_000 })
  })

  test('SPA fallback works on sub-route refresh', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    await page.goto(`${BASE_URL}/portfolio`, { waitUntil: 'networkidle' })

    await expect(page.locator('#root')).not.toBeEmpty()
    expect(page.url()).toContain('/portfolio')
  })

  test('known routes return app shell, not 404', async ({ page }) => {
    const routes = [
      '/',
      '/portfolio',
    ]

    for (const route of routes) {
      const url = `${BASE_URL}${route}`
      await page.goto(url, { waitUntil: 'networkidle' })
      await expect(page.locator('#root')).not.toBeEmpty()
    }
  })

  test('manifest and service worker are present', async ({ page, request }) => {
    const manifestOk = await request.get(`${BASE_URL}/manifest.webmanifest`)
      .then((r) => r.ok())
      .catch(() => false)

    expect(manifestOk).toBe(true)
  })

  test('static assets are served', async ({ request }) => {
    const html = await request.get(BASE_URL).then((r) => r.text())
    const match = html.match(/\/assets\/index-(\w+)\.js/)
    expect(match).not.toBeNull()

    const jsUrl = `${BASE_URL}${match![0]}`
    const jsOk = await request.get(jsUrl).then((r) => r.ok())
    expect(jsOk).toBe(true)
  })
})
