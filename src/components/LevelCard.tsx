import { useMemo, useState } from "react";
import EntityArtwork from "./EntityArtwork";
import type { Level } from "../types";
import { buildHopLeaderboardGroups, type LevelHistoryRecord } from "../utils/levelHistoryStorage";
import styles from "./LevelCard.module.css";

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
	const leaderboardGroups = useMemo(() => buildHopLeaderboardGroups(levelHistory?.attempts ?? []), [levelHistory]);
	const bestAttempt = leaderboardGroups[0]?.attempts[0] ?? null;
	const totalAttempts = levelHistory?.attempts.length ?? 0;

	return (
		<div className={`${styles.card} ${isCompleted ? styles.cardCompleted : ""}`}>
			<div className={styles.headerRow}>
				<div className={styles.levelLabel}>
					<span>Level {levelIndex + 1}</span>
					<span className={styles.starRow}>
						{Array.from({ length: level.stars }).map((_, starIndex) => (
							<span key={starIndex} className={styles.levelStar}>★</span>
						))}
					</span>
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
					leaderboardGroups.length === 0 ? (
						<div className={styles.leaderboardEmpty}>No saved routes for this level yet.</div>
					) : (
						<div className={styles.leaderboardGroups}>
							{leaderboardGroups.map((group) => (
								<div key={group.hops} className={styles.leaderboardGroup}>
									<div className={styles.leaderboardGroupHeader}>
										<span>{group.hops} hops</span>
										<span>{group.attempts.length} route{group.attempts.length === 1 ? "" : "s"}</span>
									</div>
									<ol className={styles.leaderboardList}>
										{group.attempts.map((attempt, index) => (
											<li key={attempt.id} className={styles.leaderboardItem}>
												<div className={styles.leaderboardTopRow}>
													<span className={styles.leaderboardRank}>#{index + 1}</span>
													<span className={styles.leaderboardScore}>{attempt.score.toFixed(1)}%</span>
												</div>
												<div className={styles.leaderboardPath}>{attempt.path.map((node) => node.label).join(" → ")}</div>
											</li>
										))}
									</ol>
								</div>
							))}
						</div>
					)
				) : null}
			</div>
		</div>
	);
}

export default LevelCard;
