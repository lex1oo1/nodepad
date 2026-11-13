import { expect, test } from "@playwright/test"
import { logInUser } from "./utils/user"

test.describe("Node tree interactions", () => {
  test.beforeEach(async ({ page }) => {
    await logInUser(page, "admin@nodepad.io", "Gr33nWh33lBr!ck")
    await page.goto("/lists")
    // Wait for lists to load
    await expect(page.getByText("Weekend Getaway: Chamonix")).toBeVisible()
    const listLink = page.getByText("Weekend Getaway: Chamonix")
    await listLink.click()
    await page.waitForLoadState("networkidle")
  })

  test("Tab should indent node and maintain focus", async ({ page }) => {
    // 1. Find a node that can be indented (not the first one)
    // "Logistical Prep" is usually first, "Activities" is second in seed
    const targetNode = page.getByRole("button", { name: "Activities" })
    await expect(targetNode).toBeVisible()

    // 2. Start editing
    await targetNode.click()
    const input = page.locator("input").first()
    await expect(input).toBeFocused()

    // 3. Measure initial padding
    const container = page
      .locator("div.group")
      .filter({ hasText: "Activities" })
    const initialPadding = await container.evaluate(
      (el) => window.getComputedStyle(el).paddingLeft,
    )
    const initialPaddingValue = parseInt(initialPadding, 10)

    // 4. Press Tab
    await input.press("Tab")

    // 5. Verify focus is still on the input (critical fix)
    await expect(input).toBeFocused()

    // 6. Verify padding increased by 20px
    const newPadding = await container.evaluate(
      (el) => window.getComputedStyle(el).paddingLeft,
    )
    expect(parseInt(newPadding, 10)).toBe(initialPaddingValue + 20)

    // 7. Press Shift+Tab
    await input.press("Shift+Tab")
    await expect(input).toBeFocused()

    // 8. Verify padding decreased back
    const finalPadding = await container.evaluate(
      (el) => window.getComputedStyle(el).paddingLeft,
    )
    expect(parseInt(finalPadding, 10)).toBe(initialPaddingValue)
  })

  test("Tab should not indent beyond prev.level + 1", async ({ page }) => {
    const targetNode = page.getByRole("button", { name: "Activities" })
    await targetNode.click()
    const input = page.locator("input").first()

    // Press Tab twice
    await input.press("Tab")
    await page.waitForTimeout(300)
    await input.press("Tab")
    await page.waitForTimeout(300)

    // Since "Activities" is below "Logistical Prep" (level 0),
    // it can only reach level 1.
    const container = page
      .locator("div.group")
      .filter({ hasText: "Activities" })
    const padding = await container.evaluate(
      (el) => window.getComputedStyle(el).paddingLeft,
    )
    expect(parseInt(padding, 10)).toBe(20) // Only one level deeper than "Logistical Prep"
  })

  test("ArrowDown when unfocused should focus top node", async ({ page }) => {
    // Ensure no input is focused
    await page.keyboard.press("Escape")
    await expect(page.locator("input")).toHaveCount(0)

    // Press ArrowDown
    await page.keyboard.press("ArrowDown")

    // The first visible node's input should now be visible and focused
    const input = page.locator("input").first()
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()
  })

  test("ArrowUp when unfocused should focus bottom node", async ({ page }) => {
    // Ensure no input is focused
    await page.keyboard.press("Escape")
    await expect(page.locator("input")).toHaveCount(0)

    // Press ArrowUp
    await page.keyboard.press("ArrowUp")

    // An input should now be visible and focused
    const input = page.locator("input").first()
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()
  })
})
