import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const SCREENSHOT_DIR = 'C:\\Users\\dell\\OneDrive\\Documents\\project10\\screenshots'

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const width = 375
  await page.setViewportSize({ width, height: 900 })

  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' })
  await sleep(1000)

  const email = `testuser${Date.now()}@example.com`

  await page.fill('input[id="firstName"]', 'Test')
  await page.fill('input[id="lastName"]', 'User')
  await page.fill('input[id="email"]', email)
  await page.fill('input[id="businessName"]', 'Test Shop')
  await page.fill('input[id="password"]', 'TestPass123!')

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `register-before-submit-${width}px.png`),
    fullPage: true,
  })

  await page.click('button[type="submit"]')
  await sleep(3000)

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `register-after-submit-${width}px.png`),
    fullPage: true,
  })

  const errorEl = page.locator('.border-destructive, [class*="destructive"]')
  const errorCount = await errorEl.count()
  console.log('Error elements:', errorCount)

  const errorText = await page.textContent('.border-destructive, [class*="destructive"]')
  console.log('Error text:', errorText)

  const currentUrl = page.url()
  console.log('Current URL after register:', currentUrl)

  await browser.close()
}

main()
