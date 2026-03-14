import { useEffect, useRef, useState } from "react"
import { APP_VERSION } from "../appVersion"
import DataIndicator from "./DataIndicator"

function Footer() {
  const [isVersionMenuOpen, setIsVersionMenuOpen] = useState(false)
  const footerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isVersionMenuOpen) {
      return undefined
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (footerRef.current && !footerRef.current.contains(event.target as Node)) {
        setIsVersionMenuOpen(false)
      }
    }

    window.addEventListener("mousedown", handlePointerDown)

    return () => {
      window.removeEventListener("mousedown", handlePointerDown)
    }
  }, [isVersionMenuOpen])

  return (
    <div className="footer" ref={footerRef}>
      <div className="footerContent">
        <div className="footerInfo">
          <button type="button" className="footerCopyrightButton" onClick={() => setIsVersionMenuOpen((currentOpen) => !currentOpen)}>
            Jeremy Brachle © Copyright 2026
          </button>
          {isVersionMenuOpen ? (
            <div className="footerPopover footerPopover--info">
              <div className="footerPopoverHeader">
                <h3>Frontend version</h3>
                <button type="button" className="footerPopoverClose" onClick={() => setIsVersionMenuOpen(false)} aria-label="Close version menu">×</button>
              </div>
              <p className="footerPopoverCopy">Current frontend release: {APP_VERSION}</p>
              <p className="footerPopoverCopy">This value is injected at build time and reflects the version currently bundled into the client.</p>
            </div>
          ) : null}
        </div>
        <div className="footerActions">
          <DataIndicator />
        </div>
      </div>
    </div>
  )
}

export default Footer