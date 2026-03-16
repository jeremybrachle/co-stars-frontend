import { CUSTOM_SETTING_DEFINITIONS } from "../context/gameSettings"
import type { DifficultySettings, DifficultyToggleId } from "../types"

export default function CustomGameSettingsPanel({
  customSettings,
  onToggle,
  title,
  hint,
  className = "",
}: {
  customSettings: DifficultySettings
  onToggle: (settingId: DifficultyToggleId, enabled: boolean) => void
  title: string
  hint: string
  className?: string
}) {
  const helperSettings = CUSTOM_SETTING_DEFINITIONS.filter((setting) => (setting.section ?? "helpers") === "helpers")
  const suggestionListSettings = CUSTOM_SETTING_DEFINITIONS.filter((setting) => setting.section === "suggestion-list")
  const penaltySettings = CUSTOM_SETTING_DEFINITIONS.filter((setting) => setting.section === "penalties")
  const riskOverlaySettings = CUSTOM_SETTING_DEFINITIONS.filter((setting) => setting.section === "risk-overlays")

  const renderSettingCard = (setting: typeof CUSTOM_SETTING_DEFINITIONS[number]) => {
    const isEnabled = customSettings[setting.id]
    const isDependencyMissing = setting.requires ? !customSettings[setting.requires] : false

    return (
      <article key={setting.id} className={`settingsToggleCard${isDependencyMissing ? " settingsToggleCard--disabled" : ""}`}>
        <div className="settingsToggleCardTop">
          <div className="settingsToggleCardLabelWrap">
            <strong>{setting.label}</strong>
            <span className="settingsHint">{setting.hint}</span>
            {isDependencyMissing ? (
              <span className="settingsHint">Enable cast lock risk first.</span>
            ) : null}
          </div>
          <div className="settingsToggleControl">
            <span className={`settingsToggleState${isEnabled ? " settingsToggleState--on" : ""}`}>{isEnabled ? "On" : "Off"}</span>
            <button
              type="button"
              className={`settingsToggleSwitch${isEnabled ? " settingsToggleSwitch--on" : ""}`}
              onClick={() => onToggle(setting.id, !isEnabled)}
              aria-pressed={isEnabled}
              disabled={isDependencyMissing}
            >
              <span className="settingsToggleThumb" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    )
  }

  const renderSettingSection = (
    sectionTitle: string,
    sectionHint: string | null,
    sectionSettings: typeof CUSTOM_SETTING_DEFINITIONS,
  ) => {
    if (sectionSettings.length === 0) {
      return null
    }

    return (
      <div className="settingsToggleSection settingsToggleSection--carded">
        <h4 className="settingsToggleSectionTitle">{sectionTitle}</h4>
        {sectionHint ? <p className="settingsHint">{sectionHint}</p> : null}
        <div className="settingsToggleGrid">
          {sectionSettings.map((setting) => renderSettingCard(setting))}
        </div>
      </div>
    )
  }

  return (
    <div className={`settingsCustomPanel${className ? ` ${className}` : ""}`}>
      <div className="settingsCustomHeader">
        <h3>{title}</h3>
        <p className="settingsHint">{hint}</p>
      </div>

      {renderSettingSection("Gameplay Helpers", null, helperSettings)}
      {renderSettingSection("Suggestion List", "Display and ordering behavior for suggestion cards.", suggestionListSettings)}
      {renderSettingSection("Penalties", "Penalty behavior that applies when risky cards are clicked.", penaltySettings)}
      {renderSettingSection("Path Risk Overlays", "Cast lock overlays are ranked: full cast lock depends on cast lock risk.", riskOverlaySettings)}
    </div>
  )
}
