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

  const viewports = [320, 375, 390]

  try {
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 })

      await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' })
      await sleep(1000)

      const email = `testuser${Date.now()}@example.com`

      await page.fill('input[id="firstName"]', 'Test')
      await page.fill('input[id="lastName"]', 'User')
      await page.fill('input[id="email"]', email)
      await page.fill('input[id="businessName"]', 'Test Shop')
      await page.fill('input[id="password"]', 'TestPass123!')

      await page.click('button[type="submit"]')
      await page.waitForURL('http://localhost:5173/dashboard', { waitUntil: 'networkidle' })
      await sleep(1500)

      await page.goto('http://localhost:5173/products', { waitUntil: 'networkidle' })
      await sleep(3000)

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `products-page-${width}px.png`),
        fullPage: true,
      })

      const selects = page.locator('select')
      const count = await selects.count()

      if (count >= 2) {
        const categorySelect = selects.nth(1)
        await categorySelect.click()
        await sleep(800)
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `products-category-dropdown-${width}px.png`),
          fullPage: false,
        })

        await page.keyboard.press('Escape')
        await sleep(300)
      }

      if (count >= 3) {
        const stockSelect = selects.nth(2)
        await stockSelect.click()
        await sleep(800)
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `products-stock-dropdown-${width}px.png`),
          fullPage: false,
        })

        await page.keyboard.press('Escape')
        await sleep(300)
      }

      const rowActionBtn = page.locator('button[aria-label^="Actions for"]').first()
      if ((await rowActionBtn.count()) > 0) {
        await rowActionBtn.click()
        await sleep(800)
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `products-row-actions-${width}px.png`),
          fullPage: false,
        })

        await page.keyboard.press('Escape')
        await sleep(300)
      }

      const addProductBtn = page.locator('button:has-text("+ Add Product")')
      if ((await addProductBtn.count()) > 0) {
        await addProductBtn.click()
        await sleep(1000)
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `products-dialog-${width}px.png`),
          fullPage: false,
        })
      }

      console.log(`Screenshots captured for ${width}px`)
    }
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await browser.close()
  }
}

main()
