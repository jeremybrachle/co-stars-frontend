import NavigationMenu from "./NavigationMenu"
import type { NavigationMenuItem } from "./NavigationMenu"

type Props = {
  subtitle: string
  items: NavigationMenuItem[]
}

function HomeMenuGroup({ subtitle, items }: Props) {
  return (
    <div className="home-menu-group">
      <div className="subtitle subtitle-tight">{subtitle}</div>
      <NavigationMenu items={items} />
    </div>
  )
}

export default HomeMenuGroup
