import { APP_VERSION } from "../appVersion"
import DataIndicator from "./DataIndicator"

function Footer() {
  return (
    <div className="footer">
      <div className="footerContent">
        <div className="footerInfo footerInfo--stacked">
          <div className="footerCopyrightText">Jeremy Brachle © Copyright 2026</div>
          <div className="footerVersionText">v{APP_VERSION}</div>
        </div>
        <div className="footerActions">
          <DataIndicator />
        </div>
      </div>
    </div>
  )
}

export default Footer