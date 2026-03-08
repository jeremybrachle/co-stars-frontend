import { Link } from "react-router-dom"

function AdventurePage() {
  return (
    <div>
      <h1>Adventure Mode</h1>
      <p>Select a predefined level.</p>

      <Link to="/">Back to Home</Link>
    </div>
  )
}

export default AdventurePage