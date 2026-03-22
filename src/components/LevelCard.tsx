import { useState } from "react";
import EntityArtwork from "./EntityArtwork";
import type { Level } from "../types";
import type { LevelHistoryRecord } from "../utils/levelHistoryStorage";
import { getLevelScoreStars } from "../utils/calculateLevelScore";
import { useIsCompactPhoneViewport } from "../hooks/useIsCompactPhoneViewport";
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

function buildExecutionStars(stars: number) {
	const normalizedStars = Math.max(0, Math.min(3, Math.round(stars)));

	return Array.from({ length: 3 }, (_, index) => ({
		filled: index < normalizedStars,
	}));
}

function formatExecutionScore(score: number) {
	return `${Math.round(score)}/100`;
}

function getToneClassSuffix(tone: StarTone) {
	return tone === "gold" ? "Gold" : tone === "silver" ? "Silver" : "Bronze";
}

function getCompletionTrophyCount(tone: StarTone | null) {
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

function formatAverageReleaseYear(value: number | null | undefined) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return "--";
	}

	return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function splitActorName(value: string) {
	const parts = value.trim().split(/\s+/).filter(Boolean);

	if (parts.length <= 1) {
		return { firstLine: value, secondLine: null };
	}

	return {
		firstLine: parts[0],
		secondLine: parts.slice(1).join(" "),
	};
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
	const isCompactPhoneViewport = useIsCompactPhoneViewport();
	const leaderboardAttempts = levelHistory?.attempts ?? [];
	const bestAttempt = leaderboardAttempts[0] ?? null;
	const totalAttempts = levelHistory?.attempts.length ?? 0;
	const displayedStarCount = getDisplayedStarCount(level.optimalHops);
	const levelStars = buildDisplayedStars(displayedStarCount, level.optimalHops);
	const bestAttemptTone = bestAttempt ? getStarTone(bestAttempt.hops, level.optimalHops) : null;
	const completionTrophyCount = getCompletionTrophyCount(bestAttemptTone);
	const leftActorName = splitActorName(level.actorA);
	const rightActorName = splitActorName(level.actorB);

	return (
		<div className={`${styles.card} ${isCompleted ? styles.cardCompleted : ""}`}>
			<div className={styles.headerRow}>
				<div className={styles.levelLabel}>
					<span>Level {levelIndex + 1}</span>
					{!isCompactPhoneViewport && levelStars.length > 0 ? (
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
					{isCompactPhoneViewport ? null : (
						<span className={styles.levelHops}>Optimal hops: {level.optimalHops ?? "--"}</span>
					)}
				</div>
				{isCompactPhoneViewport ? (
					<span className={`${styles.levelHops} ${styles.levelHopsCompact}`} aria-label={`Optimal hops: ${level.optimalHops ?? "unknown"}`}>
						<span className={styles.levelHopsCompactLabel}>Optimal hops: {level.optimalHops ?? "--"}</span>
						{/* <span className={styles.levelHopsCompactValue}>{level.optimalHops ?? "--"}</span> */}
					</span>
				) : null}
				<div className={styles.headerActions}>
					{isCompleted ? (
						<button
							type="button"
							className={`${styles.completionBadge} ${styles.completionBadgeDone} ${styles.completionBadgeButton}`}
							onClick={() => setIsLeaderboardOpen(true)}
							aria-label={`Open leaderboard for level ${levelIndex + 1}`}
						>
							{isCompactPhoneViewport ? (
								<span className={`${styles.completionBadgeTrophy} ${styles.completionBadgeTrophyFilled}`} aria-hidden="true">🏆</span>
							) : (
								<>
									<span
										className={styles.completionBadgeTrophyRow}
										aria-hidden="true"
									>
										{Array.from({ length: 3 }, (_, trophyIndex) => (
											<span
												key={trophyIndex}
												className={`${styles.completionBadgeTrophy} ${trophyIndex < completionTrophyCount ? styles.completionBadgeTrophyFilled : styles.completionBadgeTrophyEmpty}`}
											>
												🏆
											</span>
										))}
									</span>
									<span>Completed</span>
								</>
							)}
						</button>
					) : (
						<span className={styles.completionBadge}>
							{isCompactPhoneViewport ? (
								<span className={`${styles.completionBadgeTrophy} ${styles.completionBadgeTrophyEmpty}`} aria-hidden="true">🏆</span>
							) : (
								<>
									<span className={styles.completionBadgeTrophyRow} aria-hidden="true">
										{Array.from({ length: 3 }, (_, trophyIndex) => (
											<span key={trophyIndex} className={`${styles.completionBadgeTrophy} ${styles.completionBadgeTrophyEmpty}`}>
												🏆
											</span>
										))}
									</span>
									<span>Not completed</span>
								</>
							)}
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
							<span className={styles.levelActorName}>
								<span className={styles.levelActorNameLine}>{leftActorName.firstLine}</span>
								{leftActorName.secondLine ? <span className={styles.levelActorNameLine}>{leftActorName.secondLine}</span> : null}
							</span>
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
							<span className={styles.levelActorName}>
								<span className={styles.levelActorNameLine}>{rightActorName.firstLine}</span>
								{rightActorName.secondLine ? <span className={styles.levelActorNameLine}>{rightActorName.secondLine}</span> : null}
							</span>
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
						<div className={styles.leaderboardSummaryInline}>
							<span className={styles.leaderboardSummaryPill}>Optimal {level.optimalHops ?? "--"} hops</span>
							<span className={styles.leaderboardSummaryPill}>{totalAttempts} saved route{totalAttempts === 1 ? "" : "s"}</span>
							{bestAttempt ? (
								<>
									<span className={styles.leaderboardSummaryPill}>Best {bestAttempt.hops} hops</span>
									<span className={styles.leaderboardSummaryPill}>Best turns {bestAttempt.turns ?? "--"}</span>
									<span className={styles.leaderboardSummaryPill}>Best score {formatExecutionScore(bestAttempt.score)}</span>
								</>
							) : (
								<span className={styles.leaderboardSummaryPill}>No saved runs yet</span>
							)}
						</div>
						{leaderboardAttempts.length === 0 ? (
							<div className={styles.leaderboardEmpty}>No saved routes for this level yet. Finish the level once to start building a personal leaderboard here.</div>
						) : (
							<ol className={styles.leaderboardList}>
								{leaderboardAttempts.map((attempt, index) => {
									const attemptToneClass = getToneClassSuffix(getStarTone(attempt.hops, level.optimalHops));
									const attemptTier = attempt.tier ?? (level.optimalHops === null || level.optimalHops === undefined
										? "BRONZE"
										: attempt.hops <= level.optimalHops
											? "GOLD"
											: attempt.hops <= level.optimalHops + 2
												? "SILVER"
												: "BRONZE");
									const attemptStars = typeof attempt.stars === "number" ? attempt.stars : getLevelScoreStars(attempt.score);

									return (
									<li key={attempt.id} className={styles.leaderboardItem}>
										<div className={styles.leaderboardTopRow}>
											<span className={styles.leaderboardRank}>#{index + 1}</span>
											<span className={styles.leaderboardHops}>{attempt.hops} hops</span>
											<span className={styles.leaderboardTurns}>{typeof attempt.turns === "number" ? `${attempt.turns} turns` : "-- turns"}</span>
											<span className={`${styles.leaderboardTierBadge} ${styles[`leaderboardTierBadge${attemptTier.charAt(0)}${attemptTier.slice(1).toLowerCase()}`]}`}>{attemptTier}</span>
											<span className={`${styles.leaderboardAttemptTrophy} ${styles[`leaderboardAttemptTrophyTone${attemptToneClass}`]} ${styles[`leaderboardAttemptTrophySize${attemptToneClass}`]}`} aria-hidden="true">
												🏆
											</span>
											<span className={styles.leaderboardStars}>
												{buildExecutionStars(attemptStars).map((star, starIndex) => (
													<span
														key={starIndex}
														className={`${styles.leaderboardStar} ${star.filled ? styles.leaderboardStarFilled : styles.leaderboardStarEmpty}`}
													>
														★
													</span>
												))}
											</span>
											<span className={styles.leaderboardScore}>{formatExecutionScore(attempt.score)}</span>
										</div>
										<div className={styles.leaderboardMetrics}>
											<span className={styles.leaderboardMetric}>effective turns {typeof attempt.effectiveTurns === "number" ? attempt.effectiveTurns : "--"}</span>
											<span className={styles.leaderboardMetric}>{attempt.shuffleModeEnabled === false ? "shuffles N/A" : `shuffles ${attempt.shuffles}`}</span>
											<span className={styles.leaderboardMetric}>rewinds {attempt.rewinds}</span>
											<span className={styles.leaderboardMetric}>repeat nodes {attempt.repeatNodeClicks ?? 0}</span>
											<span className={styles.leaderboardMetric}>dead ends {attempt.deadEnds}</span>
											<span className={styles.leaderboardMetric}>mistakes {attempt.totalMistakes ?? ((attempt.repeatNodeClicks ?? 0) + attempt.deadEnds)}</span>
											<span className={styles.leaderboardMetric}>popularity avg {typeof attempt.popularityScore === "number" ? attempt.popularityScore : "--"}</span>
											<span className={styles.leaderboardMetric}>avg year {formatAverageReleaseYear(attempt.averageReleaseYear)}</span>
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
