import { createContext, useContext } from "react";
import type { DifficultyOption, DifficultySettings, DifficultyToggleId, GameDifficultySettings } from "../types";

export type CustomSettingDefinition = {
	id: DifficultyToggleId;
	label: string;
	hint: string;
};

export const CUSTOM_SETTING_DEFINITIONS: CustomSettingDefinition[] = [
	{
		id: "show-suggestions",
		label: "Display suggestions",
		hint: "Keep the right-panel suggestion cards visible during play.",
	},
	{
		id: "show-hint-color",
		label: "Show hint colors",
		hint: "Keep connection, best-path, and cycle-risk highlight colors enabled.",
	},
	{
		id: "show-optimal-tracking",
		label: "Track optimal path",
		hint: "Keep hop comparison and shortest-path guidance visible during the run.",
	},
];

export const GAME_SETTINGS_KEY = "co-stars-game-settings";

export const DEFAULT_CUSTOM_SETTINGS: DifficultySettings = {
	"show-suggestions": true,
	"show-hint-color": true,
	"show-optimal-tracking": true,
};

export const DEFAULT_GAME_SETTINGS: GameDifficultySettings = {
	difficulty: "custom",
	customSettings: { ...DEFAULT_CUSTOM_SETTINGS },
};

export type GameSettingsContextValue = {
	settings: GameDifficultySettings;
	setDifficulty: (difficulty: DifficultyOption) => void;
	setCustomSetting: (settingId: keyof DifficultySettings, enabled: boolean) => void;
};

export const GameSettingsContext = createContext<GameSettingsContextValue | null>(null);

function isDifficultyOption(value: unknown): value is DifficultyOption {
	return value === "easy" || value === "medium" || value === "hard" || value === "custom";
}

function isDifficultySettings(value: unknown): value is DifficultySettings {
	if (!value || typeof value !== "object") {
		return false;
	}

	return Object.keys(DEFAULT_CUSTOM_SETTINGS).every((key) => typeof (value as Record<string, unknown>)[key] === "boolean");
}

export function readStoredGameSettings(): GameDifficultySettings {
	if (typeof window === "undefined") {
		return DEFAULT_GAME_SETTINGS;
	}

	const stored = window.localStorage.getItem(GAME_SETTINGS_KEY);
	if (!stored) {
		return DEFAULT_GAME_SETTINGS;
	}

	try {
		const parsed = JSON.parse(stored) as Partial<GameDifficultySettings>;
		if (!isDifficultyOption(parsed.difficulty) || !isDifficultySettings(parsed.customSettings)) {
			return DEFAULT_GAME_SETTINGS;
		}

		return {
			difficulty: parsed.difficulty,
			customSettings: parsed.customSettings,
		};
	} catch {
		return DEFAULT_GAME_SETTINGS;
	}
}

export function useGameSettings() {
	const context = useContext(GameSettingsContext);

	if (!context) {
		throw new Error("useGameSettings must be used within GameSettingsProvider.");
	}

	return context;
}