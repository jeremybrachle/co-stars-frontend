import { useNavigate } from "react-router-dom"

function HomeButton() {
  const navigate = useNavigate()
  return (
    <button
      className="home-btn"
      title="Go Home"
      onClick={() => navigate("/")}
    >
      <span role="img" aria-label="Home" style={{fontSize: '1.7em'}}>🏠</span>
    </button>
  )
}

export default HomeButton
