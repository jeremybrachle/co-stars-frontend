import { Link } from "react-router-dom";
import DataIndicatorGlyph from "./DataIndicatorGlyph";

type FullDataWaitingMessageProps = {
	onSwitchToDemo: () => void;
};

function FullDataWaitingMessage({ onSwitchToDemo }: FullDataWaitingMessageProps) {
	return (
		<div className="fullDataWaitingMessage" role="status" aria-live="polite">
			<div className="fullDataWaitingHeader">
				<DataIndicatorGlyph variant="online-snapshot" pulse />
				<strong>Snapshot data is still loading.</strong>
			</div>
			<p className="fullDataWaitingCopy">The installed or selected snapshot bundle has not finished loading yet. You can wait here, switch to demo data, or open advanced data settings.</p>
			<div className="fullDataWaitingActions">
				<button type="button" onClick={onSwitchToDemo}>Use Demo Data</button>
				<Link to="/settings?tab=data" className="fullDataWaitingLink">Advanced data settings</Link>
			</div>
		</div>
	);
}

export default FullDataWaitingMessage;
