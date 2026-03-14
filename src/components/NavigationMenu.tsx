import { Link } from "react-router-dom"

export type NavigationMenuItem = {
  to: string
  label: string
  icon: string
  description?: string
  className?: string
}

type Props = {
  items: NavigationMenuItem[]
}

function NavigationMenu({ items }: Props) {
  return (
    <div className="nav-menu">
      {items.map((item) => (
        <Link key={item.to} to={item.to} className={`nav-btn-visual${item.className ? ` ${item.className}` : ""}`}>
          <span className="nav-icon" aria-hidden="true">{item.icon}</span>
          <span className="nav-btn-content">
            <span className="nav-btn-label">{item.label}</span>
            {item.description ? <span className="nav-btn-copy">{item.description}</span> : null}
          </span>
        </Link>
      ))}
    </div>
  )
}

export default NavigationMenu