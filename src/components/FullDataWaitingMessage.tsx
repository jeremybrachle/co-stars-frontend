import { Link } from "react-router-dom";
import DataIndicatorGlyph from "./DataIndicatorGlyph";

type FullDataWaitingMessageProps = {
	onSwitchToDemo: () => void;
	waitTimeoutRemainingMs: number | null;
};

function formatRemainingTime(milliseconds: number) {
	const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function FullDataWaitingMessage({ onSwitchToDemo, waitTimeoutRemainingMs }: FullDataWaitingMessageProps) {
	return (
		<div className="fullDataWaitingMessage" role="status" aria-live="polite">
			<div className="fullDataWaitingHeader">
				<DataIndicatorGlyph variant="online-snapshot" pulse />
				<strong>Game is loading and waiting on full data.</strong>
			</div>
			<p className="fullDataWaitingCopy">Hosted S3 snapshot files are still syncing. You can wait here or instantly switch to demo data.</p>
			{waitTimeoutRemainingMs !== null ? (
				<p className="fullDataWaitingTimer">Auto-switching to demo in {formatRemainingTime(waitTimeoutRemainingMs)}.</p>
			) : null}
			<div className="fullDataWaitingActions">
				<button type="button" onClick={onSwitchToDemo}>Use Demo Data</button>
				<Link to="/settings" className="fullDataWaitingLink">Advanced data settings</Link>
			</div>
		</div>
	);
}

export default FullDataWaitingMessage;
