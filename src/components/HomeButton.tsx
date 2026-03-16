import { useNavigate } from "react-router-dom"

type Props = {
  disabled?: boolean;
};

function HomeButton({ disabled = false }: Props) {
  const navigate = useNavigate()
  return (
    <button
      className="home-btn"
      title="Go Home"
      disabled={disabled}
      onClick={() => navigate("/")}
    >
      <span role="img" aria-label="Home" style={{fontSize: '1.7em'}}>🏠</span>
    </button>
  )
}

export default HomeButton
