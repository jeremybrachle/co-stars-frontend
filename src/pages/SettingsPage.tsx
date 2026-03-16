import { useMemo } from "react"
import { Link } from "react-router-dom"
import { APP_VERSION } from "../appVersion"
import DataSettingsPanel from "../components/DataSettingsPanel"
import { CUSTOM_SETTING_DEFINITIONS, useGameSettings } from "../context/gameSettings"
import PageBackButton from "../components/PageBackButton"
import type { DifficultyOption } from "../types"

function SettingsPage() {
  const { settings, setDifficulty, setCustomSetting } = useGameSettings()
  const { difficulty, customSettings } = settings
  const activeCustomLabel = useMemo(
    () => CUSTOM_SETTING_DEFINITIONS.filter((setting) => customSettings[setting.id]).map((setting) => setting.label).join(" • "),
    [customSettings],
  )

  return (
    <div className="settingsPage">
      <PageBackButton to="/" label="Back" />
      <div className="settingsPanel">
        <h1>Settings</h1>
        <p className="settingsIntro">Choose preferred online and offline data sources, then refresh or clear the snapshot cache when needed.</p>

        <section className="settingsSection settingsBuildSection settingsSection--first">
          <h2>Build Info</h2>
          <div className="settingsBuildRow">
            <span className="settingsBuildLabel">Frontend version</span>
            <span className="settingsBuildValue">{APP_VERSION}</span>
          </div>
          <p className="settingsHint">This is the client build currently bundled into the app, which makes it the right reference point when you are checking refresh behavior, cache state, or release notes.</p>
        </section>

        <section className="settingsSection">
          <h2>Difficulty</h2>
          <div className="settingsDifficultyGrid">
            {(["easy", "medium", "hard", "custom"] as DifficultyOption[]).map((option) => (
              <label
                key={option}
                className={`settingsOption settingsOption--radio settingsOption--radio-page settingsDifficultyCard${difficulty === option ? " settingsOption--active" : ""}`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  checked={difficulty === option}
                  onChange={() => setDifficulty(option)}
                />
                <span className="settingsOptionControl" aria-hidden="true" />
                <span>
                  <strong>{option.charAt(0).toUpperCase() + option.slice(1)}</strong>
                  <span className="settingsHint">
                    {option === "easy" ? "All gameplay helpers enabled." : null}
                    {option === "medium" ? "A balanced run with fewer guidance cues enabled." : null}
                    {option === "hard" ? "Minimal guidance with the core game controls always available." : null}
                    {option === "custom" ? "Choose exactly which display helpers stay visible during play." : null}
                  </span>
                </span>
              </label>
            ))}
          </div>

            <p className="settingsHint">Current custom rule set: {activeCustomLabel || "No helpers selected"}.</p>

          {difficulty === "custom" ? (
            <div className="settingsCustomPanel">
              <div className="settingsCustomHeader">
                <h3>Custom Rules</h3>
                  <p className="settingsHint">These preferences are shared with the in-game info menu.</p>
              </div>
              <div className="settingsToggleList">
                {CUSTOM_SETTING_DEFINITIONS.map((setting) => (
                  <label key={setting.id} className="settingsToggleRow">
                    <span className="settingsToggleText">
                      <strong>{setting.label}</strong>
                      <span className="settingsHint">{setting.hint}</span>
                    </span>
                    <button
                      type="button"
                      className={`settingsToggleSwitch${customSettings[setting.id] ? " settingsToggleSwitch--on" : ""}`}
                        onClick={() => setCustomSetting(setting.id, !customSettings[setting.id])}
                      aria-pressed={customSettings[setting.id]}
                    >
                      <span className="settingsToggleThumb" aria-hidden="true" />
                    </button>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <DataSettingsPanel showHeading={false} />

        <section className="settingsSection">
          <h2>How To Play</h2>
          <div className="settingsHowToGrid">
            <p className="settingsHint">Build a path that alternates actor and movie nodes until the two endpoints connect.</p>
            <p className="settingsHint">Use the right panel to choose the next node and the left panel to inspect the route you are building.</p>
            <p className="settingsHint">Shuffle rerolls suggestions, rewinds remove the latest move on the active branch, and the run ends when both sides meet or the target is reached directly.</p>
          </div>
        </section>

        <Link to="/" className="settingsBackLink">Back to Home</Link>
      </div>
    </div>
  )
}

export default SettingsPage