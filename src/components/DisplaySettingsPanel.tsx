import type { BoardThemePalette, BoardThemePreset, BoardThemeScope, BoardThemeSettings, BoardThemeTone } from "../types";

type DisplaySettingsPanelProps = {
	boardTheme: BoardThemeSettings;
	onBoardThemePresetChange: (preset: BoardThemePreset) => void;
	onBoardThemeToneChange: (scope: BoardThemeScope, tone: BoardThemeTone) => void;
	onBoardThemePaletteChange: (scope: BoardThemeScope, palette: BoardThemePalette) => void;
	showHeading?: boolean;
};

const PRESET_OPTIONS: Array<{ id: BoardThemePreset; label: string; hint: string }> = [
	{
		id: "dynamic",
		label: "Dynamic",
		hint: "Adventure level groups rotate between Original, Light, and Dark. Home and menu screens stay on Original, and Quick Play stays on Light.",
	},
	{
		id: "classic",
		label: "Classic (Original)",
		hint: "Restore the older original gradient-and-glass look everywhere.",
	},
	{
		id: "light",
		label: "Light mode",
		hint: "Use the newer brighter board styling everywhere.",
	},
	{
		id: "dark",
		label: "Dark mode",
		hint: "Use the darker board styling everywhere.",
	},
	{
		id: "custom",
		label: "Custom",
		hint: "Set Adventure boards, Quick Play boards, and shell pages individually to Light, Dark, or a roster palette.",
	},
];

const PRESET_SCOPE_SUMMARIES: Record<Exclude<BoardThemePreset, "custom">, Array<{ scope: string; value: string }>> = {
	dynamic: [
		{ scope: "Adventure boards", value: "Each level group keeps one shared palette, rotating Original, Light, and Dark." },
		{ scope: "Quick Play boards", value: "Always uses the Light board palette." },
		{ scope: "Home and menus", value: "Always uses the Original shell palette." },
	],
	classic: [
		{ scope: "Adventure boards", value: "Original palette." },
		{ scope: "Quick Play boards", value: "Original palette." },
		{ scope: "Home and menus", value: "Original palette." },
	],
	light: [
		{ scope: "Adventure boards", value: "Light palette." },
		{ scope: "Quick Play boards", value: "Light palette." },
		{ scope: "Home and menus", value: "Light palette." },
	],
	dark: [
		{ scope: "Adventure boards", value: "Dark palette." },
		{ scope: "Quick Play boards", value: "Dark palette." },
		{ scope: "Home and menus", value: "Dark palette." },
	],
};

const SCOPE_OPTIONS: Array<{ id: BoardThemeScope; label: string; hint: string }> = [
	{ id: "adventure", label: "Adventure boards", hint: "Applies to Adventure Mode games." },
	{ id: "standard", label: "Quick Play and other boards", hint: "Applies to Quick Play, custom levels, and other non-Adventure boards." },
	{ id: "shell", label: "Home and menus", hint: "Applies to the home screen, settings, and other menu-style pages." },
];

const TONE_OPTIONS: Array<{ id: BoardThemeTone; label: string; hint: string }> = [
	{ id: "light", label: "Light", hint: "Use the current light palette directly." },
	{ id: "dark", label: "Dark", hint: "Use the current dark palette directly." },
	{ id: "custom", label: "Custom palette", hint: "Choose one of the preset color rosters below." },
];

const PALETTE_OPTIONS: Array<{ id: BoardThemePalette; label: string; hint: string }> = [
	{ id: "original", label: "Original", hint: "The pre-palette-change shell style based on the older main-branch colors." },
	{ id: "classic", label: "Classic", hint: "The current classic purple placeholder palette." },
	{ id: "light", label: "Light palette", hint: "The current bright light palette as a selectable custom color." },
	{ id: "dark", label: "Dark palette", hint: "The current dark navy and amber palette as a selectable custom color." },
	{ id: "ocean", label: "Ocean", hint: "A cool blue-green palette." },
	{ id: "sunset", label: "Sunset", hint: "A warm coral and gold palette." },
	{ id: "forest", label: "Forest", hint: "A deep green palette with bright mint accents." },
];

function getScopeTone(boardTheme: BoardThemeSettings, scope: BoardThemeScope) {
	if (scope === "adventure") {
		return boardTheme.adventureTone;
	}

	if (scope === "standard") {
		return boardTheme.standardTone;
	}

	return boardTheme.shellTone;
}

function getScopePalette(boardTheme: BoardThemeSettings, scope: BoardThemeScope) {
	if (scope === "adventure") {
		return boardTheme.adventurePalette;
	}

	if (scope === "standard") {
		return boardTheme.standardPalette;
	}

	return boardTheme.shellPalette;
}

function getCustomScopeSummary(boardTheme: BoardThemeSettings, scope: BoardThemeScope) {
	const tone = getScopeTone(boardTheme, scope);
	if (tone === "light") {
		return "Light palette";
	}

	if (tone === "dark") {
		return "Dark palette";
	}

	const palette = getScopePalette(boardTheme, scope);
	const selectedOption = PALETTE_OPTIONS.find((option) => option.id === palette);
	return selectedOption?.label ?? "Custom palette";
}

