import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { buildPageNavigationLinks } from "../utils/pageNavigation"

type Props = {
  backTo: string
  backLabel?: string
  centerContent?: ReactNode
}

function PageNavigationHeader({ backTo, backLabel = "Back", centerContent = null }: Props) {
  const [backLink, homeLink] = buildPageNavigationLinks(backTo, backLabel)

  return (
    <nav className="pageNavHeader" aria-label="Page navigation">
      <div className="pageNavHeader__side pageNavHeader__side--left">
        <Link to={backLink.to} className="pageNavHeader__button pageNavHeader__button--back" aria-label={backLink.label}>
          <span aria-hidden="true">{backLink.icon}</span>
          <span>{backLink.label}</span>
        </Link>
      </div>
      <div className="pageNavHeader__center">{centerContent}</div>
      <div className="pageNavHeader__side pageNavHeader__side--right">
        <Link to={homeLink.to} className="pageNavHeader__button pageNavHeader__button--home" aria-label={homeLink.label}>
          <span aria-hidden="true" className="pageNavHeader__homeIcon">{homeLink.icon}</span>
        </Link>
      </div>
    </nav>
  )
}

export default PageNavigationHeader