import type { DataIndicatorVariant } from "../types";

type DataIndicatorGlyphProps = {
	variant: DataIndicatorVariant;
	className?: string;
	pulse?: boolean;
};

function DataIndicatorGlyph({ variant, className = "", pulse = false }: DataIndicatorGlyphProps) {
	return (
		<span className={`dataIndicatorGlyph dataIndicatorGlyph--${variant}${pulse ? " dataIndicatorGlyph--pulse" : ""}${className ? ` ${className}` : ""}`} aria-hidden="true">
			<span className="dataIndicatorGlyphCore" />
			<span className="dataIndicatorGlyphSignal" />
		</span>
	);
}

export default DataIndicatorGlyph;