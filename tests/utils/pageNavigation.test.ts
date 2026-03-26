import test from "node:test"
import assert from "node:assert/strict"
import { buildPageNavigationLinks } from "../../src/utils/pageNavigation"

test("buildPageNavigationLinks returns a consistent back and home pair", () => {
  const [backLink, homeLink] = buildPageNavigationLinks("/adventure", "Go back")

  assert.deepEqual(backLink, {
    kind: "back",
    to: "/adventure",
    label: "Go back",
    icon: "←",
  })

  assert.deepEqual(homeLink, {
    kind: "home",
    to: "/",
    label: "Home",
    icon: "🏠",
  })
})

test("buildPageNavigationLinks uses Back as the default back label", () => {
  const [backLink] = buildPageNavigationLinks("/settings")

  assert.equal(backLink.label, "Back")
  assert.equal(backLink.to, "/settings")
})