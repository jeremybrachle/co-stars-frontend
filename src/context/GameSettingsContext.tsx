import { useMemo, useState } from "react";
import type { BoardThemePalette, BoardThemePreset, BoardThemeScope, BoardThemeTone, DifficultyOption, DifficultySettings, GameDifficultySettings } from "../types";
import { applyDifficultyToSuggestionDisplay, CUSTOM_SETTING_DEFINITIONS, GAME_SETTINGS_KEY, GameSettingsContext, getBoardThemeSettingsForPreset, getDifficultyPresetSettings, inferDifficultyPreset, readStoredGameSettings } from "./gameSettings";

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
				const presetSettings = getDifficultyPresetSettings(difficulty);
				persistSettings({
					...settings,
					difficulty,
					customSettings: presetSettings ?? settings.customSettings,
					suggestionDisplay: applyDifficultyToSuggestionDisplay(difficulty, settings.suggestionDisplay),
				});
			},
			setCustomSetting: (settingId: keyof DifficultySettings, enabled: boolean) => {
				const nextCustomSettings: DifficultySettings = {
					...settings.customSettings,
					[settingId]: enabled,
				};

				if (!enabled) {
					CUSTOM_SETTING_DEFINITIONS.forEach((settingDefinition) => {
						if (settingDefinition.requires === settingId) {
							nextCustomSettings[settingDefinition.id] = false;
						}
					});
				}

				persistSettings({
					...settings,
					difficulty: inferDifficultyPreset(nextCustomSettings),
					customSettings: nextCustomSettings,
				});
			},
			setBoardThemePreset: (preset: BoardThemePreset) => {
				persistSettings({
					...settings,
					boardTheme: getBoardThemeSettingsForPreset(preset, settings.boardTheme),
				});
			},
			setBoardThemeTone: (scope: BoardThemeScope, tone: BoardThemeTone) => {
				const toneKey = scope === "adventure" ? "adventureTone" : scope === "standard" ? "standardTone" : "shellTone";
				persistSettings({
					...settings,
					boardTheme: {
						...settings.boardTheme,
						preset: "custom",
						[toneKey]: tone,
					},
				});
			},
			setBoardThemePalette: (scope: BoardThemeScope, palette: BoardThemePalette) => {
				const paletteKey = scope === "adventure" ? "adventurePalette" : scope === "standard" ? "standardPalette" : "shellPalette";
				persistSettings({
					...settings,
					boardTheme: {
						...settings.boardTheme,
						preset: "custom",
						[paletteKey]: palette,
					},
				});
			},
				setActorPopularityCutoff: (cutoff: number | null) => {
				persistSettings({
					...settings,
					dataFilters: {
						...settings.dataFilters,
						actorPopularityCutoff: cutoff,
					},
				});
			},
			setReleaseYearCutoff: (year: number | null) => {
				persistSettings({
					...settings,
					dataFilters: {
						...settings.dataFilters,
						releaseYearCutoff: year,
					},
				});
			},
			setMovieSortMode: (mode: "releaseYear" | "random") => {
				persistSettings({
					...settings,
					dataFilters: {
						...settings.dataFilters,
						movieSortMode: mode,
					},
				});
			},
			setActorSortMode: (mode: "popularity" | "random") => {
				persistSettings({
					...settings,
					dataFilters: {
						...settings.dataFilters,
						actorSortMode: mode,
					},
				});
			},
			setSuggestionViewMode: (mode: "all" | "subset") => {
				persistSettings({
					...settings,
					suggestionDisplay: {
						...settings.suggestionDisplay,
						viewMode: mode,
					},
				});
			},
			setSubsetCount: (count: number) => {
				const nextCount = Math.min(10, Math.max(2, Math.round(count)));
				persistSettings({
					...settings,
					suggestionDisplay: {
						...settings.suggestionDisplay,
						subsetCount: nextCount,
					},
				});
			},
			setAllWindowMode: (mode: "pagination" | "scroll") => {
				persistSettings({
					...settings,
					suggestionDisplay: {
						...settings.suggestionDisplay,
						allWindowMode: mode,
					},
				});
			},
			setSuggestionOrderMode: (mode: "ranked" | "shuffled") => {
				persistSettings({
					...settings,
					suggestionDisplay: {
						...settings.suggestionDisplay,
						viewMode: mode === "shuffled" ? "subset" : "all",
						allWindowMode: "scroll",
						orderMode: mode,
					},
				});
			},
			setSuggestionSortMode: (mode: "default" | "best-path" | "random") => {
				persistSettings({
					...settings,
					suggestionDisplay: {
						...settings.suggestionDisplay,
						sortMode: mode,
					},
				});
			},
		}),
		[settings],
	);

	return <GameSettingsContext.Provider value={value}>{children}</GameSettingsContext.Provider>;
}