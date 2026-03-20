import { useState } from "react";
import EntityArtwork from "./EntityArtwork";
import type { Level } from "../types";
import type { LevelHistoryRecord } from "../utils/levelHistoryStorage";
import styles from "./LevelCard.module.css";

type StarTone = "gold" | "silver" | "bronze";
type DisplayStar = {
	tone: StarTone;
};

function getStarTone(hops: number, optimalHops: number | null | undefined): StarTone {
	const safeHops = Math.max(0, Math.round(hops));
	const safeOptimalHops = typeof optimalHops === "number" ? Math.max(0, Math.round(optimalHops)) : null;

	if (safeOptimalHops === null) {
		return "bronze";
	}

	if (safeHops <= safeOptimalHops) {
		return "gold";
	}

	if (safeHops <= safeOptimalHops + 2) {
		return "silver";
	}

	return "bronze";
}

function getDisplayedStarCount(optimalHops: number | null | undefined) {
	if (typeof optimalHops !== "number") {
		return 0;
	}

	return Math.max(0, Math.round(optimalHops));
}

function buildDisplayedStars(hops: number, optimalHops: number | null | undefined) {
	const safeHops = Math.max(0, Math.round(hops));
	const tone = getStarTone(safeHops, optimalHops);

	return Array.from({ length: safeHops }, () => ({ tone } satisfies DisplayStar));
}

function getToneClassSuffix(tone: StarTone) {
	return tone === "gold" ? "Gold" : tone === "silver" ? "Silver" : "Bronze";
}

