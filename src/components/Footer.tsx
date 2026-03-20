import { useLocation } from "react-router-dom"
import DataIndicator from "./DataIndicator"
import { useIsCompactPhoneViewport } from "../hooks/useIsCompactPhoneViewport"

function Footer() {
  const location = useLocation()
  const isCompactPhoneViewport = useIsCompactPhoneViewport()
  const showGameInfoButton = isCompactPhoneViewport && location.pathname === "/game"

  return (
    <div className="footer">
      <div className={`footerContent${showGameInfoButton ? " footerContent--with-game-info" : ""}`}>
        <div className="footerInfo footerInfo--stacked">
          <div className="footerCopyrightText">Jeremy Brachle © 2026</div>
        </div>
        {showGameInfoButton ? (
          <button
            type="button"
            className="footerGameInfoButton"
            onClick={() => window.dispatchEvent(new CustomEvent("costars:open-game-info"))}
            aria-label="Open game information"
            title="Open game information"
          >
            i
          </button>
        ) : null}
        <div className="footerActions">
          <DataIndicator />
        </div>
      </div>
    </div>
  )
}

export default Footer