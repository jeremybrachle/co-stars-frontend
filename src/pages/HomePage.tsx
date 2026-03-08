// import { Link } from "react-router-dom"
import TitleSection from "../components/TitleSection"
import NavigationMenu from "../components/NavigationMenu"

function HomePage() {
  return (
    <div>

      <TitleSection
        title="🎭 Co-Stars"
        subtitle="Choose a level or create your own path!"
      />

      <NavigationMenu />

    </div>
  )
}

export default HomePage