function getCompletionSegmentCount(tone: StarTone | null) {
	if (tone === "gold") {
		return 3;
	}

	if (tone === "silver") {
		return 2;
	}

	if (tone === "bronze") {
		return 1;
	}

	return 0;
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
	const bestAttemptTone = bestAttempt ? getStarTone(bestAttempt.hops, level.optimalHops) : null;
	const bestAttemptToneClass = getToneClassSuffix(bestAttemptTone ?? "bronze");
	const completionSegmentCount = getCompletionSegmentCount(bestAttemptTone);
	const hasPerfectScore = (bestAttempt?.score ?? 0) >= 100;

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
					{isCompleted ? (
						<button
							type="button"
							className={`${styles.completionBadge} ${styles.completionBadgeDone} ${styles.completionBadgeButton}`}
							onClick={() => setIsLeaderboardOpen(true)}
							aria-label={`Open leaderboard for level ${levelIndex + 1}`}
						>
							<span
								className={`${styles.completionBadgeIndicator} ${styles[`completionBadgeIndicatorTone${bestAttemptToneClass}`]}`}
								aria-hidden="true"
							>
								<span className={`${styles.completionBadgeSegment} ${styles.completionBadgeSegmentTop} ${completionSegmentCount >= 3 ? styles.completionBadgeSegmentFilled : ""}`} />
								<span className={`${styles.completionBadgeSegment} ${styles.completionBadgeSegmentLeft} ${completionSegmentCount >= 1 ? styles.completionBadgeSegmentFilled : ""}`} />
								<span className={`${styles.completionBadgeSegment} ${styles.completionBadgeSegmentRight} ${completionSegmentCount >= 2 ? styles.completionBadgeSegmentFilled : ""}`} />
								<span className={`${styles.completionBadgeSegment} ${styles.completionBadgeSegmentCore} ${hasPerfectScore ? styles.completionBadgeSegmentFilled : ""}`} />
							</span>
							<span>Completed</span>
						</button>
					) : (
						<span className={styles.completionBadge}>
							<span className={styles.completionBadgeIndicator} aria-hidden="true">
								<span className={`${styles.completionBadgeSegment} ${styles.completionBadgeSegmentTop}`} />
								<span className={`${styles.completionBadgeSegment} ${styles.completionBadgeSegmentLeft}`} />
								<span className={`${styles.completionBadgeSegment} ${styles.completionBadgeSegmentRight}`} />
								<span className={`${styles.completionBadgeSegment} ${styles.completionBadgeSegmentCore}`} />
							</span>
							<span>Not completed</span>
						</span>
					)}
				</div>
			</div>

			<div className={styles.matchupPanel}>
				<div className={styles.matchupRow}>
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
							<span className={styles.levelActorName}>{level.actorA}</span>
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
							<span className={styles.levelActorName}>{level.actorB}</span>
						</span>
					</span>
				</div>

				<div className={styles.actionRow}>
					<button className={styles.playNowButton} disabled={disabled} onClick={onStart}>
						Play Now
					</button>
				</div>
			</div>

			{isLeaderboardOpen ? (
				<div className={styles.leaderboardOverlay} onClick={() => setIsLeaderboardOpen(false)}>
					<div className={styles.leaderboardDialog} onClick={(event) => event.stopPropagation()}>
						<button
							type="button"
							className={styles.leaderboardCloseButton}
							onClick={() => setIsLeaderboardOpen(false)}
							aria-label="Close leaderboard"
						>
							×
						</button>
						<h3 className={styles.leaderboardDialogTitle}>Level {levelIndex + 1} Leaderboard</h3>
						<p className={styles.leaderboardDialogSubtitle}>{level.actorA} → {level.actorB}</p>
						<p className={styles.leaderboardDialogDescription}>
							Review your saved attempts for this level. Entries are ordered by fewest hops first, then highest score, so your best route stays at the top.
						</p>
						<div className={styles.leaderboardSummaryGrid}>
							<div className={styles.leaderboardSummaryCard}>
								<span className={styles.leaderboardSummaryLabel}>Target</span>
								<span className={styles.leaderboardSummaryValue}>Optimal in {level.optimalHops ?? "--"}</span>
								<span className={styles.leaderboardSummaryMeta}>Gold matches optimal, silver is within two hops, bronze is anything beyond that.</span>
							</div>
							<div className={styles.leaderboardSummaryCard}>
								<span className={styles.leaderboardSummaryLabel}>Saved routes</span>
								<span className={styles.leaderboardSummaryValue}>{totalAttempts}</span>
								<span className={styles.leaderboardSummaryMeta}>Attempts stored for this level on this browser</span>
							</div>
                            <div className={styles.leaderboardSummaryCard}>
								<span className={styles.leaderboardSummaryLabel}>Best run</span>
								{bestAttempt ? (
									<>
										<div className={styles.leaderboardSummaryValueRow}>
											<span className={styles.leaderboardSummaryValue}>{bestAttempt.hops} hops</span>
											<span className={`${styles.leaderboardSummaryTrophy} ${styles[`leaderboardSummaryTrophyTone${bestAttemptToneClass}`]} ${styles[`leaderboardSummaryTrophySize${bestAttemptToneClass}`]}`} aria-hidden="true">
												🏆
											</span>
										</div>
										<span className={styles.leaderboardSummaryMeta}>{bestAttempt.score.toFixed(1)}% final score</span>
									</>
								) : (
									<span className={styles.leaderboardSummaryMeta}>No completed runs saved yet</span>
								)}
							</div>
						</div>
						{leaderboardAttempts.length === 0 ? (
							<div className={styles.leaderboardEmpty}>No saved routes for this level yet. Finish the level once to start building a personal leaderboard here.</div>
						) : (
							<ol className={styles.leaderboardList}>
								{leaderboardAttempts.map((attempt, index) => {
									const attemptToneClass = getToneClassSuffix(getStarTone(attempt.hops, level.optimalHops));

									return (
									<li key={attempt.id} className={styles.leaderboardItem}>
										<div className={styles.leaderboardTopRow}>
											<span className={styles.leaderboardRank}>#{index + 1}</span>
											<span className={styles.leaderboardHops}>{attempt.hops} hops</span>
											<span className={`${styles.leaderboardAttemptTrophy} ${styles[`leaderboardAttemptTrophyTone${attemptToneClass}`]} ${styles[`leaderboardAttemptTrophySize${attemptToneClass}`]}`} aria-hidden="true">
												🏆
											</span>
											<span className={styles.leaderboardStars}>
												{buildDisplayedStars(attempt.hops, level.optimalHops).map((star, starIndex) => (
													<span
														key={starIndex}
														className={`${styles.leaderboardStar} ${styles[`leaderboardStarTone${getToneClassSuffix(star.tone)}`]}`}
													>
														★
													</span>
												))}
											</span>
											<span className={styles.leaderboardScore}>{attempt.score.toFixed(1)}%</span>
										</div>
										<div className={styles.leaderboardPath}>{attempt.path.map((node) => node.label).join(" → ")}</div>
									</li>
									);
								})}
							</ol>
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}

export default LevelCard;
