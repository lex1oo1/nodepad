import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("Nodes management", () => {
  test("Edit a node content via double-click and Enter", async ({ page }) => {
    // 1. Start a fresh demo session (creates an isolated Chamonix list)
    await page.goto("/login")
    await page.getByRole("button", { name: "Try Demo Session" }).click()
    await page.waitForURL(/\/lists\/.+/)

    // 2. Wait for nodes to load
    await expect(page.getByText("Logistical Prep")).toBeVisible()

    // 5. Single-click focuses the node without entering edit mode
    const nodeText = "Confirm Airbnb check-in time"
    const nodeElement = page.getByRole("button", { name: nodeText })
    await nodeElement.click()
    await expect(page.locator("input")).toHaveCount(0)

    // 6. Double-click on the node to enter edit mode
    await nodeElement.dblclick()

    // 7. Type new text, press Enter to save, and Escape to exit edit mode on the new sibling
    const newText = "Confirm Airbnb check-in time (Updated)"
    // The input should appear with the current text as value
    const input = page.locator("input")
    await expect(input).toHaveValue(nodeText)
    await input.fill(newText)
    await input.press("Enter")

    // 8. Verify the new text is visible and exit edit mode on the newly created sibling
    await expect(page.getByRole("button", { name: newText })).toBeVisible()
    await page.locator("input").first().press("Escape")
    await expect(page.locator("input")).toHaveCount(0)

    // 9. Reload the page to verify persistence
    await page.reload()
    await expect(page.getByRole("button", { name: newText })).toBeVisible()
  })
})
