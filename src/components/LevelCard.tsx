import { useState } from "react";
import EntityArtwork from "./EntityArtwork";
import type { Level } from "../types";
import type { LevelHistoryRecord } from "../utils/levelHistoryStorage";
import styles from "./LevelCard.module.css";

type StarTone = "gold" | "silver" | "bronze";
type DisplayStar = {
	tone: StarTone;
};

function getDisplayedStarCount(optimalHops: number | null | undefined) {
	if (typeof optimalHops !== "number") {
		return 0;
	}

	return Math.max(0, Math.round(optimalHops));
}

function buildDisplayedStars(hops: number, optimalHops: number | null | undefined) {
	const safeHops = Math.max(0, Math.round(hops));
	const safeOptimalHops = typeof optimalHops === "number" ? Math.max(0, Math.round(optimalHops)) : null;
	const tone: StarTone = safeOptimalHops === null
		? "bronze"
		: safeHops <= safeOptimalHops
			? "gold"
			: safeHops <= safeOptimalHops + 2
				? "silver"
				: "bronze";

	return Array.from({ length: safeHops }, () => ({ tone } satisfies DisplayStar));
}

type Props = {
	level: Level;
	levelIndex: number;
	leftImageUrl: string | null;
	rightImageUrl: string | null;
	isCompleted: boolean;
	levelHistory: LevelHistoryRecord | null;
	disabled?: boolean;
	onStart: () => void;
};

function LevelCard({
	level,
	levelIndex,
	leftImageUrl,
	rightImageUrl,
	isCompleted,
	levelHistory,
	disabled = false,
	onStart,
}: Props) {
	const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
	const leaderboardAttempts = levelHistory?.attempts ?? [];
	const bestAttempt = leaderboardAttempts[0] ?? null;
	const totalAttempts = levelHistory?.attempts.length ?? 0;
	const displayedStarCount = getDisplayedStarCount(level.optimalHops);
	const levelStars = buildDisplayedStars(displayedStarCount, level.optimalHops);

	return (
		<div className={`${styles.card} ${isCompleted ? styles.cardCompleted : ""}`}>
			<div className={styles.headerRow}>
				<div className={styles.levelLabel}>
					<span>Level {levelIndex + 1}</span>
					{levelStars.length > 0 ? (
						<span className={styles.starRow}>
							{levelStars.map((star, starIndex) => (
								<span
									key={starIndex}
									className={`${styles.levelStar} ${styles[`levelStarTone${star.tone === "gold" ? "Gold" : star.tone === "silver" ? "Silver" : "Bronze"}`]}`}
								>
									★
								</span>
							))}
						</span>
					) : null}
					<span className={styles.levelHops}>Optimal hops: {level.optimalHops ?? "--"}</span>
				</div>
				<div className={styles.headerActions}>
					<span className={`${styles.completionBadge} ${isCompleted ? styles.completionBadgeDone : ""}`}>
						{isCompleted ? "☑ Completed" : "☐ Not completed"}
					</span>
				</div>
			</div>

			<button className={styles.levelButton} disabled={disabled} onClick={onStart}>
				<span className={styles.levelActorLeft}>
					<span className={styles.levelActorIdentity}>
						<EntityArtwork
							type="actor"
							label={level.actorA}
							imageUrl={leftImageUrl}
							className={styles.levelActorArtwork}
							imageClassName={styles.levelActorArtworkImage}
							placeholderClassName={styles.levelActorArtworkEmoji}
						/>
						<span>{level.actorA}</span>
					</span>
				</span>
				<span className={styles.levelVs}>vs.</span>
				<span className={styles.levelActorRight}>
					<span className={`${styles.levelActorIdentity} ${styles.levelActorIdentityRight}`}>
						<EntityArtwork
							type="actor"
							label={level.actorB}
							imageUrl={rightImageUrl}
							className={styles.levelActorArtwork}
							imageClassName={styles.levelActorArtworkImage}
							placeholderClassName={styles.levelActorArtworkEmoji}
						/>
						<span>{level.actorB}</span>
					</span>
				</span>
			</button>

			<div className={styles.summaryRow}>
				<span>
					{isCompleted ? "You have already completed this level." : "This level has not been completed yet."}
				</span>
				<span>
					{bestAttempt ? `Best saved run: ${bestAttempt.hops} hops • ${bestAttempt.score.toFixed(1)}%` : "No saved leaderboard entries yet."}
				</span>
			</div>

			<div className={styles.leaderboardSection}>
				<button
					type="button"
					className={styles.leaderboardToggle}
					onClick={() => setIsLeaderboardOpen((currentValue) => !currentValue)}
					aria-expanded={isLeaderboardOpen}
				>
					<span>Leaderboard</span>
					<span>{totalAttempts} saved route{totalAttempts === 1 ? "" : "s"}</span>
				</button>

				{isLeaderboardOpen ? (
					leaderboardAttempts.length === 0 ? (
						<div className={styles.leaderboardEmpty}>No saved routes for this level yet.</div>
					) : (
						<ol className={styles.leaderboardList}>
							{leaderboardAttempts.map((attempt, index) => (
								<li key={attempt.id} className={styles.leaderboardItem}>
									<div className={styles.leaderboardTopRow}>
										<span className={styles.leaderboardRank}>#{index + 1}</span>
										<span className={styles.leaderboardHops}>{attempt.hops} hops</span>
										<span className={styles.leaderboardStars}>
											{buildDisplayedStars(attempt.hops, level.optimalHops).map((star, starIndex) => (
												<span
													key={starIndex}
													className={`${styles.leaderboardStar} ${styles[`leaderboardStarTone${star.tone === "gold" ? "Gold" : star.tone === "silver" ? "Silver" : "Bronze"}`]}`}
												>
													★
												</span>
											))}
										</span>
										<span className={styles.leaderboardScore}>{attempt.score.toFixed(1)}%</span>
									</div>
									<div className={styles.leaderboardPath}>{attempt.path.map((node) => node.label).join(" → ")}</div>
								</li>
							))}
						</ol>
					)
				) : null}
			</div>
		</div>
	);
}

export default LevelCard;
