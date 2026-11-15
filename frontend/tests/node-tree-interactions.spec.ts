import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("Node tree interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("button", { name: "Try Demo Session" }).click()
    await page.waitForURL(/\/lists\/.+/)
    await expect(page.getByText("Logistical Prep")).toBeVisible()
  })

  test("Tab should indent node and maintain focus", async ({ page }) => {
    // 1. Find a node that can be indented (not the first one)
    // "Logistical Prep" is first, "Grocery Run (Whole Foods)" is second root in seed
    const targetNode = page.getByRole("button", {
      name: "Grocery Run (Whole Foods)",
    })
    await expect(targetNode).toBeVisible()

    // 2. Start editing via double-click
    await targetNode.dblclick()
    const input = page.locator("input").first()
    await expect(input).toBeFocused()

    // 3. Measure initial padding
    const container = page.locator("div.group[data-editing='true']")
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
    // "Transportation" is level 1 directly under "Logistical Prep" (level 0)
    const targetNode = page.getByRole("button", { name: "Transportation" })
    await targetNode.dblclick()
    const input = page.locator("input").first()

    // Press Tab twice
    await input.press("Tab")
    await page.waitForTimeout(300)
    await input.press("Tab")
    await page.waitForTimeout(300)

    // Since "Transportation" is below "Logistical Prep" (level 0),
    // it can only reach level 1.
    const container = page.locator("div.group[data-editing='true']")
    const padding = await container.evaluate(
      (el) => window.getComputedStyle(el).paddingLeft,
    )
    expect(parseInt(padding, 10)).toBe(20) // Only one level deeper than "Logistical Prep"
  })

  test("ArrowDown when unfocused should focus top node and Enter enters edit mode", async ({
    page,
  }) => {
    // Ensure no input is focused
    await page.keyboard.press("Escape")
    await expect(page.locator("input")).toHaveCount(0)

    // Press ArrowDown -> focuses top node without entering edit mode
    await page.keyboard.press("ArrowDown")
    await expect(page.locator("input")).toHaveCount(0)
    await expect(page.locator("div.group[data-focused='true']")).toHaveCount(1)

    // Press Enter -> enters edit mode on the focused node
    await page.keyboard.press("Enter")
    const input = page.locator("input").first()
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()
  })

  test("ArrowUp when unfocused should focus bottom node and Enter enters edit mode", async ({
    page,
  }) => {
    // Ensure no input is focused
    await page.keyboard.press("Escape")
    await expect(page.locator("input")).toHaveCount(0)

    // Press ArrowUp -> focuses bottom node without entering edit mode
    await page.keyboard.press("ArrowUp")
    await expect(page.locator("input")).toHaveCount(0)
    await expect(page.locator("div.group[data-focused='true']")).toHaveCount(1)

    // Press Enter -> enters edit mode on the focused node
    await page.keyboard.press("Enter")
    const input = page.locator("input").first()
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()
  })

  test("Single click focuses node, double click or Enter edits node", async ({
    page,
  }) => {
    const targetNode = page.getByRole("button", { name: "Logistical Prep" })
    await targetNode.click()

    // Single click only focuses, does not open input
    await expect(page.locator("input")).toHaveCount(0)
    await expect(
      page
        .locator("div.group[data-focused='true']")
        .filter({ hasText: "Logistical Prep" }),
    ).toBeVisible()

    // Pressing Enter on focused node enters edit mode
    await page.keyboard.press("Enter")
    const input = page.locator("input").first()
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()
    await expect(input).toHaveValue("Logistical Prep")

    // Pressing Escape exits edit mode back to focus mode
    await input.press("Escape")
    await expect(page.locator("input")).toHaveCount(0)
    await expect(
      page
        .locator("div.group[data-focused='true']")
        .filter({ hasText: "Logistical Prep" }),
    ).toBeVisible()

    // Double click enters edit mode
    await targetNode.dblclick()
    await expect(page.locator("input").first()).toBeFocused()
  })

  test("Deleting node text then pressing Backspace deletes node and Ctrl+Z restores it", async ({
    page,
  }) => {
    const firstNode = page.getByRole("button", { name: "Logistical Prep" })
    await firstNode.dblclick()
    const firstInput = page.locator("input").first()
    await expect(firstInput).toBeFocused()

    // Create two sibling nodes below
    await firstInput.press("Enter")
    let activeInput = page.locator("input").first()
    await activeInput.fill("Temp Sibling 1")
    await activeInput.press("Enter")
    activeInput = page.locator("input").first()
    await activeInput.fill("Temp Sibling 2")
    // Commit "Temp Sibling 2" via blur so it's saved in the node before deletion/undo
    await activeInput.blur()
    await expect(
      page.getByRole("button", { name: "Temp Sibling 2" }),
    ).toBeVisible()
    await page.getByRole("button", { name: "Temp Sibling 2" }).dblclick()
    activeInput = page.locator("input").first()
    await expect(activeInput).toHaveValue("Temp Sibling 2")

    // Delete "Temp Sibling 2" text, then press Backspace one more time to delete the node
    await activeInput.press("Control+a")
    await activeInput.press("Backspace")
    await expect(activeInput).toHaveValue("")
    await activeInput.press("Backspace")
    await expect(
      page.getByRole("button", { name: "Temp Sibling 2" }),
    ).toHaveCount(0)
    // Editing focus should be lost after deleting a node
    await expect(page.locator("input")).toHaveCount(0)

    // Re-enter edit mode on focused "Temp Sibling 1", clear text, and delete with Backspace
    await page.keyboard.press("Enter")
    activeInput = page.locator("input").first()
    await expect(activeInput).toBeFocused()
    await expect(activeInput).toHaveValue("Temp Sibling 1")
    await activeInput.press("Control+a")
    await activeInput.press("Backspace")
    await expect(activeInput).toHaveValue("")
    await activeInput.press("Backspace")
    await expect(
      page.getByRole("button", { name: "Temp Sibling 1" }),
    ).toHaveCount(0)
    await expect(page.locator("input")).toHaveCount(0)

    // Undo twice with Ctrl+Z to restore both deleted siblings
    await page.keyboard.press("Control+z")
    await expect(page.locator("input").first()).toHaveValue("Temp Sibling 1")

    await page.keyboard.press("Control+z")
    await expect(page.locator("input").first()).toHaveValue("Temp Sibling 2")

    // Exit edit mode and verify both nodes are visible
    await page.keyboard.press("Escape")
    await expect(
      page.getByRole("button", { name: "Temp Sibling 1" }),
    ).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Temp Sibling 2" }),
    ).toBeVisible()
  })
})
