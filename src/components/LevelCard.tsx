import { useState, type KeyboardEvent, type MouseEvent } from "react";
import EntityArtwork from "./EntityArtwork";
import type { Level } from "../types";
import type { LevelHistoryRecord } from "../utils/levelHistoryStorage";
import { getLevelScoreStars } from "../utils/calculateLevelScore";
import { useIsCompactPhoneViewport } from "../hooks/useIsCompactPhoneViewport";
import styles from "./LevelCard.module.css";

type StarTone = "gold" | "silver" | "bronze";
type CompletionSummaryTone = StarTone | "fail";
type DisplayStar = {
	tone: StarTone;
};

const LEADERBOARD_ENTRY_LIMIT = 10;

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

function getIntermediateCount(count: number | null | undefined) {
	if (typeof count !== "number" || !Number.isFinite(count)) {
		return null;
	}

	return Math.max(0, Math.round(count) - 1);
}

function formatIntermediateLabel(count: number | null | undefined) {
	if (typeof count !== "number" || !Number.isFinite(count)) {
		return "-- intermediates";
	}

	return `${count} ${count === 1 ? "intermediate" : "intermediates"}`;
}

function getToneClassSuffix(tone: StarTone) {
	return tone === "gold" ? "Gold" : tone === "silver" ? "Silver" : "Bronze";
}

function getCompletionToneClassSuffix(tone: CompletionSummaryTone) {
	if (tone === "gold") {
		return "Gold";
	}

	if (tone === "silver") {
		return "Silver";
	}

	if (tone === "bronze") {
		return "Bronze";
	}

	return "Fail";
}

function getAttemptTier(hops: number, optimalHops: number | null | undefined) {
	if (typeof optimalHops !== "number") {
		return "BRONZE" as const;
	}

	if (hops <= optimalHops) {
		return "GOLD" as const;
	}

	if (hops <= optimalHops + 2) {
		return "SILVER" as const;
	}

	return "BRONZE" as const;
}

