import type { NodeType } from "../types";
import { getEntityEmoji } from "../data/presentation";

type Props = {
	type: NodeType;
	label: string;
	imageUrl?: string | null;
	className?: string;
	imageClassName?: string;
	placeholderClassName?: string;
};

function EntityArtwork({ type, label, imageUrl, className, imageClassName, placeholderClassName }: Props) {
	if (imageUrl) {
		return (
			<div className={className} aria-hidden="true">
				<img className={imageClassName} src={imageUrl} alt={label} loading="lazy" />
			</div>
		);
	}

	return (
		<div className={className} aria-hidden="true">
			<span className={placeholderClassName}>{getEntityEmoji(type)}</span>
		</div>
	);
}

export default EntityArtwork;