import { useMemo, useState } from "react";
import type { DifficultyOption, DifficultySettings, GameDifficultySettings } from "../types";
import { GAME_SETTINGS_KEY, GameSettingsContext, readStoredGameSettings } from "./gameSettings";

export function GameSettingsProvider({ children }: { children: React.ReactNode }) {
	const [settings, setSettings] = useState<GameDifficultySettings>(() => readStoredGameSettings());

	const persistSettings = (nextSettings: GameDifficultySettings) => {
		window.localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(nextSettings));
		setSettings(nextSettings);
	};

	const value = useMemo(
		() => ({
			settings,
			setDifficulty: (difficulty: DifficultyOption) => {
				persistSettings({
					...settings,
					difficulty,
				});
			},
			setCustomSetting: (settingId: keyof DifficultySettings, enabled: boolean) => {
				persistSettings({
					...settings,
					customSettings: {
						...settings.customSettings,
						[settingId]: enabled,
					},
				});
			},
		}),
		[settings],
	);

	return <GameSettingsContext.Provider value={value}>{children}</GameSettingsContext.Provider>;
}