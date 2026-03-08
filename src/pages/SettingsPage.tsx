import { Link } from "react-router-dom"

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <p>Modify game settings here.</p>

      <Link to="/">Back to Home</Link>
    </div>
  )
}

export default SettingsPage