import { useLocation } from "react-router-dom"
import DataIndicator from "./DataIndicator"
import { useIsCompactPhoneViewport } from "../hooks/useIsCompactPhoneViewport"

function Footer() {
  const location = useLocation()
  const isCompactPhoneViewport = useIsCompactPhoneViewport()
  const hideFooterForCompactGame = isCompactPhoneViewport && location.pathname === "/game"

  if (hideFooterForCompactGame) {
    return null
  }

  return (
    <div className="footer">
      <div className="footerContent">
        <div className="footerInfo footerInfo--stacked">
          <div className="footerCopyrightText">Jeremy Brachle © 2026</div>
        </div>
        <div className="footerActions">
          <DataIndicator />
        </div>
      </div>
    </div>
  )
}

export default Footer