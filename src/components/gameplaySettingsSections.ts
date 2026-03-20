import type { SettingsSectionId } from "./CustomGameSettingsPanel"

export type GameplaySectionId = SettingsSectionId | "sorting" | "data-filters"

export const GAMEPLAY_SETTINGS_SECTIONS: Array<{ id: GameplaySectionId; label: string }> = [
  { id: "presets", label: "Presets" },
  { id: "gameplay-helpers", label: "Gameplay Helpers" },
  { id: "sorting", label: "Sorting" },
  { id: "suggestion-list", label: "Shuffling" },
  { id: "penalties", label: "Penalties" },
  { id: "data-filters", label: "Data Filters" },
]