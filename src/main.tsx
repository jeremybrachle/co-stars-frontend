import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { CountdownTimerProvider } from "./context/CountdownTimerContext"
import "./styles.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CountdownTimerProvider>
      <App />
    </CountdownTimerProvider>
  </React.StrictMode>
)