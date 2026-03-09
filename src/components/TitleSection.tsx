type Props = {
  title: string
  subtitle?: string
}

function TitleSection({ title, subtitle }: Props) {
  return (
    <div className="page-container">
      <h1 style={{ marginBottom: 0 }}>{title}</h1>
      {subtitle && <p className="subtitle subtitle-extra-space">{subtitle}</p>}
    </div>
  )
}

export default TitleSection