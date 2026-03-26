import { CUSTOM_SETTING_DEFINITIONS } from "../context/gameSettings"
import type { ReactNode } from "react"
import type { DifficultyOption, DifficultySettings, DifficultyToggleId } from "../types"

export type SettingsSectionId = "presets" | "gameplay-helpers" | "suggestion-list" | "penalties"

const PRESET_OPTIONS: Array<{
  value: DifficultyOption
  label: string
  hint: string
}> = [
  {
    value: "all-on",
    label: "All on",
    hint: "Enable every gameplay helper, overlay, and penalty toggle, and keep shuffling disabled.",
  },
  {
    value: "all-off",
    label: "All off",
    hint: "Disable every gameplay helper toggle for a stripped-down board, and turn shuffling on.",
  },
  {
    value: "custom",
    label: "Custom",
    hint: "Used automatically when you change any individual helper away from a preset.",
  },
]

export default function CustomGameSettingsPanel({
  difficulty,
  customSettings,
  onDifficultyChange,
  onToggle,
  visibleSections,
  suggestionListAddon,
  title,
  hint,
  className = "",
}: {
  difficulty: DifficultyOption
  customSettings: DifficultySettings
  onDifficultyChange: (difficulty: DifficultyOption) => void
  onToggle: (settingId: DifficultyToggleId, enabled: boolean) => void
  visibleSections?: SettingsSectionId[]
  suggestionListAddon?: ReactNode
  title: string
  hint: string
  className?: string
}) {
  const helperSettings = CUSTOM_SETTING_DEFINITIONS.filter((setting) => (setting.section ?? "helpers") === "helpers")
  const suggestionListSettings = CUSTOM_SETTING_DEFINITIONS.filter((setting) => setting.section === "suggestion-list")
  const penaltySettings = CUSTOM_SETTING_DEFINITIONS.filter((setting) => setting.section === "penalties")
  const isSectionVisible = (sectionId: SettingsSectionId) => !visibleSections || visibleSections.includes(sectionId)

  const renderSettingCard = (setting: typeof CUSTOM_SETTING_DEFINITIONS[number]) => {
    const isEnabled = customSettings[setting.id]
    const isDependencyMissing = setting.requires ? !customSettings[setting.requires] : false
    const requiredSetting = setting.requires
      ? CUSTOM_SETTING_DEFINITIONS.find((candidate) => candidate.id === setting.requires) ?? null
      : null

    return (
      <article key={setting.id} className={`settingsToggleCard${isDependencyMissing ? " settingsToggleCard--disabled" : ""}`}>
        <div className="settingsToggleCardTop">
          <div className="settingsToggleCardLabelWrap">
            <strong>{setting.label}</strong>
            <span className="settingsHint">{setting.hint}</span>
            {setting.performanceWarning ? (
              <span className="settingsWarning">Performance warning: {setting.performanceWarning}</span>
            ) : null}
            {isDependencyMissing ? (
              <span className="settingsHint">Enable {requiredSetting?.label.toLocaleLowerCase() ?? "the required setting"} first.</span>
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
    sectionId: SettingsSectionId,
    sectionTitle: string,
    sectionHint: string | null,
    sectionSettings: Array<typeof CUSTOM_SETTING_DEFINITIONS[number]>,
    extraContent?: ReactNode,
  ) => {
    if (sectionSettings.length === 0 || !isSectionVisible(sectionId)) {
      return null
    }

    return (
      <div className="settingsToggleSection settingsToggleSection--carded">
        <h4 className="settingsToggleSectionTitle">{sectionTitle}</h4>
        {sectionHint ? <p className="settingsHint">{sectionHint}</p> : null}
        {sectionId === "suggestion-list" && extraContent ? <div className="settingsToggleSectionAddon">{extraContent}</div> : null}
        <div className="settingsToggleGrid">
          {sectionSettings.map((setting) => renderSettingCard(setting))}
        </div>
        {sectionId !== "suggestion-list" && extraContent ? <div className="settingsToggleSectionAddon">{extraContent}</div> : null}
      </div>
    )
  }

  return (
    <div className={`settingsCustomPanel${className ? ` ${className}` : ""}`}>
      <div className="settingsCustomHeader">
        <h3>{title}</h3>
        <p className="settingsHint">{hint}</p>
      </div>

      {isSectionVisible("presets") ? (
        <div className="settingsToggleSection settingsToggleSection--carded">
          <h4 className="settingsToggleSectionTitle">Helper Presets</h4>
          <p className="settingsHint">Pick a preset, or let the panel switch to Custom whenever you change an individual gameplay toggle.</p>
          <div className="settingsChoiceList" role="radiogroup" aria-label="Gameplay helper presets">
            {PRESET_OPTIONS.map((option) => {
              const isSelected = difficulty === option.value

              return (
                <label key={option.value} className={`settingsChoiceRow${isSelected ? " settingsChoiceRow--selected" : ""}`}>
                  <input
                    type="radio"
                    name="gameplay-helper-preset"
                    checked={isSelected}
                    onChange={() => onDifficultyChange(option.value)}
                  />
                  <span className="settingsChoiceRadio" aria-hidden="true" />
                  <span className="settingsChoiceText">
                    <strong className="settingsChoiceLabel">{option.label}</strong>
                    <span className="settingsHint">{option.hint}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      ) : null}

      {renderSettingSection("gameplay-helpers", "Gameplay Helpers", null, helperSettings)}
      {renderSettingSection("suggestion-list", "Shuffling", "Control shuffle mode, list behavior, and path risk overlays.", suggestionListSettings, suggestionListAddon)}
      {renderSettingSection("penalties", "Penalties", "Toggle which gameplay actions feed into the final score penalties.", penaltySettings)}
    </div>
  )
}
