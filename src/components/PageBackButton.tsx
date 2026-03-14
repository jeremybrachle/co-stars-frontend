import { Link } from "react-router-dom"

type Props = {
  to: string
  label?: string
}

function PageBackButton({ to, label = "Back" }: Props) {
  return (
    <Link to={to} className="pageTopBackButton" aria-label={label}>
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </Link>
  )
}

export default PageBackButton