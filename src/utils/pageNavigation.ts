export type PageNavigationLink = {
  kind: "back" | "home"
  to: string
  label: string
  icon?: string
}

export function buildPageNavigationLinks(backTo: string, backLabel = "Back"): [PageNavigationLink, PageNavigationLink] {
  return [
    {
      kind: "back",
      to: backTo,
      label: backLabel,
      icon: "←",
    },
    {
      kind: "home",
      to: "/",
      label: "Home",
      icon: "🏠",
    },
  ]
}