function DisplaySettingsPanel({
	boardTheme,
	onBoardThemePresetChange,
	onBoardThemeToneChange,
	onBoardThemePaletteChange,
	showHeading = true,
}: DisplaySettingsPanelProps) {
	const selectedPresetOption = PRESET_OPTIONS.find((option) => option.id === boardTheme.preset) ?? PRESET_OPTIONS[0];
	const presetScopeSummaries = boardTheme.preset === "custom"
		? null
		: PRESET_SCOPE_SUMMARIES[boardTheme.preset as Exclude<BoardThemePreset, "custom">];

	return (
		<div className="settingsToggleSection settingsToggleSection--carded">
			{showHeading ? <h3 className="settingsToggleSectionTitle">Appearance</h3> : null}
			<div className="settingsGameplayLayout displaySettingsLayout">
				<nav className="settingsGameplayNav displaySettingsNav" aria-label="Display presets">
					{PRESET_OPTIONS.map((option) => (
						<button
							key={option.id}
							type="button"
							className={`settingsGameplayNavButton${boardTheme.preset === option.id ? " settingsGameplayNavButton--active" : ""}`}
							onClick={() => onBoardThemePresetChange(option.id)}
						>
							{option.label}
						</button>
					))}
				</nav>

				<div className="settingsGameplayContent displaySettingsContent">
					<div className="displayPresetCard">
						<div className="displayPresetEyebrow">Current preset</div>
						<h4 className="settingsToggleSectionTitle">{selectedPresetOption.label}</h4>
						<p className="settingsHint">{selectedPresetOption.hint}</p>
						{boardTheme.preset === "custom" ? (
							<div className="settingsToggleSectionAddon">
								<div className="displayPresetScopeList displayPresetScopeList--compact">
									{SCOPE_OPTIONS.map((scopeOption) => (
										<div key={`${scopeOption.id}-summary`} className="displayPresetScope">
											<div className="displayPresetScopeLabel">{scopeOption.label}</div>
											<div className="displayPresetScopeValue">{getCustomScopeSummary(boardTheme, scopeOption.id)}</div>
										</div>
									))}
								</div>
								<p className="settingsHint displaySettingsCustomIntro">Adjust each scope below. Adventure group colors stay consistent from the level list into the game board.</p>
								<div className="settingsCustomScopeStack">
									{SCOPE_OPTIONS.map((scopeOption) => {
										const selectedTone = getScopeTone(boardTheme, scopeOption.id);
										const selectedPalette = getScopePalette(boardTheme, scopeOption.id);
										return (
											<div key={scopeOption.id} className="settingsCustomPanel settingsCustomPanel--carded">
												<div className="settingsCustomGroupLabel">{scopeOption.label}</div>
												<p className="settingsHint">{scopeOption.hint}</p>
												<div className="settingsChoiceList">
													{TONE_OPTIONS.map((toneOption) => {
														const isSelected = selectedTone === toneOption.id;
														return (
															<label key={`${scopeOption.id}-${toneOption.id}`} className={`settingsChoiceRow${isSelected ? " settingsChoiceRow--selected" : ""}`}>
																<input
																	type="radio"
																	name={`board-theme-tone-${scopeOption.id}`}
																	checked={isSelected}
																	onChange={() => onBoardThemeToneChange(scopeOption.id, toneOption.id)}
																/>
																<span className="settingsChoiceRadio" aria-hidden="true" />
																<span className="settingsChoiceText">
																	<span className="settingsChoiceLabel">{toneOption.label}</span>
																	<span className="settingsHint">{toneOption.hint}</span>
																</span>
															</label>
														);
													})}
												</div>
												{selectedTone === "custom" ? (
													<div className="settingsPaletteGrid">
														{PALETTE_OPTIONS.map((paletteOption) => {
															const isSelected = selectedPalette === paletteOption.id;
															return (
																<label key={`${scopeOption.id}-${paletteOption.id}`} className={`settingsChoiceRow${isSelected ? " settingsChoiceRow--selected" : ""}`}>
																	<input
																		type="radio"
																		name={`board-theme-palette-${scopeOption.id}`}
																		checked={isSelected}
																		onChange={() => onBoardThemePaletteChange(scopeOption.id, paletteOption.id)}
																	/>
																	<span className="settingsChoiceRadio" aria-hidden="true" />
																	<span className="settingsChoiceText">
																		<span className="settingsChoiceLabel">{paletteOption.label}</span>
																		<span className="settingsHint">{paletteOption.hint}</span>
																	</span>
																</label>
															);
														})}
													</div>
												) : null}
											</div>
										);
									})}
								</div>
							</div>
						) : (
							<div className="displayPresetScopeList">
								{presetScopeSummaries?.map((summary) => (
									<div key={summary.scope} className="displayPresetScope">
										<div className="displayPresetScopeLabel">{summary.scope}</div>
										<div className="displayPresetScopeValue">{summary.value}</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default DisplaySettingsPanel;