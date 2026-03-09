// import { Link } from "react-router-dom"
import TitleSection from "../components/TitleSection"
import HomeMenuGroup from "../components/HomeMenuGroup"


function HomePage() {
  return (
    <div className="home-bg dramatic-home">
      <div className="home-center-group">
        <TitleSection
          title="🎭 Co-Stars"
        />
        <HomeMenuGroup />
      </div>
    </div>
  );
}

export default HomePage