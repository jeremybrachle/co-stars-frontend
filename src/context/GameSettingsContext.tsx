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
				const nextCustomSettings: DifficultySettings = {
					...settings.customSettings,
					[settingId]: enabled,
				};

				if (settingId === "show-cast-lock-risk" && !enabled) {
					nextCustomSettings["show-full-cast-lock"] = false;
				}

				if (settingId === "show-full-cast-lock" && enabled) {
					nextCustomSettings["show-cast-lock-risk"] = true;
				}

				persistSettings({
					...settings,
					customSettings: nextCustomSettings,
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