function getCompletionSummaryTone(tier: string | null | undefined): CompletionSummaryTone {
	if (tier === "GOLD") {
		return "gold";
	}

	if (tier === "SILVER") {
		return "silver";
	}

	if (tier === "FAIL") {
		return "fail";
	}

	return "bronze";
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

function getHigherScoreAttempt(
	bestAttempt: LevelHistoryRecord["attempts"][number] | null,
	candidateAttempt: LevelHistoryRecord["attempts"][number],
) {
	if (!bestAttempt) {
		return candidateAttempt;
	}

	if (candidateAttempt.score !== bestAttempt.score) {
		return candidateAttempt.score > bestAttempt.score ? candidateAttempt : bestAttempt;
	}

	if (candidateAttempt.hops !== bestAttempt.hops) {
		return candidateAttempt.hops < bestAttempt.hops ? candidateAttempt : bestAttempt;
	}

	const candidateTurns = typeof candidateAttempt.turns === "number" ? candidateAttempt.turns : Number.POSITIVE_INFINITY;
	const bestTurns = typeof bestAttempt.turns === "number" ? bestAttempt.turns : Number.POSITIVE_INFINITY;
	return candidateTurns < bestTurns ? candidateAttempt : bestAttempt;
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
	const [isCompactDetailOpen, setIsCompactDetailOpen] = useState(false);
	const [isCompactLeaderboardOpen, setIsCompactLeaderboardOpen] = useState(false);
	const isCompactPhoneViewport = useIsCompactPhoneViewport();
	const leaderboardAttempts = levelHistory?.attempts ?? [];
	const displayedLeaderboardAttempts = leaderboardAttempts.slice(0, LEADERBOARD_ENTRY_LIMIT);
	const bestAttempt = leaderboardAttempts[0] ?? null;
	const highestScoreAttempt = leaderboardAttempts.reduce(getHigherScoreAttempt, null as LevelHistoryRecord["attempts"][number] | null);
	const totalAttempts = leaderboardAttempts.length;
	const displayedStarCount = getDisplayedStarCount(level.optimalHops);
	const levelStars = buildDisplayedStars(displayedStarCount, level.optimalHops);
	const bestAttemptTone = bestAttempt ? getStarTone(bestAttempt.hops, level.optimalHops) : null;
	const highestScoreTier = highestScoreAttempt
		? highestScoreAttempt.tier ?? getAttemptTier(highestScoreAttempt.hops, level.optimalHops)
		: null;
	const completionSummaryTone = highestScoreTier ? getCompletionSummaryTone(highestScoreTier) : null;
	const completionSummaryStars = highestScoreAttempt
		? (typeof highestScoreAttempt.stars === "number" ? highestScoreAttempt.stars : getLevelScoreStars(highestScoreAttempt.score))
		: 0;
	const leftActorName = splitActorName(level.actorA);
	const rightActorName = splitActorName(level.actorB);
	const optimalIntermediateCount = getIntermediateCount(level.optimalHops);
	const compactCompletionLabel = isCompleted ? "Completed" : "Not completed";
	const playButtonLabel = isCompleted ? "Replay" : "Play Now";

	const handleOpenCompactDetails = () => {
		if (disabled) {
			return;
		}

		setIsCompactLeaderboardOpen(false);
		setIsCompactDetailOpen(true);
	};

	const handleOpenCompactLeaderboardDetails = () => {
		if (!isCompleted) {
			return;
		}

		setIsCompactDetailOpen(true);
		setIsCompactLeaderboardOpen(true);
	};

	const handleMatchupPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (disabled) {
			return;
		}

		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleOpenCompactDetails();
		}
	};

	const handleToggleCompactLeaderboard = () => {
		if (!isCompleted) {
			return;
		}

		setIsCompactLeaderboardOpen((currentValue) => !currentValue);
	};

	const handleStartButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
		event.stopPropagation();
		onStart();
	};

	const renderCompletionSummary = () => (
		<span className={styles.completionSummary}>
			<span
				className={`${styles.completionBadgeTrophy} ${styles.completionSummaryTrophy} ${isCompleted ? styles.completionBadgeTrophyFilled : styles.completionBadgeTrophyEmpty}${completionSummaryTone ? ` ${styles[`completionBadgeTrophyTone${getCompletionToneClassSuffix(completionSummaryTone)}`]}` : ""}`}
				aria-hidden="true"
			>
				🏆
			</span>
			<span className={styles.completionSummaryStars} aria-hidden="true">
				{buildExecutionStars(isCompleted ? completionSummaryStars : 0).map((star, starIndex) => (
					<span
						key={starIndex}
						className={`${styles.completionSummaryStar} ${star.filled ? styles.completionSummaryStarFilled : styles.completionSummaryStarEmpty}${completionSummaryTone ? ` ${styles[`completionSummaryStarTone${getCompletionToneClassSuffix(completionSummaryTone)}`]}` : ""}`}
					>
						★
					</span>
				))}
			</span>
		</span>
	);

	return (
		<div className={`${styles.card} ${isCompleted ? styles.cardCompleted : ""}`}>
			{isCompactPhoneViewport ? (
				<div className={styles.compactCardLayout}>
					<div className={styles.compactCardTopRow}>
						<div className={styles.compactLevelBadge}>Level {levelIndex + 1}</div>
						{isCompleted ? (
							<button
								type="button"
								className={`${styles.completionBadge} ${styles.completionBadgeDone} ${styles.completionBadgeButton} ${styles.compactCompletionBadgeButton}`}
								onClick={handleOpenCompactLeaderboardDetails}
								aria-label={`Open leaderboard for level ${levelIndex + 1}`}
							>
								{renderCompletionSummary()}
							</button>
						) : (
							<span className={`${styles.completionBadge} ${styles.compactPassiveTrophy}`} aria-hidden="true">
								{renderCompletionSummary()}
							</span>
						)}
					</div>
					<div
						className={styles.compactCardButton}
						onClick={handleOpenCompactDetails}
						onKeyDown={handleMatchupPanelKeyDown}
						role="button"
						tabIndex={disabled ? -1 : 0}
						aria-disabled={disabled}
						aria-haspopup="dialog"
						aria-expanded={isCompactDetailOpen}
						aria-label={`Open details for level ${levelIndex + 1}: ${level.actorA} versus ${level.actorB}`}
					>
						<div className={styles.compactMatchupRow}>
							<span className={styles.levelActorLeft}>
								<span className={styles.levelActorIdentity}>
									<span className={styles.artworkButton}>
										<EntityArtwork
											type="actor"
											label={level.actorA}
											imageUrl={leftImageUrl}
											className={styles.levelActorArtwork}
											imageClassName={styles.levelActorArtworkImage}
											placeholderClassName={styles.levelActorArtworkEmoji}
										/>
									</span>
									<span className={styles.levelActorName}>
										<span className={styles.levelActorNameLine}>{leftActorName.firstLine}</span>
										{leftActorName.secondLine ? <span className={styles.levelActorNameLine}>{leftActorName.secondLine}</span> : null}
									</span>
								</span>
							</span>
							<span className={styles.levelVs}>vs.</span>
							<span className={styles.levelActorRight}>
								<span className={`${styles.levelActorIdentity} ${styles.levelActorIdentityRight}`}>
									<span className={styles.artworkButton}>
										<EntityArtwork
											type="actor"
											label={level.actorB}
											imageUrl={rightImageUrl}
											className={styles.levelActorArtwork}
											imageClassName={styles.levelActorArtworkImage}
											placeholderClassName={styles.levelActorArtworkEmoji}
										/>
									</span>
									<span className={styles.levelActorName}>
										<span className={styles.levelActorNameLine}>{rightActorName.firstLine}</span>
										{rightActorName.secondLine ? <span className={styles.levelActorNameLine}>{rightActorName.secondLine}</span> : null}
									</span>
								</span>
							</span>
						</div>
						<div className={styles.actionRow}>
							<button
								type="button"
								className={`${styles.playNowButton} ${styles.compactPlayNowButton}`}
								disabled={disabled}
								onClick={handleStartButtonClick}
							>
								{playButtonLabel}
							</button>
						</div>
					</div>
				</div>
			) : (
				<>
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
							<span className={styles.levelHops}>Optimal intermediates: {optimalIntermediateCount ?? "--"}</span>
						</div>
						<div className={styles.headerActions}>
							{isCompleted ? (
								<button
									type="button"
									className={`${styles.completionBadge} ${styles.completionBadgeDone} ${styles.completionBadgeButton}`}
									onClick={() => setIsLeaderboardOpen(true)}
									aria-label={`Open leaderboard for level ${levelIndex + 1}`}
								>
									{renderCompletionSummary()}
								</button>
							) : (
								<span className={styles.completionBadge}>
									{renderCompletionSummary()}
								</span>
							)}
						</div>
					</div>

					<div
						className={styles.matchupPanelButton}
						onClick={handleOpenCompactDetails}
						onKeyDown={handleMatchupPanelKeyDown}
						role="button"
						tabIndex={disabled ? -1 : 0}
						aria-disabled={disabled}
						aria-haspopup="dialog"
						aria-expanded={isCompactDetailOpen}
						aria-label={`Open details for level ${levelIndex + 1}: ${level.actorA} versus ${level.actorB}`}
					>
						<div className={styles.matchupPanel}>
							<div className={styles.matchupRow}>
								<span className={styles.levelActorLeft}>
									<span className={styles.levelActorIdentity}>
										<span className={styles.artworkButton}>
											<EntityArtwork
												type="actor"
												label={level.actorA}
												imageUrl={leftImageUrl}
												className={styles.levelActorArtwork}
												imageClassName={styles.levelActorArtworkImage}
												placeholderClassName={styles.levelActorArtworkEmoji}
											/>
										</span>
										<span className={styles.levelActorName}>
											<span className={styles.levelActorNameLine}>{leftActorName.firstLine}</span>
											{leftActorName.secondLine ? <span className={styles.levelActorNameLine}>{leftActorName.secondLine}</span> : null}
										</span>
									</span>
								</span>
								<span className={styles.levelVs}>vs.</span>
								<span className={styles.levelActorRight}>
									<span className={`${styles.levelActorIdentity} ${styles.levelActorIdentityRight}`}>
										<span className={styles.artworkButton}>
											<EntityArtwork
												type="actor"
												label={level.actorB}
												imageUrl={rightImageUrl}
												className={styles.levelActorArtwork}
												imageClassName={styles.levelActorArtworkImage}
												placeholderClassName={styles.levelActorArtworkEmoji}
											/>
										</span>
										<span className={styles.levelActorName}>
											<span className={styles.levelActorNameLine}>{rightActorName.firstLine}</span>
											{rightActorName.secondLine ? <span className={styles.levelActorNameLine}>{rightActorName.secondLine}</span> : null}
										</span>
									</span>
								</span>
							</div>
							<div className={styles.actionRow}>
								<button className={styles.playNowButton} disabled={disabled} onClick={handleStartButtonClick}>
									{playButtonLabel}
								</button>
							</div>
						</div>
					</div>
				</>
			)}

			{isCompactDetailOpen ? (
				<div className={styles.leaderboardOverlay} onClick={() => setIsCompactDetailOpen(false)}>
					<div className={`${styles.leaderboardDialog} ${styles.compactDetailDialog}`} onClick={(event) => event.stopPropagation()}>
						<button
							type="button"
							className={styles.leaderboardCloseButton}
							onClick={() => setIsCompactDetailOpen(false)}
							aria-label="Close level details"
						>
							×
						</button>
						<div className={styles.compactDetailLevelTag}>Level {levelIndex + 1}</div>
						<h3 className={styles.leaderboardDialogTitle}>{level.actorA} vs. {level.actorB}</h3>
						<div className={styles.compactDetailMatchup}>
							<div className={styles.compactDetailActor}>
								<span className={`${styles.artworkButton} ${styles.compactDetailArtworkButton}`}>
									<EntityArtwork
										type="actor"
										label={level.actorA}
										imageUrl={leftImageUrl}
										className={styles.compactDetailArtwork}
										imageClassName={styles.levelActorArtworkImage}
										placeholderClassName={styles.levelActorArtworkEmoji}
									/>
								</span>
								<div className={styles.compactDetailActorName}>{level.actorA}</div>
							</div>
							<div className={styles.compactDetailVs}>vs.</div>
							<div className={styles.compactDetailActor}>
								<span className={`${styles.artworkButton} ${styles.compactDetailArtworkButton}`}>
									<EntityArtwork
										type="actor"
										label={level.actorB}
										imageUrl={rightImageUrl}
										className={styles.compactDetailArtwork}
										imageClassName={styles.levelActorArtworkImage}
										placeholderClassName={styles.levelActorArtworkEmoji}
									/>
								</span>
								<div className={styles.compactDetailActorName}>{level.actorB}</div>
							</div>
						</div>
						<div className={styles.compactDetailSummaryGrid}>
							<button
								type="button"
								className={`${styles.compactDetailSummaryCard} ${styles.compactDetailLeaderboardToggle}${isCompleted ? ` ${styles.compactDetailLeaderboardToggleEnabled}` : ""}`}
								onClick={handleToggleCompactLeaderboard}
								disabled={!isCompleted}
								aria-expanded={isCompactLeaderboardOpen}
								aria-controls={`compact-level-leaderboard-${levelIndex}`}
								aria-label={isCompleted ? `Toggle leaderboard for level ${levelIndex + 1}` : `No leaderboard entries for level ${levelIndex + 1} yet`}
							>
								<span className={`${styles.compactDetailTrophy} ${isCompleted ? styles.compactDetailTrophyFilled : styles.compactDetailTrophyEmpty} ${bestAttemptTone ? styles[`completionBadgeTrophyTone${getToneClassSuffix(bestAttemptTone)}`] : ""}`} aria-hidden="true">🏆</span>
								<span className={`${styles.compactDetailStars} ${bestAttemptTone ? styles[`compactDetailStars--${bestAttemptTone}`] : ""}`} aria-label={`${completionSummaryStars} out of 3 stars`}>
									{buildExecutionStars(completionSummaryStars).map((star, starIndex) => (
										<span
											key={starIndex}
											className={`${styles.compactDetailStar}${star.filled ? ` ${styles.compactDetailStarFilled}` : ` ${styles.compactDetailStarEmpty}`}`}
										>
											★
										</span>
									))}
								</span>
								<div className={styles.compactDetailSummaryLabel}>{compactCompletionLabel}</div>
								<div className={styles.compactDetailSummaryMeta}>{isCompleted ? `${totalAttempts} saved route${totalAttempts === 1 ? "" : "s"}` : "Finish once to unlock leaderboard"}</div>
							</button>
							<div className={styles.compactDetailSummaryCard}>
								<div className={styles.compactDetailSummaryValue}>{optimalIntermediateCount ?? "--"}</div>
								<div className={styles.compactDetailSummaryLabel}>Optimal intermediates</div>
							</div>
						</div>
						{isCompactLeaderboardOpen ? (
							<div id={`compact-level-leaderboard-${levelIndex}`} className={styles.compactDetailLeaderboardPanel}>
								<div className={styles.compactDetailLeaderboardHeader}>Leaderboard</div>
								{displayedLeaderboardAttempts.length === 0 ? (
									<div className={styles.leaderboardEmpty}>No saved routes for this level yet. Finish the level once to start building a personal leaderboard here.</div>
								) : (
									<ol className={styles.leaderboardList}>
										{displayedLeaderboardAttempts.map((attempt, index) => {
											const attemptToneClass = getToneClassSuffix(getStarTone(attempt.hops, level.optimalHops));
											const attemptTier = attempt.tier ?? getAttemptTier(attempt.hops, level.optimalHops);
											const attemptStars = typeof attempt.stars === "number" ? attempt.stars : getLevelScoreStars(attempt.score);

											return (
												<li key={attempt.id} className={styles.leaderboardItem}>
													<div className={styles.leaderboardTopRow}>
														<span className={styles.leaderboardRank}>#{index + 1}</span>
														<span className={styles.leaderboardHops}>{formatIntermediateLabel(getIntermediateCount(attempt.hops))}</span>
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
						) : null}
						<button
							type="button"
							className={styles.playNowButton}
							disabled={disabled}
							onClick={onStart}
						>
							{playButtonLabel}
						</button>
					</div>
				</div>
			) : null}

			{!isCompactPhoneViewport && isLeaderboardOpen ? (
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
							Review your saved attempts for this level. Entries are ordered by fewest intermediates first, then highest score, so your best route stays at the top.
						</p>
						<div className={styles.leaderboardSummaryInline}>
							<span className={styles.leaderboardSummaryPill}>Optimal {formatIntermediateLabel(optimalIntermediateCount)}</span>
							<span className={styles.leaderboardSummaryPill}>{totalAttempts} saved route{totalAttempts === 1 ? "" : "s"}</span>
							{bestAttempt ? (
								<>
									<span className={styles.leaderboardSummaryPill}>Best {formatIntermediateLabel(getIntermediateCount(bestAttempt.hops))}</span>
									<span className={styles.leaderboardSummaryPill}>Best turns {bestAttempt.turns ?? "--"}</span>
									<span className={styles.leaderboardSummaryPill}>Best score {formatExecutionScore(bestAttempt.score)}</span>
								</>
							) : (
								<span className={styles.leaderboardSummaryPill}>No saved runs yet</span>
							)}
						</div>
						{displayedLeaderboardAttempts.length === 0 ? (
							<div className={styles.leaderboardEmpty}>No saved routes for this level yet. Finish the level once to start building a personal leaderboard here.</div>
						) : (
							<ol className={styles.leaderboardList}>
								{displayedLeaderboardAttempts.map((attempt, index) => {
									const attemptToneClass = getToneClassSuffix(getStarTone(attempt.hops, level.optimalHops));
									const attemptTier = attempt.tier ?? getAttemptTier(attempt.hops, level.optimalHops);
									const attemptStars = typeof attempt.stars === "number" ? attempt.stars : getLevelScoreStars(attempt.score);

									return (
										<li key={attempt.id} className={styles.leaderboardItem}>
											<div className={styles.leaderboardTopRow}>
												<span className={styles.leaderboardRank}>#{index + 1}</span>
												<span className={styles.leaderboardHops}>{formatIntermediateLabel(getIntermediateCount(attempt.hops))}</span>
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
