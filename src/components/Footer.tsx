import { APP_VERSION } from "../appVersion"
import DataIndicator from "./DataIndicator"

function Footer() {
  return (
    <div className="footer">
      <div className="footerContent">
        <div className="footerInfo footerInfo--hover">
          <div className="footerVersionTrigger" tabIndex={0}>
            <button type="button" className="footerCopyrightButton">
            Jeremy Brachle © Copyright 2026
            </button>
            <div className="footerPopover footerPopover--info">
              <div className="footerPopoverHeader">
                <h3>Frontend version</h3>
              </div>
              <p className="footerPopoverCopy">Current frontend release: {APP_VERSION}</p>
              <p className="footerPopoverCopy">This value is injected at build time and reflects the version currently bundled into the client.</p>
            </div>
          </div>
        </div>
        <div className="footerActions">
          <DataIndicator />
        </div>
      </div>
    </div>
  )
}

export default Footer