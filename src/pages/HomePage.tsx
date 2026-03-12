// import { Link } from "react-router-dom"
import { APP_VERSION } from "../appVersion"
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
        <p className="appVersion appVersionHome">Version {APP_VERSION}</p>
      </div>
    </div>
  );
}

export default HomePage