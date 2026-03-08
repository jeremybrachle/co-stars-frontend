type Props = {
  title: string
  subtitle?: string
}

function TitleSection({ title, subtitle }: Props) {
  return (
    <div className="page-container">
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </div>
  )
}

export default TitleSection