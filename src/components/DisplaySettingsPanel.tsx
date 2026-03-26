type DisplaySettingsPanelProps = {
	completionDarkMode: boolean;
	onCompletionDarkModeChange: (enabled: boolean) => void;
	showHeading?: boolean;
};

function DisplaySettingsPanel({
	completionDarkMode,
	onCompletionDarkModeChange,
	showHeading = true,
}: DisplaySettingsPanelProps) {
	return (
		<div className="settingsToggleSection settingsToggleSection--carded">
			{showHeading ? <h3 className="settingsToggleSectionTitle">Appearance</h3> : null}
			<div className="settingsToggleGrid">
				<article className="settingsToggleCard">
					<div className="settingsToggleCardTop">
						<div className="settingsToggleCardLabelWrap">
							<strong>Dark mode for level-complete menus</strong>
							<span className="settingsHint">Off by default. This only changes the level-complete popup and pinned completion banner.</span>
						</div>
						<div className="settingsToggleControl">
							<span className={`settingsToggleState${completionDarkMode ? " settingsToggleState--on" : ""}`}>{completionDarkMode ? "On" : "Off"}</span>
							<button
								type="button"
								className={`settingsToggleSwitch${completionDarkMode ? " settingsToggleSwitch--on" : ""}`}
								onClick={() => onCompletionDarkModeChange(!completionDarkMode)}
								aria-pressed={completionDarkMode}
							>
								<span className="settingsToggleThumb" aria-hidden="true" />
							</button>
						</div>
					</div>
				</article>
			</div>
		</div>
	);
}

export default DisplaySettingsPanel;