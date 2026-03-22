import { useCallback, useEffect, useMemo, useRef, useState, type WheelEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import EntityDetailsDialog, {
  type EntityDetailsDialogData,
  type EntityDetailsHistoryEntry,
  type EntityDetailsRelatedEntity,
} from "../components/EntityDetailsDialog";
import GameplaySettingsSectionLayout from "../components/GameplaySettingsSectionLayout";
import GameLogo from "../components/GameLogo";
import EntityArtwork from "../components/EntityArtwork";
import PageNavigationHeader from "../components/PageNavigationHeader";
import { GameLeftPanel, GameRightPanel } from "../components/game";
import type { GameplaySectionId } from "../components/gameplaySettingsSections";
import {
  fetchActorByName,
  fetchActorMovies,
  fetchActors,
  fetchMovieActors,
  fetchMovies,
  generatePath,
  validatePath,
} from "../api/costars";
import {
  buildSuggestionSet,
  combineMeetingPath,
  getNodeKey,
  isDirectConnectionSuggestion,
  isSameNode,
  MAX_PATH_LENGTH,
  nodeFromSummary,
} from "../gameplay";
import { useDataSourceMode } from "../context/dataSourceMode";
import { useGameSettings } from "../context/gameSettings";
import { useSnapshotData } from "../context/snapshotData";
import { useIsCompactPhoneViewport } from "../hooks/useIsCompactPhoneViewport";
import { getDemoSnapshotBundle } from "../data/demoSnapshot";
import {
  getConfiguredPrimarySource,
  isOfflineDemoMode,
  isOnlineApiMode,
  isOnlineSnapshotMode,
  shouldAutoSwitchToOfflineDemo,
} from "../data/dataSourcePreferences";
import {
  buildNextDetailTrail,
  sortByPopularityDescending,
} from "../data/entityDetails";
import {
  createGameNodeFromSummary,
  findNodeByLabel,
  findShortestPathWithFilter,
  generateLocalPath,
  getActorsForMovie,
  getMoviesForActor,
  validateLocalPath,
} from "../data/localGraph";
import { getActorFilterCountSummary, getMovieFilterCountSummary } from "../data/filterCounts";
import { formatActorInlineMeta, formatActorLifespan, formatGameNodeMeta, formatMovieInlineMeta, getMovieBadges } from "../data/presentation";
import { buildLevelScoreBreakdown, calculateLevelScore, getEffectiveTurnCount } from "../utils/calculateLevelScore.ts";
import {
  isLevelCompleted,
  markLevelCompleted,
  readCompletedLevels,
  subscribeToLevelCompletionUpdates,
  type CompletedLevelsCollection,
} from "../utils/levelCompletionStorage.ts";
import {
  getLevelHistory,
  saveLevelAttempt,
  subscribeToLevelHistoryUpdates,
  type LevelHistoryRecord,
} from "../utils/levelHistoryStorage.ts";
import {
  calculateAverageReleaseYear,
  calculatePathPopularityScore,
  formatAverageReleaseYear,
  getReleaseYear,
} from "../utils/gameCompletionMetrics.ts";
import { resolveWriteInOption } from "../utils/writeInOptions.ts";
import type { Actor, EffectiveDataSource, GameDataFilters, GameNode, Movie, NodeSummary, NodeType, SnapshotIndexes } from "../types";
import "./GamePage.css";

type RulesTabId = "how-to-play" | "gameplay-settings" | "saved-history";

const MOBILE_GAME_DIFFERENCE_NOTES = [
  "On iPhone-sized screens, the game board stays focused on play and hides the in-game info button.",
  "You cannot open the Settings page or in-game gameplay settings while a mobile game is in progress.",
  "Leave the game first if you want to change data mode, helper rules, or other settings.",
];

type RouteGameNode = {
  id?: number;
  label?: string;
  name?: string;
  title?: string;
  type?: NodeType;
  popularity?: number | null;
  releaseDate?: string | null;
	imageUrl?: string | null;
	knownForDepartment?: string | null;
	placeOfBirth?: string | null;
	genres?: string[];
	contentRating?: string | null;
	originalLanguage?: string | null;
	overview?: string | null;
};

type GamePageRouteState = {
  returnTo?: string;
  startA?: RouteGameNode | string;
  startB?: RouteGameNode | string;
  actorA?: string;
  actorB?: string;
  movieA?: string;
  movieB?: string;
  optimalHops?: number | null;
  optimalPath?: NodeSummary[];
  levelIndex?: number;
  totalLevels?: number;
};

type SelectedSide = "top" | "bottom";

const MAX_DEAD_END_PENALTIES = 5;

interface CompletionState {
  fullPath: GameNode[];
  usedHops: number;
  turns: number;
  effectiveTurns: number;
  winningSide: SelectedSide;
  source: string;
  isValidated: boolean | null;
  validationMessage?: string;
  score?: number;
  shuffles: number;
  shuffleModeEnabled: boolean;
  appliedShufflePenaltyCount: number;
  appliedRewindPenaltyCount: number;
  appliedSuggestionAssistPenaltyCount: number;
  deadEnds?: number;
  popularityScore: number;
  averageReleaseYear: number | null;
}

type NodeInspectorState = {
  detail: EntityDetailsDialogData;
  relatedEntities: EntityDetailsRelatedEntity[];
  isLoading: boolean;
  errorMessage: string | null;
};

function createAllowedLoopNodeKeySet(...nodes: Array<GameNode | null>) {
  return new Set(nodes.filter((node): node is GameNode => node !== null).map((node) => getNodeKey(node)));
}

function createBlockedLoopNodeKeySet(allNodes: GameNode[], allowedKeys: ReadonlySet<string>) {
  return new Set(
    allNodes
      .map((node) => getNodeKey(node))
      .filter((nodeKey) => !allowedKeys.has(nodeKey)),
  );
}

function findLoopedNode(nodesToAdd: GameNode[], blockedLoopNodeKeys: ReadonlySet<string>) {
  const seenNodeKeys = new Set(blockedLoopNodeKeys);

  for (const node of nodesToAdd) {
    const nodeKey = getNodeKey(node);

    if (seenNodeKeys.has(nodeKey)) {
      return node;
    }

    seenNodeKeys.add(nodeKey);
  }

  return null;
}

function createNode(label: string, type: NodeType, partial?: Partial<GameNode>): GameNode {
  return {
    label,
    type,
    ...partial,
  };
}

const NETWORK_UNAVAILABLE_MESSAGE = "Network connection couldn't be established. Offline demo mode is being used instead.";
const PLACEHOLDER_START_A = createNode("Network unavailable", "actor");
const PLACEHOLDER_START_B = createNode("Reconnect later", "actor");
const DEMO_BUNDLE = getDemoSnapshotBundle();
const CYCLE_RISK_CACHE_ENABLED = true;

function suppressNetworkUnavailableMessage(errorMessage: string | null) {
  if (!errorMessage) {
    return null;
  }

  return errorMessage.startsWith("Network connection couldn't be established") ? null : errorMessage;
}

function createPlaceholderSuggestions(selectionType: NodeType): GameNode[] {
  const nextType = selectionType === "actor" ? "movie" : "actor";

  return [
    createNode("Connection unavailable", nextType),
    createNode("Snapshot not loaded", nextType),
    createNode("Check backend status", nextType),
    createNode("Run data refresh", nextType),
    createNode("Retry after reconnect", nextType),
    createNode("Gameplay temporarily disabled", nextType),
  ];
}

function normalizeRouteNode(value: RouteGameNode | string | undefined, fallbackType: NodeType, fallbackLabel: string) {
  if (typeof value === "string") {
    return createNode(value, fallbackType);
  }

  if (value) {
    const label = value.label ?? value.name ?? value.title ?? fallbackLabel;
    return createNode(label, value.type ?? fallbackType, {
      id: value.id,
      popularity: value.popularity,
      releaseDate: value.releaseDate,
    imageUrl: value.imageUrl,
    knownForDepartment: value.knownForDepartment,
    placeOfBirth: value.placeOfBirth,
    genres: value.genres,
    contentRating: value.contentRating,
    originalLanguage: value.originalLanguage,
    overview: value.overview,
    });
  }

  return createNode(fallbackLabel, fallbackType);
}

function resolveRouteNode(
  value: RouteGameNode | string | undefined,
  fallbackType: NodeType,
  fallbackLabel: string,
  indexes: SnapshotIndexes,
) {
  const candidate = normalizeRouteNode(value, fallbackType, fallbackLabel);

  if (candidate.type === "actor") {
    if (candidate.id !== undefined) {
      const actor = indexes.actorsById.get(candidate.id);
      if (actor) {
        return createNode(actor.name, "actor", {
          id: actor.id,
          popularity: actor.popularity,
			imageUrl: actor.profileUrl,
			knownForDepartment: actor.knownForDepartment,
			placeOfBirth: actor.placeOfBirth,
        });
      }
    }

    const actorSummary = findNodeByLabel(candidate.label, "actor", indexes);
    return actorSummary ? createGameNodeFromSummary(actorSummary, indexes) : candidate;
  }

  if (candidate.id !== undefined) {
    const movie = indexes.moviesById.get(candidate.id);
    if (movie) {
      return createNode(movie.title, "movie", {
        id: movie.id,
        releaseDate: movie.releaseDate,
		imageUrl: movie.posterUrl,
		genres: movie.genres,
		contentRating: movie.contentRating,
		originalLanguage: movie.originalLanguage,
		overview: movie.overview,
      });
    }
  }

  const movieSummary = findNodeByLabel(candidate.label, "movie", indexes);
  return movieSummary ? createGameNodeFromSummary(movieSummary, indexes) : candidate;
}

function createNodeFromActor(actor: Actor): GameNode {
  return createNode(actor.name, "actor", {
    id: actor.id,
    popularity: actor.popularity,
	imageUrl: actor.profileUrl,
	knownForDepartment: actor.knownForDepartment,
	placeOfBirth: actor.placeOfBirth,
  });
}

function createNodeFromMovie(movie: Movie): GameNode {
  return createNode(movie.title, "movie", {
    id: movie.id,
    releaseDate: movie.releaseDate,
	imageUrl: movie.posterUrl,
	genres: movie.genres,
	contentRating: movie.contentRating,
	originalLanguage: movie.originalLanguage,
	overview: movie.overview,
  });
}

function findActorInCatalog(value: RouteGameNode | string | undefined, actors: Actor[], fallbackLabel: string) {
  const candidate = normalizeRouteNode(value, "actor", fallbackLabel);
  if (candidate.id !== undefined) {
    const actorById = actors.find((actor) => actor.id === candidate.id);
    if (actorById) {
      return actorById;
    }
  }

  return actors.find((actor) => actor.name.toLowerCase() === candidate.label.toLowerCase()) ?? null;
}

function findMovieInCatalog(value: RouteGameNode | string | undefined, movies: Movie[], fallbackLabel: string) {
  const candidate = normalizeRouteNode(value, "movie", fallbackLabel);
  if (candidate.id !== undefined) {
    const movieById = movies.find((movie) => movie.id === candidate.id);
    if (movieById) {
      return movieById;
    }
  }

  return movies.find((movie) => movie.title.toLowerCase() === candidate.label.toLowerCase()) ?? null;
}

async function resolveApiRouteNode(
  value: RouteGameNode | string | undefined,
  fallbackType: NodeType,
  fallbackLabel: string,
  actors: Actor[],
  movies: Movie[],
) {
  if (fallbackType === "actor") {
    const actor = findActorInCatalog(value, actors, fallbackLabel) ?? await fetchActorByName(normalizeRouteNode(value, "actor", fallbackLabel).label);
    return createNodeFromActor(actor);
  }

  const movie = findMovieInCatalog(value, movies, fallbackLabel);
  return movie ? createNodeFromMovie(movie) : normalizeRouteNode(value, "movie", fallbackLabel);
}

function toNodeSummary(node: GameNode): NodeSummary | null {
  if (node.id === undefined) {
    return null;
  }

  return {
    id: node.id,
    type: node.type,
    label: node.label,
  };
}

function toPathEndpoint(node: GameNode) {
  return {
    type: node.type,
    value: node.label,
  };
}

function reverseFullPath(path: GameNode[]) {
  return [...path].reverse();
}

function hydrateCompletionPath(path: GameNode[], referenceNodes: GameNode[]) {
  return path.map((node) => referenceNodes.find((referenceNode) => isSameNode(node, referenceNode)) ?? node);
}



function uniqueText(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

function getDisplayedCompletionScore(
  completion: CompletionState | null,
  optimalHops: number | null,
) {
  if (!completion) {
    return null;
  }

  return calculateLevelScore({
    hops: completion.usedHops,
    optimalHops: optimalHops ?? completion.usedHops,
    turns: completion.turns,
    suggestionAssists: completion.appliedSuggestionAssistPenaltyCount,
    shuffles: completion.appliedShufflePenaltyCount,
    rewinds: completion.appliedRewindPenaltyCount,
    deadEnds: completion.deadEnds ?? 0,
  });
}

function reorderBestPathSuggestions(suggestions: GameNode[]) {
  return suggestions
    .map((suggestion, index) => ({ suggestion, index }))
    .sort((left, right) => {
      const getRiskBucket = (node: GameNode) => {
        const kind = node.highlight?.kind;
        return kind === "loop" || kind === "deep-loop" || kind === "cast-lock" || kind === "blocked" ? 1 : 0;
      };

      const bucketDelta = getRiskBucket(left.suggestion) - getRiskBucket(right.suggestion);
      if (bucketDelta !== 0) {
        return bucketDelta;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.suggestion);
}

function formatPenaltyValue(value: number) {
  return value === 0 ? "0" : `-${value}`;
}

function getWriteInContextLabel(selection: GameNode | null) {
  if (!selection || selection.type === "actor") {
    return {
      placeholder: "Enter a movie title",
      writeInType: "movie" as NodeType,
    };
  }

  return {
    placeholder: "Enter an actor name",
    writeInType: "actor" as NodeType,
  };
}

type DisplayStar = {
  tone: "gold" | "silver" | "bronze";
};

function getCompletionStarTone(hops: number, optimalHops: number | null | undefined): DisplayStar["tone"] {
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

function buildDisplayedStars(hops: number, optimalHops: number | null | undefined) {
  const safeHops = Math.max(0, Math.round(hops));
  const tone = getCompletionStarTone(hops, optimalHops);

  return Array.from({ length: safeHops }, () => ({ tone } satisfies DisplayStar));
}

function countPathNodeTypes(path: GameNode[]) {
  return path.reduce(
    (counts, node) => {
      if (node.type === "movie") {
        counts.movies += 1;
      } else {
        counts.actors += 1;
      }

      return counts;
    },
    { movies: 0, actors: 0 },
  );
}

function formatCompletionPathSummary(path: GameNode[]) {
  const { movies, actors } = countPathNodeTypes(path);
  const movieLabel = movies === 1 ? "movie" : "movies";
  const actorLabel = actors === 1 ? "actor" : "actors";

  return `${movies} ${movieLabel} • ${actors} ${actorLabel}`;
}

function toInspectorDetail(node: GameNode, relatedCount: number, detailLines: string[], description: string | null): EntityDetailsDialogData {
  const cards = node.type === "actor"
    ? [
        { label: "Catalog id", value: node.id !== undefined ? String(node.id) : "Unknown" },
        { label: "Popularity", value: node.popularity !== null && node.popularity !== undefined ? node.popularity.toFixed(1) : "--" },
        { label: "Department", value: node.knownForDepartment ?? "Unknown" },
        { label: "Born in", value: node.placeOfBirth ?? "Unknown" },
        { label: "Lifespan", value: detailLines[0] ?? "Unknown" },
        { label: "Connected entries", value: String(relatedCount) },
      ]
    : [
        { label: "Catalog id", value: node.id !== undefined ? String(node.id) : "Unknown" },
        { label: "Release date", value: node.releaseDate ?? "Unknown" },
        { label: "Rating", value: node.contentRating ?? "Unknown" },
        { label: "Language", value: node.originalLanguage?.toUpperCase() ?? "Unknown" },
        { label: "Genres", value: node.genres && node.genres.length > 0 ? node.genres.join(", ") : "Unknown" },
        { label: "Connected entries", value: String(relatedCount) },
      ];

  return {
    key: `${node.type}-${node.id ?? node.label}`,
    type: node.type,
    title: node.label,
    imageUrl: node.imageUrl ?? null,
    lead: node.type === "actor" ? formatActorInlineMeta({
      popularity: node.popularity ?? null,
      placeOfBirth: node.placeOfBirth ?? null,
      knownForDepartment: node.knownForDepartment ?? null,
    }) : formatMovieInlineMeta({
      releaseDate: node.releaseDate ?? null,
      genres: node.genres ?? [],
      originalLanguage: node.originalLanguage ?? null,
      contentRating: node.contentRating ?? null,
    }),
    subtle: node.type === "actor" ? node.placeOfBirth ?? null : null,
    badges: node.type === "movie"
      ? getMovieBadges({
          genres: node.genres ?? [],
          originalLanguage: node.originalLanguage ?? null,
          contentRating: node.contentRating ?? null,
        })
      : node.knownForDepartment
      ? [node.knownForDepartment]
      : [],
    cards,
    narrativeTitle: node.type === "actor" ? "Biography" : "Overview",
    narrative: description,
    relationLabel: node.type === "actor" ? "Movies" : "Cast",
    relationSearchPlaceholder: node.type === "actor" ? "Search movies" : "Search cast",
  }
}

function createNodeInspectorState(
  node: GameNode,
  relatedEntities: EntityDetailsRelatedEntity[],
  detailLines: string[],
  description: string | null,
  isLoading = false,
  errorMessage: string | null = null,
): NodeInspectorState {
  return {
    detail: toInspectorDetail(node, relatedEntities.length, detailLines, description),
    relatedEntities,
    isLoading,
    errorMessage,
  };
}

function buildFallbackInspectorState(node: GameNode) {
  return createNodeInspectorState(
    node,
    [],
    uniqueText([
      formatGameNodeMeta(node),
      node.type === "actor" ? node.placeOfBirth : node.genres?.slice(0, 3).join(" • "),
    ]),
    node.overview ?? null,
    true,
  );
}

function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = (location.state as GamePageRouteState | null) ?? null;
  const {
    snapshot,
    indexes,
    isLoading: isSnapshotLoading,
    errorMessage: snapshotError,
  } = useSnapshotData();
  const { mode, setConnectionMode, setOfflineSource } = useDataSourceMode();
  const { settings, setDifficulty, setCustomSetting, setActorPopularityCutoff, setReleaseYearCutoff, setSubsetCount, setSuggestionOrderMode, setSuggestionSortMode } = useGameSettings();
  const helperSettings = settings.customSettings;
  const suggestionDisplay = settings.suggestionDisplay;
  const dataFilters = settings.dataFilters;
  const shouldGuaranteeBestPathSuggestion = helperSettings["guarantee-best-path-suggestion"];
  const showVisitedSuggestions = helperSettings["show-visited-suggestions"];
  const shuffleAddsPenalty = helperSettings["shuffle-adds-penalty"];
  const rewindAddsPenalty = helperSettings["rewind-adds-penalty"];
  const cycleRiskClickAddsPenalty = helperSettings["cycle-risk-click-adds-penalty"];
  const showCastLockRiskHighlight = helperSettings["show-cast-lock-risk"];
  const writeInAutoSuggestEnabled = helperSettings["write-in-autosuggest"];

  const [actorA, setActorA] = useState<GameNode | null>(null);
  const [actorB, setActorB] = useState<GameNode | null>(null);
	const [actorsCatalog, setActorsCatalog] = useState<Actor[]>([]);
  const [moviesCatalog, setMoviesCatalog] = useState<Movie[]>([]);

  const [selectedSide, setSelectedSide] = useState<SelectedSide>("top");
  const [topPath, setTopPath] = useState<GameNode[]>([]);
  const [bottomPath, setBottomPath] = useState<GameNode[]>([]);
  const [lockedSide, setLockedSide] = useState<SelectedSide | null>(null);

  const [turns, setTurns] = useState(0);
  const [rewinds, setRewinds] = useState(0);
  const [deadEndPenalties, setDeadEndPenalties] = useState(0);
  const [shuffles, setShuffles] = useState(0);
  const startWithSuggestionPanelVisible = helperSettings["start-with-suggestion-panel"];
  const isCompactPhoneViewport = useIsCompactPhoneViewport();
  const defaultSuggestionPanelVisible = startWithSuggestionPanelVisible && !isCompactPhoneViewport;

  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [activeRulesGameplaySection, setActiveRulesGameplaySection] = useState<GameplaySectionId>("presets");
  const [activeRulesTab, setActiveRulesTab] = useState<RulesTabId>("how-to-play");
  const [isPanelOrderSwapped, setIsPanelOrderSwapped] = useState(false);
  const [isSuggestionPanelVisible, setIsSuggestionPanelVisible] = useState(defaultSuggestionPanelVisible);
  const [filterValidationMessage, setFilterValidationMessage] = useState<string | null>(null);

  const [optimalHops, setOptimalHops] = useState<number | null>(routeState?.optimalHops ?? null);


  const [suggestions, setSuggestions] = useState<GameNode[]>([]);
  const [isSetupLoading, setIsSetupLoading] = useState(true);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionState | null>(null);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [isCompletionInfoDialogOpen, setIsCompletionInfoDialogOpen] = useState(false);
  const [isSavedHistoryDialogOpen, setIsSavedHistoryDialogOpen] = useState(false);
  const [completedLevels, setCompletedLevels] = useState<CompletedLevelsCollection>(() => readCompletedLevels());
  const [currentLevelIdentity, setCurrentLevelIdentity] = useState<{ startLabel: string; endLabel: string } | null>(null);
  const [levelHistory, setLevelHistory] = useState<LevelHistoryRecord | null>(null);
  const [resolvedDataSource, setResolvedDataSource] = useState<EffectiveDataSource | null>(null);
  const [isNetworkUnavailable, setIsNetworkUnavailable] = useState(false);
  const [inspectorTrail, setInspectorTrail] = useState<GameNode[]>([]);
  const [nodeInspector, setNodeInspector] = useState<NodeInspectorState | null>(null);
  const [inspectorRelationSearch, setInspectorRelationSearch] = useState("");
  const [leftPanelWriteInSide, setLeftPanelWriteInSide] = useState<SelectedSide | null>(null);
  const [leftPanelWriteInValue, setLeftPanelWriteInValue] = useState("");
  const [isSubmittingLeftPanelWriteIn, setIsSubmittingLeftPanelWriteIn] = useState(false);
  const [rightWriteInSuggestionPool, setRightWriteInSuggestionPool] = useState<GameNode[]>([]);
  const [leftWriteInSuggestionPool, setLeftWriteInSuggestionPool] = useState<GameNode[]>([]);
  const rulesDialogRef = useRef<HTMLDivElement | null>(null);
  const cycleRiskChildCacheRef = useRef<Map<string, GameNode[]>>(new Map());
  const levelIdentityRef = useRef<{ startLabel: string; endLabel: string } | null>(null);
  const actorsCatalogById = useMemo(
    () => new Map(actorsCatalog.map((actor) => [actor.id, actor])),
    [actorsCatalog],
  );
  const moviesCatalogById = useMemo(
    () => new Map(moviesCatalog.map((movie) => [movie.id, movie])),
    [moviesCatalog],
  );

  const preferredDataSource = getConfiguredPrimarySource(mode);
  const activeDataSource = resolvedDataSource ?? preferredDataSource;
  const activeDataSourceLabel = activeDataSource === "api"
    ? "Online API"
    : activeDataSource === "snapshot"
      ? "Online snapshot"
      : "Offline demo";
  const activeFilterIndexes = activeDataSource === "demo"
    ? DEMO_BUNDLE.indexes
    : activeDataSource === "snapshot"
      ? indexes
      : null;
  const actorCountSummary = useMemo(() => {
    if (activeDataSource === "api") {
      return getActorFilterCountSummary(actorsCatalog, dataFilters.actorPopularityCutoff);
    }

    if (!activeFilterIndexes) {
      return null;
    }

    return getActorFilterCountSummary(activeFilterIndexes.actorsById.values(), dataFilters.actorPopularityCutoff);
  }, [activeDataSource, activeFilterIndexes, actorsCatalog, dataFilters.actorPopularityCutoff]);
  const movieCountSummary = useMemo(() => {
    if (activeDataSource === "api") {
      return getMovieFilterCountSummary(moviesCatalog, dataFilters.releaseYearCutoff);
    }

    if (!activeFilterIndexes) {
      return null;
    }

    return getMovieFilterCountSummary(activeFilterIndexes.moviesById.values(), dataFilters.releaseYearCutoff);
  }, [activeDataSource, activeFilterIndexes, dataFilters.releaseYearCutoff, moviesCatalog]);
  const levelHistoryAttempts = levelHistory?.attempts ?? [];
  const latestAttempt = levelHistory?.attempts[0] ?? null;
  const isShuffleModeEnabled = suggestionDisplay.orderMode === "shuffled";
  const displayedCompletionScore = useMemo(
    () => getDisplayedCompletionScore(completion, optimalHops),
    [completion, optimalHops],
  );
  const completionStarTone = useMemo(
    () => (completion ? getCompletionStarTone(completion.usedHops, optimalHops) : "bronze"),
    [completion, optimalHops],
  );
  const completionPathSummary = useMemo(
    () => (completion ? formatCompletionPathSummary(completion.fullPath) : null),
    [completion],
  );
  const completionScoreBreakdown = useMemo(() => {
    if (!completion) {
      return null;
    }

    return buildLevelScoreBreakdown({
      hops: completion.usedHops,
      optimalHops: optimalHops ?? completion.usedHops,
      turns: completion.turns,
      suggestionAssists: completion.appliedSuggestionAssistPenaltyCount,
      shuffles: completion.appliedShufflePenaltyCount,
      rewinds: completion.appliedRewindPenaltyCount,
      deadEnds: completion.deadEnds ?? 0,
    });
  }, [completion, optimalHops]);
  const isDeadEndGameOver = deadEndPenalties >= MAX_DEAD_END_PENALTIES;
  const currentLevelCompleted = useMemo(() => {
    if (!currentLevelIdentity) {
      return false;
    }

    return isLevelCompleted(currentLevelIdentity.startLabel, currentLevelIdentity.endLabel, completedLevels);
  }, [completedLevels, currentLevelIdentity]);
  const levelHistoryContent = levelHistoryAttempts.length === 0 ? (
    <div className="gameCompletionHistoryEmpty">This level does not have any saved history yet.</div>
  ) : (
    <ol className="gameCompletionLeaderboardList gameCompletionLeaderboardList--flat">
      {levelHistoryAttempts.map((attempt, attemptIndex) => (
        <li key={attempt.id} className="gameCompletionLeaderboardItem">
          <div className="gameCompletionLeaderboardTopRow">
            <span className="gameCompletionLeaderboardRank">#{attemptIndex + 1}</span>
            <span className="gameCompletionLeaderboardHops">{attempt.hops} hops</span>
            <span className="gameCompletionLeaderboardTurns">{typeof attempt.turns === "number" ? `${attempt.turns} turns` : "-- turns"}</span>
            <span className="gameCompletionLeaderboardStars">
              {buildDisplayedStars(attempt.hops, optimalHops).map((star, starIndex) => (
                <span
                  key={starIndex}
                  className={`gameCompletionLeaderboardStar gameCompletionLeaderboardStar--${star.tone}`}
                >
                  ★
                </span>
              ))}
            </span>
            <span className="gameCompletionLeaderboardScore">{attempt.score.toFixed(1)}%</span>
          </div>
          <div className="gameCompletionLeaderboardMetrics">
            <span className="gameCompletionLeaderboardMetric">Effective turns {typeof attempt.effectiveTurns === "number" ? attempt.effectiveTurns : "--"}</span>
            <span className="gameCompletionLeaderboardMetric">{attempt.shuffleModeEnabled === false ? "shuffles N/A" : `shuffles ${attempt.shuffles}`}</span>
            <span className="gameCompletionLeaderboardMetric">rewinds {attempt.rewinds}</span>
            <span className="gameCompletionLeaderboardMetric">dead ends {attempt.deadEnds}</span>
            <span className="gameCompletionLeaderboardMetric">popularity avg {typeof attempt.popularityScore === "number" ? attempt.popularityScore : "--"}</span>
            <span className="gameCompletionLeaderboardMetric">avg year {formatAverageReleaseYear(attempt.averageReleaseYear)}</span>
          </div>
          <div className="gameCompletionLeaderboardPath">
            {attempt.path.map((node) => node.label).join(" → ")}
          </div>
          <div className="gameCompletionLeaderboardTimestamp">{formatTimestamp(attempt.timestamp)}</div>
        </li>
      ))}
    </ol>
  );

  const resolveSnapshotResources = useCallback(
    async (allowDemoFallback = false) => {
		if (allowDemoFallback) {
			return {
				snapshot: DEMO_BUNDLE.snapshot,
				indexes: DEMO_BUNDLE.indexes,
				source: "demo" as const,
			};
		}

        if (snapshot && indexes) {
        return {
          snapshot,
          indexes,
			source: "snapshot" as const,
        };
      }

        return null;
    },
    [indexes, snapshot],
  );

  const validateDataFiltersForCurrentBoard = useCallback(async (nextFilters: GameDataFilters) => {
    const topAnchor = topPath[topPath.length - 1] ?? actorA;
    const bottomAnchor = bottomPath[bottomPath.length - 1] ?? actorB;

    if (!topAnchor || !bottomAnchor) {
      return { allowed: true as const, message: null };
    }

    const startSummary = toNodeSummary(topAnchor);
    const targetSummary = toNodeSummary(bottomAnchor);
    if (!startSummary || !targetSummary) {
      return { allowed: true as const, message: null };
    }

    const resources = (await resolveSnapshotResources(activeDataSource === "demo")) ?? (await resolveSnapshotResources(true));
    if (!resources) {
      return { allowed: true as const, message: null };
    }

    const startKey = `${startSummary.type}:${startSummary.id}`;
    const targetKey = `${targetSummary.type}:${targetSummary.id}`;
    const blockedNodeKeys = new Set(
      [actorA, ...topPath, actorB, ...bottomPath]
        .filter((node): node is GameNode => Boolean(node && typeof node.id === "number"))
        .map((node) => `${node.type}:${node.id as number}`)
        .filter((nodeKey) => nodeKey !== startKey && nodeKey !== targetKey),
    );

    const path = findShortestPathWithFilter(startSummary, targetSummary, resources.indexes, (node) => {
      const nodeKey = `${node.type}:${node.id}`;
      if (nodeKey === startKey || nodeKey === targetKey) {
        return true;
      }

      if (blockedNodeKeys.has(nodeKey)) {
        return false;
      }

      if (node.type === "actor") {
        if (nextFilters.actorPopularityCutoff === null) {
          return true;
        }

        const actor = resources.indexes.actorsById.get(node.id);
        return (actor?.popularity ?? Number.NEGATIVE_INFINITY) >= nextFilters.actorPopularityCutoff;
      }

      if (nextFilters.releaseYearCutoff === null) {
        return true;
      }

      const movie = resources.indexes.moviesById.get(node.id);
      const releaseYear = getReleaseYear(movie?.releaseDate ?? null);
      return releaseYear !== null && releaseYear >= nextFilters.releaseYearCutoff;
    });

    if (path) {
      return { allowed: true as const, message: null };
    }

    return {
      allowed: false as const,
      message: "That filter would remove every remaining valid path for the current board. Loosen the actor cutoff or release-year cutoff and try again.",
    };
  }, [activeDataSource, actorA, actorB, bottomPath, resolveSnapshotResources, topPath]);

  const applyValidatedDataFilterChange = useCallback(async (
    nextFilters: GameDataFilters,
    applyChange: () => void,
  ) => {
    const validation = await validateDataFiltersForCurrentBoard(nextFilters);
    if (!validation.allowed) {
      setFilterValidationMessage(validation.message);
      return;
    }

    setFilterValidationMessage(null);
    applyChange();
  }, [validateDataFiltersForCurrentBoard]);

  const handleActorPopularityCutoffChange = useCallback((cutoff: number | null) => {
    void applyValidatedDataFilterChange(
      {
        ...dataFilters,
        actorPopularityCutoff: cutoff,
      },
      () => setActorPopularityCutoff(cutoff),
    );
  }, [applyValidatedDataFilterChange, dataFilters, setActorPopularityCutoff]);

  const handleReleaseYearCutoffChange = useCallback((year: number | null) => {
    void applyValidatedDataFilterChange(
      {
        ...dataFilters,
        releaseYearCutoff: year,
      },
      () => setReleaseYearCutoff(year),
    );
  }, [applyValidatedDataFilterChange, dataFilters, setReleaseYearCutoff]);

  useEffect(() => {
    setCompletedLevels(readCompletedLevels());
    return subscribeToLevelCompletionUpdates(() => {
      setCompletedLevels(readCompletedLevels());
    });
  }, []);

  useEffect(() => {
    const syncLevelHistory = () => {
      const levelIdentity = levelIdentityRef.current;
      if (!levelIdentity) {
        return;
      }

      setLevelHistory(getLevelHistory(levelIdentity.startLabel, levelIdentity.endLabel));
    };

    syncLevelHistory();
    return subscribeToLevelHistoryUpdates(syncLevelHistory);
  }, []);

  useEffect(() => {
    if (completion) {
      setLeftPanelWriteInSide(null);
      setLeftPanelWriteInValue("");
      setIsCompletionInfoDialogOpen(false);
    }
  }, [completion]);

  useEffect(() => {
    let isMounted = true;

    const buildLocalSetup = async (localSource: "snapshot" | "demo") => {
		const resources = await resolveSnapshotResources(localSource === "demo");
      if (!resources) {
        return null;
      }

      const resolvedActorA = resolveRouteNode(
        routeState?.startA ?? routeState?.movieA ?? routeState?.actorA,
        routeState?.movieA ? "movie" : "actor",
        "George Clooney",
        resources.indexes,
      );
      const resolvedActorB = resolveRouteNode(
        routeState?.startB ?? routeState?.movieB ?? routeState?.actorB,
        routeState?.movieB ? "movie" : "actor",
        "Tobey Maguire",
        resources.indexes,
      );

      let resolvedOptimalHops = routeState?.optimalHops ?? null;
      let resolvedOptimalPath = routeState?.optimalPath?.map(nodeFromSummary) ?? [];

      if (resolvedOptimalPath.length === 0 || resolvedOptimalHops === null) {
        const startSummary = toNodeSummary(resolvedActorA);
        const targetSummary = toNodeSummary(resolvedActorB);

        if (startSummary && targetSummary) {
          const generatedPath = generateLocalPath(startSummary, targetSummary, resources.indexes);
          resolvedOptimalHops = generatedPath.reason ? null : generatedPath.steps;
          resolvedOptimalPath = generatedPath.reason ? [] : generatedPath.nodes.map(nodeFromSummary);
        }
      }

      return {
        actorA: resolvedActorA,
        actorB: resolvedActorB,
        optimalHops: resolvedOptimalHops,
        optimalPath: resolvedOptimalPath,
		source: resources.source,
      };
    };

    const buildApiSetup = async () => {
      const [actors, movies] = await Promise.all([fetchActors(), fetchMovies()]);
      const resolvedActorA = await resolveApiRouteNode(
        routeState?.startA ?? routeState?.movieA ?? routeState?.actorA,
        routeState?.movieA ? "movie" : "actor",
        "George Clooney",
        actors,
        movies,
      );
      const resolvedActorB = await resolveApiRouteNode(
        routeState?.startB ?? routeState?.movieB ?? routeState?.actorB,
        routeState?.movieB ? "movie" : "actor",
        "Tobey Maguire",
        actors,
        movies,
      );

      let resolvedOptimalHops = routeState?.optimalHops ?? null;
      let resolvedOptimalPath = routeState?.optimalPath?.map(nodeFromSummary) ?? [];

      if (resolvedOptimalPath.length === 0 || resolvedOptimalHops === null) {
        const generatedPath = await generatePath(toPathEndpoint(resolvedActorA), toPathEndpoint(resolvedActorB));
        resolvedOptimalHops = generatedPath.reason ? null : generatedPath.steps;
        resolvedOptimalPath = generatedPath.reason ? [] : generatedPath.nodes.map(nodeFromSummary);
      }

      return {
        actorA: resolvedActorA,
        actorB: resolvedActorB,
		actors,
        optimalHops: resolvedOptimalHops,
        optimalPath: resolvedOptimalPath,
        movies,
      };
    };

    const applyPlaceholderState = () => {
      setActorA(PLACEHOLDER_START_A);
      setActorB(PLACEHOLDER_START_B);
      setMoviesCatalog([]);
      setOptimalHops(null);
      // setOptimalPath removed
      setSuggestions(createPlaceholderSuggestions("actor"));
      setResolvedDataSource(null);
      setIsNetworkUnavailable(true);
      setSetupError(NETWORK_UNAVAILABLE_MESSAGE);
    };

  const applyDemoSetup = async (shouldPersistDemoMode: boolean) => {
    const demoSetup = await buildLocalSetup("demo");
    if (!demoSetup || !isMounted) {
      applyPlaceholderState();
      return;
    }

    levelIdentityRef.current = {
      startLabel: demoSetup.actorA.label,
      endLabel: demoSetup.actorB.label,
    };
    setCurrentLevelIdentity({
      startLabel: demoSetup.actorA.label,
      endLabel: demoSetup.actorB.label,
    });
    setLevelHistory(getLevelHistory(demoSetup.actorA.label, demoSetup.actorB.label));

    setActorA(demoSetup.actorA);
    setActorB(demoSetup.actorB);
  	setActorsCatalog([]);
    setMoviesCatalog([]);
    setOptimalHops(demoSetup.optimalHops);
    // setOptimalPath removed
    setResolvedDataSource("demo");
    setSetupError(null);
    setIsNetworkUnavailable(false);

    if (shouldPersistDemoMode && shouldAutoSwitchToOfflineDemo(mode)) {
      setConnectionMode("offline");
      setOfflineSource("demo");
    }
  };

    const loadGameSetup = async () => {
      setIsSetupLoading(true);
      setSetupError(null);
      setSuggestionError(null);
      setCompletion(null);
      setIsCompletionDialogOpen(false);
      setSuggestions([]);
      setTopPath([]);
      setBottomPath([]);
      setSelectedSide("top");
      setLockedSide(null);
      setTurns(0);
      setRewinds(0);
      setDeadEndPenalties(0);
      setShuffles(0);
      setShuffleSeed(0);
      setIsNetworkUnavailable(false);

      try {
      if (isOnlineSnapshotMode(mode) && !snapshot && isSnapshotLoading) {
        return;
      }

      if (isOfflineDemoMode(mode)) {
        await applyDemoSetup(false);
        return;
      }

        if (isOnlineApiMode(mode)) {
          try {
            const apiSetup = await buildApiSetup();

            if (!isMounted) {
              return;
            }

            levelIdentityRef.current = {
              startLabel: apiSetup.actorA.label,
              endLabel: apiSetup.actorB.label,
            };
            setCurrentLevelIdentity({
              startLabel: apiSetup.actorA.label,
              endLabel: apiSetup.actorB.label,
            });
            setLevelHistory(getLevelHistory(apiSetup.actorA.label, apiSetup.actorB.label));

            setActorA(apiSetup.actorA);
            setActorB(apiSetup.actorB);
      			setActorsCatalog(apiSetup.actors);
            setMoviesCatalog(apiSetup.movies);
            setOptimalHops(apiSetup.optimalHops);
            // setOptimalPath removed
            setResolvedDataSource("api");
            return;
          } catch {
            const snapshotSetup = await buildLocalSetup("snapshot");
            if (!isMounted) {
              return;
            }

            if (snapshotSetup) {
              levelIdentityRef.current = {
                startLabel: snapshotSetup.actorA.label,
                endLabel: snapshotSetup.actorB.label,
              };
              setCurrentLevelIdentity({
                startLabel: snapshotSetup.actorA.label,
                endLabel: snapshotSetup.actorB.label,
              });
              setLevelHistory(getLevelHistory(snapshotSetup.actorA.label, snapshotSetup.actorB.label));
              setActorA(snapshotSetup.actorA);
              setActorB(snapshotSetup.actorB);
				setActorsCatalog([]);
              setMoviesCatalog([]);
              setOptimalHops(snapshotSetup.optimalHops);
              // setOptimalPath removed
              setResolvedDataSource("snapshot");
              return;
            }

				await applyDemoSetup(false);
				return;
          }
        }

        const snapshotSetup = await buildLocalSetup("snapshot");
        if (snapshotSetup) {
          if (!isMounted) {
            return;
          }

          levelIdentityRef.current = {
            startLabel: snapshotSetup.actorA.label,
            endLabel: snapshotSetup.actorB.label,
          };
          setCurrentLevelIdentity({
            startLabel: snapshotSetup.actorA.label,
            endLabel: snapshotSetup.actorB.label,
          });
          setLevelHistory(getLevelHistory(snapshotSetup.actorA.label, snapshotSetup.actorB.label));

          setActorA(snapshotSetup.actorA);
          setActorB(snapshotSetup.actorB);
		  setActorsCatalog([]);
          setMoviesCatalog([]);
          setOptimalHops(snapshotSetup.optimalHops);
          // setOptimalPath removed
          setResolvedDataSource("snapshot");
          return;
        }

        await applyDemoSetup(isOnlineSnapshotMode(mode));
      } catch {
        if (isMounted) {
			await applyDemoSetup(isOnlineSnapshotMode(mode));
        }
      } finally {
        if (isMounted) {
          setIsSetupLoading(false);
        }
      }
    };

    void loadGameSetup();

    return () => {
      isMounted = false;
    };
  }, [isSnapshotLoading, mode, resolveSnapshotResources, routeState?.actorA, routeState?.actorB, routeState?.movieA, routeState?.movieB, routeState?.optimalHops, routeState?.optimalPath, routeState?.startA, routeState?.startB, setConnectionMode, setOfflineSource, snapshot]);

  const totalSelections = topPath.length + bottomPath.length;
  const hasPlacedSelections = totalSelections > 0;
  const isRiskAnalysisEnabled = helperSettings["show-hint-color"] && hasPlacedSelections && showCastLockRiskHighlight;
  const isPathLimitReached = totalSelections >= MAX_PATH_LENGTH;
  const currentHops = totalSelections;
  const displayedSetupError = suppressNetworkUnavailableMessage(setupError ?? (activeDataSource === "snapshot" ? snapshotError : null));
  const displayedSuggestionError = suppressNetworkUnavailableMessage(suggestionError);

  const currentSelection = useMemo(() => {
    if (!actorA || !actorB) {
      return null;
    }

    if (selectedSide === "top") {
      return topPath.length > 0 ? topPath[topPath.length - 1] : actorA;
    }

    return bottomPath.length > 0 ? bottomPath[bottomPath.length - 1] : actorB;
  }, [actorA, actorB, bottomPath, selectedSide, topPath]);
  const topSelection = useMemo(() => {
    if (!actorA) {
      return null;
    }

    return topPath.length > 0 ? topPath[topPath.length - 1] : actorA;
  }, [actorA, topPath]);
  const bottomSelection = useMemo(() => {
    if (!actorB) {
      return null;
    }

    return bottomPath.length > 0 ? bottomPath[bottomPath.length - 1] : actorB;
  }, [actorB, bottomPath]);
  const canGoBackOnCurrentSide = selectedSide === "top" ? topPath.length > 0 : bottomPath.length > 0;

  const targetNode = useMemo(() => {
    if (!actorA || !actorB) {
      return null;
    }

    return selectedSide === "top" ? actorB : actorA;
  }, [actorA, actorB, selectedSide]);

  const shouldRandomizeSuggestions = isShuffleModeEnabled;
  const leftPanelWriteInSelection = leftPanelWriteInSide === "top"
    ? topSelection
    : leftPanelWriteInSide === "bottom"
      ? bottomSelection
      : null;
  const leftPanelWriteInContext = getWriteInContextLabel(leftPanelWriteInSelection);

  const suggestionBuildOptions = useMemo(() => ({
    shouldShuffle: false,
    shouldGuaranteeBestPath: shouldGuaranteeBestPathSuggestion,
    suggestionLimit: shouldRandomizeSuggestions ? suggestionDisplay.subsetCount : null,
    sortMode: suggestionDisplay.sortMode,
    movieSortMode: dataFilters.movieSortMode,
    actorSortMode: dataFilters.actorSortMode,
  }), [dataFilters.actorSortMode, dataFilters.movieSortMode, shouldGuaranteeBestPathSuggestion, shouldRandomizeSuggestions, suggestionDisplay.sortMode, suggestionDisplay.subsetCount]);

  const finalizeSuggestionOrder = useCallback((nextSuggestions: GameNode[]) => {
    if (suggestionDisplay.sortMode !== "best-path") {
      return nextSuggestions;
    }

    return reorderBestPathSuggestions(nextSuggestions);
  }, [suggestionDisplay.sortMode]);

  const boardNodes = useMemo(() => {
    if (!actorA || !actorB) {
      return [] as GameNode[];
    }

    return [actorA, actorB, ...topPath, ...bottomPath];
  }, [actorA, actorB, bottomPath, topPath]);

  const oppositeFrontierNode = useMemo(() => {
    if (!actorA || !actorB) {
      return null;
    }

    if (selectedSide === "top") {
      return bottomPath.length > 0 ? bottomPath[bottomPath.length - 1] : actorB;
    }

    return topPath.length > 0 ? topPath[topPath.length - 1] : actorA;
  }, [actorA, actorB, bottomPath, selectedSide, topPath]);

  const blockedLoopNodeKeys = useMemo(() => {
    if (!actorA || !actorB) {
      return new Set<string>();
    }

    const allowedKeys = createAllowedLoopNodeKeySet(targetNode, oppositeFrontierNode);
    return createBlockedLoopNodeKeySet(boardNodes, allowedKeys);
  }, [actorA, actorB, boardNodes, oppositeFrontierNode, targetNode]);

  const visitedMovieNodeKeys = useMemo(() => {
    if (boardNodes.length === 0) {
      return new Set<string>();
    }

    return new Set(
      boardNodes
        .filter((node) => node.type === "movie")
        .map((node) => getNodeKey(node)),
    );
  }, [boardNodes]);

  const isInteractionDisabled = isPathLimitReached || isDeadEndGameOver || isSetupLoading || isNetworkUnavailable || ((activeDataSource === "snapshot" || activeDataSource === "demo") && isSnapshotLoading && !isOfflineDemoMode(mode)) || !!completion;
  const isGameComplete = !!completion;

  const applyDeadEndPenalty = useCallback((message: string) => {
    setDeadEndPenalties((currentPenalties) => {
      const nextPenalties = Math.min(MAX_DEAD_END_PENALTIES, currentPenalties + 1);

      if (nextPenalties >= MAX_DEAD_END_PENALTIES) {
        setSuggestionError(`Game over: ${message} You reached ${MAX_DEAD_END_PENALTIES} dead-end penalties. Retry the level to start over.`);
      } else {
        setSuggestionError(message);
      }

      return nextPenalties;
    });
  }, []);

  const visibleSuggestions = useMemo(() => {
    return showVisitedSuggestions
      ? [...suggestions]
      : suggestions.filter((suggestion) => suggestion.highlight?.kind !== "blocked");
  }, [showVisitedSuggestions, suggestions]);

  const hiddenPanelMessage = useMemo(() => {
    if (isSuggestionPanelVisible || !displayedSuggestionError) {
      return null;
    }

    if (
      displayedSuggestionError.startsWith("Cycle")
      || displayedSuggestionError.startsWith("Game over:")
      || displayedSuggestionError.toLowerCase().includes("dead-end")
    ) {
      return displayedSuggestionError;
    }

    return null;
  }, [displayedSuggestionError, isSuggestionPanelVisible]);

  const applyActorPopularityFilter = useCallback((nextSuggestions: GameNode[]) => {
    return nextSuggestions.filter((suggestion) => {
      // Apply actor popularity cutoff
      if (suggestion.type === "actor" && dataFilters.actorPopularityCutoff !== null) {
        if ((suggestion.popularity ?? Number.NEGATIVE_INFINITY) < dataFilters.actorPopularityCutoff) {
          return false;
        }
      }

      // Apply movie release year cutoff
        if (suggestion.type === "movie" && dataFilters.releaseYearCutoff !== null) {
        const releaseYear = suggestion.releaseDate ? new Date(suggestion.releaseDate).getFullYear() : 0;
        if (releaseYear < dataFilters.releaseYearCutoff) {
          return false;
        }
      }

      return true;
    });
  }, [dataFilters]);

  const getCycleRiskChildrenForSuggestion = useCallback(async (
    suggestion: GameNode,
    source: EffectiveDataSource,
    localResources: Awaited<ReturnType<typeof resolveSnapshotResources>>,
    targetSummary: NodeSummary,
  ) => {
    if (suggestion.id === undefined || !targetNode || !actorA || !actorB) {
      return [] as GameNode[];
    }

    const useCache = CYCLE_RISK_CACHE_ENABLED;
    const cacheKey = `${source}:${targetNode.type}:${targetNode.id ?? "none"}:${suggestion.type}:${suggestion.id}`;
    if (useCache) {
      const cached = cycleRiskChildCacheRef.current.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let childNodes: GameNode[] = [];

    if ((source === "snapshot" || source === "demo") && localResources) {
      if (suggestion.type === "actor") {
        childNodes = getMoviesForActor(suggestion.id, targetSummary, localResources.indexes);
      } else {
        // For cycle risk analysis, we need ALL actors (including visited ones) to determine if all next options are blocked
        // Pass empty exclusion list so we get complete child set
        childNodes = getActorsForMovie(suggestion.id, [], targetSummary, localResources.indexes);
      }
    } else if (source === "api") {
      if (suggestion.type === "actor") {
        const relatedMovies = await fetchActorMovies(suggestion.id, targetNode.type, targetNode.id);
        childNodes = relatedMovies.map((movie) => createNode(movie.title, "movie", {
          id: movie.id,
          pathHint: movie.pathHint,
          releaseDate: movie.releaseDate,
        }));
      } else {
        // For cycle risk analysis, we need ALL actors to check if all next options are blocked
        // Legacy behavior: pass empty exclusion list for complete child enumeration
        const relatedActors = await fetchMovieActors(suggestion.id, [], targetNode.type, targetNode.id);
        childNodes = relatedActors.map((actor) => createNode(actor.name, "actor", {
          id: actor.id,
          popularity: actor.popularity,
          pathHint: actor.pathHint,
          popularityRank: actor.popularityRank,
        }));
      }
    }

    if (useCache) {
      cycleRiskChildCacheRef.current.set(cacheKey, childNodes);
    }

    return childNodes;
  }, [actorA, actorB, targetNode]);

  const getExhaustiveChildrenForNode = useCallback(async (
    node: GameNode,
    source: EffectiveDataSource,
    localResources: Awaited<ReturnType<typeof resolveSnapshotResources>>,
  ) => {
    if (node.id === undefined) {
      return [] as GameNode[];
    }

    const useCache = CYCLE_RISK_CACHE_ENABLED;
    const cacheKey = `${source}:exhaustive:${node.type}:${node.id}`;

    if (useCache) {
      const cached = cycleRiskChildCacheRef.current.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let childNodes: GameNode[] = [];

    if ((source === "snapshot" || source === "demo") && localResources) {
      if (node.type === "actor") {
        childNodes = getMoviesForActor(node.id, null, localResources.indexes);
      } else {
        childNodes = getActorsForMovie(node.id, [], null, localResources.indexes);
      }
    } else if (source === "api") {
      if (node.type === "actor") {
        const relatedMovies = await fetchActorMovies(node.id);
        childNodes = relatedMovies.map((movie) => createNode(movie.title, "movie", {
          id: movie.id,
          releaseDate: movie.releaseDate,
        }));
      } else {
        const relatedActors = await fetchMovieActors(node.id, []);
        childNodes = relatedActors.map((actor) => createNode(actor.name, "actor", {
          id: actor.id,
          popularity: actor.popularity,
          popularityRank: actor.popularityRank,
        }));
      }
    }

    if (useCache) {
      cycleRiskChildCacheRef.current.set(cacheKey, childNodes);
    }

    return childNodes;
  }, []);

  const loadWriteInSuggestionPool = useCallback(async (selection: GameNode | null) => {
    if (!selection || !targetNode || selection.id === undefined) {
      return [] as GameNode[];
    }

    const targetSummary = toNodeSummary(targetNode);
    if (!targetSummary) {
      return [] as GameNode[];
    }

    const formatWriteInSuggestions = (nextSuggestions: GameNode[]) => {
      return finalizeSuggestionOrder(
        buildSuggestionSet(
          applyActorPopularityFilter(nextSuggestions),
          targetNode,
          blockedLoopNodeKeys,
          {
            ...suggestionBuildOptions,
            shouldShuffle: false,
            suggestionLimit: null,
          },
        ),
      );
    };

    const mapApiMovies = async () => {
      const relatedMovies = await fetchActorMovies(selection.id!, targetNode.type, targetNode.id);
      return relatedMovies.map((movie) => createNode(movie.title, "movie", {
        id: movie.id,
        releaseDate: movie.releaseDate,
        imageUrl: moviesCatalogById.get(movie.id)?.posterUrl ?? null,
        genres: moviesCatalogById.get(movie.id)?.genres ?? [],
        contentRating: moviesCatalogById.get(movie.id)?.contentRating ?? null,
        originalLanguage: moviesCatalogById.get(movie.id)?.originalLanguage ?? null,
        overview: moviesCatalogById.get(movie.id)?.overview ?? null,
        pathHint: movie.pathHint,
      }));
    };

    const mapApiActors = async () => {
      const relatedActors = await fetchMovieActors(selection.id!, [], targetNode.type, targetNode.id);
      return relatedActors.map((actor) => createNode(actor.name, "actor", {
        id: actor.id,
        popularity: actor.popularity,
        imageUrl: actorsCatalogById.get(actor.id)?.profileUrl ?? null,
        knownForDepartment: actorsCatalogById.get(actor.id)?.knownForDepartment ?? null,
        placeOfBirth: actorsCatalogById.get(actor.id)?.placeOfBirth ?? null,
        pathHint: actor.pathHint,
        popularityRank: actor.popularityRank,
      }));
    };

    if (activeDataSource === "snapshot" || activeDataSource === "demo") {
      const resources = await resolveSnapshotResources(activeDataSource === "demo");
      if (!resources) {
        return [] as GameNode[];
      }

      const localSuggestions = selection.type === "actor"
        ? getMoviesForActor(selection.id, targetSummary, resources.indexes)
        : getActorsForMovie(selection.id, [], targetSummary, resources.indexes);

      return formatWriteInSuggestions(localSuggestions);
    }

    try {
      const apiSuggestions = selection.type === "actor"
        ? await mapApiMovies()
        : await mapApiActors();

      return formatWriteInSuggestions(apiSuggestions);
    } catch {
      const resources = (await resolveSnapshotResources()) ?? (await resolveSnapshotResources(true));
      if (!resources) {
        return [] as GameNode[];
      }

      const localSuggestions = selection.type === "actor"
        ? getMoviesForActor(selection.id, targetSummary, resources.indexes)
        : getActorsForMovie(selection.id, [], targetSummary, resources.indexes);

      return formatWriteInSuggestions(localSuggestions);
    }
  }, [activeDataSource, actorsCatalogById, applyActorPopularityFilter, blockedLoopNodeKeys, finalizeSuggestionOrder, moviesCatalogById, resolveSnapshotResources, suggestionBuildOptions, targetNode]);

  const annotateOneStepCycleRisk = useCallback(async (nextSuggestions: GameNode[], source: EffectiveDataSource) => {
    if (nextSuggestions.length === 0) {
      return nextSuggestions;
    }

    if (!targetNode) {
      return nextSuggestions;
    }

    const targetSummary = toNodeSummary(targetNode);
    if (!targetSummary || targetNode.id === undefined) {
      return nextSuggestions;
    }

    const localResources = source === "snapshot" || source === "demo"
      ? await resolveSnapshotResources(source === "demo")
      : null;

    const yellowCache = new Map<string, Promise<boolean>>();

    // Helper function: checks if a single node would be marked as yellow (all its children blocked)
    const wouldBeYellow = async (node: GameNode): Promise<boolean> => {
      if (node.id === undefined) {
        return false;
      }

      const nodeKey = `${source}:${getNodeKey(node)}:${targetSummary.id}`;
      const cachedPromise = yellowCache.get(nodeKey);
      if (cachedPromise) {
        return cachedPromise;
      }

      const yellowPromise = (async () => {
        let childNodes: GameNode[] = [];
        try {
          childNodes = await getCycleRiskChildrenForSuggestion(node, source, localResources, targetSummary);
        } catch {
          return false;
        }

        if (childNodes.length === 0) {
          return false;
        }

        const filteredChildren = applyActorPopularityFilter(childNodes);
        if (filteredChildren.length === 0) {
          return false;
        }

        return filteredChildren.every((child) => blockedLoopNodeKeys.has(getNodeKey(child)));
      })();

      yellowCache.set(nodeKey, yellowPromise);
      return yellowPromise;
    };

    const annotated = await Promise.all(nextSuggestions.map(async (suggestion) => {
      // Skip cycle risk check for suggestions that are definitely not dead-ends:
      // 1. Already in path (red)
      // 2. No ID (can't evaluate)
      if (suggestion.id === undefined || blockedLoopNodeKeys.has(getNodeKey(suggestion))) {
        return suggestion;
      }

      // Skip if this is a direct connection—can immediately win
      const isDirectConnection = isDirectConnectionSuggestion(suggestion, targetNode);
      if (isDirectConnection) {
        return suggestion;
      }

      // Skip if API explicitly marks it as reachable (has a path to target)
      const hasReachablePath = source === "api" && suggestion.pathHint?.reachable === true;
      if (hasReachablePath) {
        return suggestion;
      }

      // Fetch all possible next-step nodes (children) from this suggestion
      let childNodes: GameNode[] = [];
      try {
        childNodes = await getCycleRiskChildrenForSuggestion(suggestion, source, localResources, targetSummary);
      } catch {
        // If child expansion fails, treat as non-dead-end (safer default)
        return suggestion;
      }

      // If no children exist, this node can't be a dead-end
      if (childNodes.length === 0) {
        return suggestion;
      }

      // Apply the same filters used for suggestions (e.g., popularity cutoff)
      const filteredChildNodes = applyActorPopularityFilter(childNodes);

      // If popularity filter removes all children, it's not a dead-end in the suggested set
      if (filteredChildNodes.length === 0) {
        return suggestion;
      }

      // Check if ALL remaining children are already in the path (would be blocked/red on next turn)
      const allChildrenBlocked = filteredChildNodes.every((childNode) => {
        return blockedLoopNodeKeys.has(getNodeKey(childNode));
      });

      // If ALL children are blocked, mark parent as cycle risk (yellow)
      if (allChildrenBlocked) {
        return {
          ...suggestion,
          highlight: {
            kind: "loop" as const,
            label: "Cycle risk",
            description: "All next-step options from this card are already visited and would be blocked.",
          },
        };
      }

      // Movie-specific sparse-catalog guard:
      // if ALL cast members only connect to this same movie card or movies already in path,
      // mark as a strong 5th-color lock (handles 1:1 actor↔movie cases explicitly).
      // This only applies after the player has made at least one placement.
      if (hasPlacedSelections && suggestion.type === "movie" && showCastLockRiskHighlight) {
        try {
          const castNodes = childNodes.filter((child) => child.type === "actor");
          if (castNodes.length > 0) {
            const suggestionMovieKey = getNodeKey(suggestion);
            const castLockAnalysis = await Promise.all(
              castNodes.map(async (castNode) => {
                if (castNode.id === undefined) {
                  return null;
                }

                let actorMovies: GameNode[] = [];
                try {
                  actorMovies = await getExhaustiveChildrenForNode(castNode, source, localResources);
                } catch {
                  return null;
                }

                if (actorMovies.length === 0) {
                  return null;
                }

                const uniqueMovieKeys = Array.from(new Set(actorMovies.map((movieNode) => getNodeKey(movieNode))));
                const selfOrVisitedOnly = uniqueMovieKeys.every((movieKey) => {
                  return movieKey === suggestionMovieKey || visitedMovieNodeKeys.has(movieKey);
                });
                const selfOnly = uniqueMovieKeys.every((movieKey) => movieKey === suggestionMovieKey);

                return {
                  selfOrVisitedOnly,
                  selfOnly,
                };
              }),
            );

            const hasCompleteCastAnalysis = castLockAnalysis.every((entry) => entry !== null);
            if (!hasCompleteCastAnalysis) {
              return suggestion;
            }

            const analyzedCast = castLockAnalysis.filter((entry): entry is { selfOrVisitedOnly: boolean; selfOnly: boolean } => entry !== null);
            const isCastLocked = analyzedCast.every((entry) => entry.selfOrVisitedOnly);

            if (isCastLocked) {
              return {
                ...suggestion,
                highlight: {
                  kind: "cast-lock" as const,
                  label: "Cast lock risk",
                  description: "All cast members from this movie only connect back to this movie or to movies already in your path.",
                },
              };
            }
          }
        } catch {
          // Fall through to generic cascade check.
        }
      }

      // Two-level lookahead: check if a majority of children would themselves be yellow (cascade block)
      // This only applies after the player has made at least one placement.
      if (hasPlacedSelections) {
        try {
          const childWouldBeYellowChecks = await Promise.all(
            filteredChildNodes.map((child) => wouldBeYellow(child))
          );
          const yellowChildrenCount = childWouldBeYellowChecks.filter((isYellow) => isYellow).length;
          const yellowChildrenRatio = yellowChildrenCount / filteredChildNodes.length;
          const isMajorityYellowChildren = yellowChildrenRatio > 0.5;

          if (isMajorityYellowChildren) {
            const percent = Math.round(yellowChildrenRatio * 100);
            return {
              ...suggestion,
              highlight: {
                kind: "deep-loop" as const,
                label: "Cascade risk",
                description: `${percent}% of next-step cards from this option are cycle risks with only visited follow-ups.`,
              },
            };
          }
        } catch {
          // If deep check fails, just skip it and leave as-is
        }
      }

      // Otherwise, leave as-is (gray for neutral, or existing highlight)
      return suggestion;
    }));

    return annotated;
  }, [applyActorPopularityFilter, blockedLoopNodeKeys, getCycleRiskChildrenForSuggestion, getExhaustiveChildrenForNode, hasPlacedSelections, resolveSnapshotResources, showCastLockRiskHighlight, targetNode, visitedMovieNodeKeys]);

  useEffect(() => {
    if (!actorA || !actorB || !currentSelection || !targetNode || completion || isNetworkUnavailable) {
      return;
    }

    setIsSuggestionsLoading(true);
    setSuggestionError(null);

    const loadSuggestions = async () => {
      try {
        const targetSummary = toNodeSummary(targetNode);
        if (!targetSummary) {
          setSuggestionError(`Missing target id for ${targetNode.label}.`);
          setSuggestions([]);
          return;
        }

        if (activeDataSource === "snapshot" || activeDataSource === "demo") {
			const resources = await resolveSnapshotResources(activeDataSource === "demo");
          if (!resources) {
            setSuggestions(createPlaceholderSuggestions(currentSelection.type));
            setSuggestionError(NETWORK_UNAVAILABLE_MESSAGE);
            setIsNetworkUnavailable(true);
            return;
          }

          let localSuggestions: GameNode[] = [];
          if (currentSelection.type === "actor") {
            if (currentSelection.id === undefined) {
              setSuggestionError(`Missing actor id for ${currentSelection.label}.`);
              setSuggestions([]);
              return;
            }

            localSuggestions = getMoviesForActor(currentSelection.id, targetSummary, resources.indexes);
          } else {
            if (currentSelection.id === undefined) {
              setSuggestionError(`Missing movie id for ${currentSelection.label}.`);
              setSuggestions([]);
              return;
            }

              localSuggestions = getActorsForMovie(currentSelection.id, [], targetSummary, resources.indexes);
          }

          const weightedSuggestions = buildSuggestionSet(
            applyActorPopularityFilter(localSuggestions),
            targetNode,
            blockedLoopNodeKeys,
            suggestionBuildOptions,
          );
          const cycleRiskAnnotatedSuggestions = await annotateOneStepCycleRisk(weightedSuggestions, activeDataSource);
          const finalSuggestions = finalizeSuggestionOrder(cycleRiskAnnotatedSuggestions);
          setSuggestions(finalSuggestions.length > 0 ? finalSuggestions : createPlaceholderSuggestions(currentSelection.type));
          if (finalSuggestions.length === 0) {
            setSuggestionError("No local suggestions were returned for this node.");
          }
          return;
        }

        try {
          let weightedSuggestions: GameNode[] = [];

          if (currentSelection.type === "actor") {
            if (currentSelection.id === undefined) {
              setSuggestionError(`Missing actor id for ${currentSelection.label}.`);
              setSuggestions([]);
              return;
            }

            const movieSuggestions = await fetchActorMovies(currentSelection.id, targetNode.type, targetNode.id);
            weightedSuggestions = buildSuggestionSet(
              movieSuggestions.map((movie) => createNode(movie.title, "movie", {
                id: movie.id,
                releaseDate: movie.releaseDate,
        imageUrl: moviesCatalogById.get(movie.id)?.posterUrl ?? null,
        genres: moviesCatalogById.get(movie.id)?.genres ?? [],
        contentRating: moviesCatalogById.get(movie.id)?.contentRating ?? null,
        originalLanguage: moviesCatalogById.get(movie.id)?.originalLanguage ?? null,
        overview: moviesCatalogById.get(movie.id)?.overview ?? null,
                pathHint: movie.pathHint,
              })),
              targetNode,
              blockedLoopNodeKeys,
              suggestionBuildOptions,
            );
          } else {
            if (currentSelection.id === undefined) {
              setSuggestionError(`Missing movie id for ${currentSelection.label}.`);
              setSuggestions([]);
              return;
            }

              const actorSuggestions = await fetchMovieActors(currentSelection.id, [], targetNode.type, targetNode.id);
            weightedSuggestions = buildSuggestionSet(
              applyActorPopularityFilter(actorSuggestions.map((actor) => createNode(actor.name, "actor", {
                id: actor.id,
                popularity: actor.popularity,
        				imageUrl: actorsCatalogById.get(actor.id)?.profileUrl ?? null,
        				knownForDepartment: actorsCatalogById.get(actor.id)?.knownForDepartment ?? null,
        				placeOfBirth: actorsCatalogById.get(actor.id)?.placeOfBirth ?? null,
                pathHint: actor.pathHint,
                popularityRank: actor.popularityRank,
              }))),
              targetNode,
              blockedLoopNodeKeys,
              suggestionBuildOptions,
            );
          }

          const cycleRiskAnnotatedSuggestions = await annotateOneStepCycleRisk(weightedSuggestions, activeDataSource);
          const finalSuggestions = finalizeSuggestionOrder(cycleRiskAnnotatedSuggestions);
          setSuggestions(finalSuggestions.length > 0 ? finalSuggestions : createPlaceholderSuggestions(currentSelection.type));
          if (finalSuggestions.length === 0) {
            setSuggestionError("No API suggestions were returned for this node.");
          }
        } catch {
          const resources = (await resolveSnapshotResources()) ?? (await resolveSnapshotResources(true));
          if (!resources) {
            setSuggestions(createPlaceholderSuggestions(currentSelection.type));
            setSuggestionError(NETWORK_UNAVAILABLE_MESSAGE);
            setIsNetworkUnavailable(true);
            return;
          }

          let localSuggestions: GameNode[] = [];
          if (currentSelection.type === "actor" && currentSelection.id !== undefined) {
            localSuggestions = getMoviesForActor(currentSelection.id, targetSummary, resources.indexes);
          } else if (currentSelection.type === "movie" && currentSelection.id !== undefined) {
              localSuggestions = getActorsForMovie(currentSelection.id, [], targetSummary, resources.indexes);
          }

          const weightedSuggestions = buildSuggestionSet(
            applyActorPopularityFilter(localSuggestions),
            targetNode,
            blockedLoopNodeKeys,
            suggestionBuildOptions,
          );
          const cycleRiskAnnotatedSuggestions = await annotateOneStepCycleRisk(weightedSuggestions, resources.source);
          setResolvedDataSource(resources.source);
          const finalSuggestions = finalizeSuggestionOrder(cycleRiskAnnotatedSuggestions);
          setSuggestions(finalSuggestions.length > 0 ? finalSuggestions : createPlaceholderSuggestions(currentSelection.type));
          if (finalSuggestions.length === 0) {
            setSuggestionError("No local suggestions were returned after falling back to snapshot data.");
          }
        }
      } finally {
        setIsSuggestionsLoading(false);
      }
    };

    void loadSuggestions();
  }, [actorA, actorB, actorsCatalogById, annotateOneStepCycleRisk, applyActorPopularityFilter, blockedLoopNodeKeys, bottomPath, completion, currentSelection, activeDataSource, finalizeSuggestionOrder, isNetworkUnavailable, moviesCatalogById, resolveSnapshotResources, suggestionBuildOptions, targetNode, topPath]);

  useEffect(() => {
    if (!currentSelection || !targetNode || completion || isNetworkUnavailable) {
      setRightWriteInSuggestionPool([]);
      return;
    }

    let didCancel = false;

    const loadOptions = async () => {
      const nextOptions = await loadWriteInSuggestionPool(currentSelection);
      if (!didCancel) {
        setRightWriteInSuggestionPool(nextOptions);
      }
    };

    void loadOptions();

    return () => {
      didCancel = true;
    };
  }, [completion, currentSelection, isNetworkUnavailable, loadWriteInSuggestionPool, targetNode]);

  useEffect(() => {
    if (!leftPanelWriteInSide || completion || isNetworkUnavailable) {
      setLeftWriteInSuggestionPool([]);
      return;
    }

    const selection = leftPanelWriteInSide === "top" ? topSelection : bottomSelection;
    if (!selection || !targetNode) {
      setLeftWriteInSuggestionPool([]);
      return;
    }

    let didCancel = false;

    const loadOptions = async () => {
      const nextOptions = await loadWriteInSuggestionPool(selection);
      if (!didCancel) {
        setLeftWriteInSuggestionPool(nextOptions);
      }
    };

    void loadOptions();

    return () => {
      didCancel = true;
    };
  }, [bottomSelection, completion, isNetworkUnavailable, leftPanelWriteInSide, loadWriteInSuggestionPool, targetNode, topSelection]);

  const finalizeCompletion = useCallback(async (fullPath: GameNode[], winningSide: SelectedSide, source: string) => {
    const hydratedFullPath = hydrateCompletionPath(fullPath, [actorA, actorB].filter((node): node is GameNode => node !== null));
    const hops = hydratedFullPath.length - 1;
    const turnsAtCompletion = turns;
    const shuffleModeEnabledAtCompletion = isShuffleModeEnabled;
    const shufflesCount = shuffles;
    const appliedShufflePenaltyCount = shuffleAddsPenalty ? (shuffleModeEnabledAtCompletion ? shufflesCount : 1) : 0;
    const appliedRewindPenaltyCount = rewindAddsPenalty ? rewinds : 0;
    const appliedSuggestionAssistPenaltyCount = helperSettings["show-suggestions"] ? 1 : 0;
    const rewindsCount = rewinds;
    const deadEndsCount = deadEndPenalties;
    const effectiveTurns = getEffectiveTurnCount({
      turns: turnsAtCompletion,
      shuffles: appliedShufflePenaltyCount,
      rewinds: appliedRewindPenaltyCount,
      deadEnds: deadEndsCount,
    });
    const popularityScore = calculatePathPopularityScore(hydratedFullPath);
    const averageReleaseYear = calculateAverageReleaseYear(hydratedFullPath);
    const optimalHopsValue = optimalHops ?? hops;
    const score = calculateLevelScore({
      hops,
      optimalHops: optimalHopsValue,
      turns: turnsAtCompletion,
      suggestionAssists: appliedSuggestionAssistPenaltyCount,
      shuffles: appliedShufflePenaltyCount,
      rewinds: appliedRewindPenaltyCount,
      deadEnds: deadEndsCount,
    });

    // Only save if actorA and actorB are not null and have label or are strings
    const actorALabel = levelIdentityRef.current?.startLabel;
    const actorBLabel = levelIdentityRef.current?.endLabel;
    if (actorALabel && actorBLabel) {
      setCompletedLevels(markLevelCompleted(actorALabel, actorBLabel));
      const savedHistory = saveLevelAttempt(actorALabel, actorBLabel, {
        path: hydratedFullPath.filter(n => typeof n.id === "number").map(({ id, type, label }) => ({ id: id as number, type, label })),
        score,
        hops,
        turns: turnsAtCompletion,
        effectiveTurns,
        shuffles: shufflesCount,
        shuffleModeEnabled: shuffleModeEnabledAtCompletion,
        appliedShufflePenaltyCount,
        rewinds: rewindsCount,
        deadEnds: deadEndsCount,
        popularityScore,
        averageReleaseYear,
        timestamp: Date.now(),
      });
      setLevelHistory(savedHistory);
    }

    const provisionalCompletion: CompletionState = {
      fullPath: hydratedFullPath,
      usedHops: hops,
      turns: turnsAtCompletion,
      effectiveTurns,
      winningSide,
      source,
      isValidated: null,
      shuffles: shufflesCount,
      shuffleModeEnabled: shuffleModeEnabledAtCompletion,
      appliedShufflePenaltyCount,
      appliedRewindPenaltyCount,
      appliedSuggestionAssistPenaltyCount,
      deadEnds: deadEndsCount,
      popularityScore,
      averageReleaseYear,
      score,
    };

    setCompletion(provisionalCompletion);
    setIsCompletionDialogOpen(true);
    setIsCompletionInfoDialogOpen(false);
    setIsRulesOpen(false);

    try {
      let validation;

      if (activeDataSource === "snapshot" || activeDataSource === "demo") {
		const resources = await resolveSnapshotResources(activeDataSource === "demo");
        if (!resources) {
          throw new Error(NETWORK_UNAVAILABLE_MESSAGE);
        }

        validation = validateLocalPath(fullPath, resources.indexes);
      } else {
        try {
          validation = await validatePath(hydratedFullPath.map((node) => node.label));
        } catch {
          const resources = (await resolveSnapshotResources()) ?? (await resolveSnapshotResources(true));
          if (!resources) {
            throw new Error(NETWORK_UNAVAILABLE_MESSAGE);
          }

          validation = validateLocalPath(hydratedFullPath, resources.indexes);
          setResolvedDataSource(resources.source);
        }
      }

      setCompletion((prev) => prev && typeof prev === "object" ? {
        ...prev,
        isValidated: validation.valid,
        validationMessage: validation.message,
      } : prev);
    } catch (error) {
      setCompletion((prev) => prev && typeof prev === "object" ? {
        ...prev,
        isValidated: null,
        validationMessage: error instanceof Error ? error.message : "Path validation could not be completed.",
      } : prev);
    }
  }, [activeDataSource, actorA, actorB, deadEndPenalties, helperSettings, isShuffleModeEnabled, optimalHops, resolveSnapshotResources, rewindAddsPenalty, rewinds, shuffles, shuffleAddsPenalty, turns]);

  const handleSuggestion = useCallback(async (choice: GameNode) => {
    if (!actorA || !actorB || !targetNode || isInteractionDisabled) {
      return;
    }

    if (cycleRiskClickAddsPenalty && choice.highlight?.kind === "loop") {
      applyDeadEndPenalty(`Cycle risk selected: ${choice.label} would only branch to already-visited nodes. Dead-end penalty applied.`);
      return;
    }

    const activePath = selectedSide === "top" ? topPath : bottomPath;
    const shouldAutoComplete = isDirectConnectionSuggestion(choice, targetNode);
    const autoCompletionTail = shouldAutoComplete
      ? (choice.pathHint?.path.slice(1).map(nodeFromSummary) ?? [])
      : [];
    const cycleNode = findLoopedNode([choice, ...autoCompletionTail], blockedLoopNodeKeys);

    if (cycleNode) {
      applyDeadEndPenalty(`Cycle detected: ${cycleNode.label} is already in your path. Please rewind and make a different selection.`);
      return;
    }

    const updatedPath = [...activePath, choice, ...autoCompletionTail];
    const nextTopPath = selectedSide === "top" ? updatedPath : topPath;
    const nextBottomPath = selectedSide === "bottom" ? updatedPath : bottomPath;

    if (selectedSide === "top") {
      setTopPath(updatedPath);
    } else {
      setBottomPath(updatedPath);
    }

    setTurns((currentTurns) => currentTurns + 1);

    if (nextTopPath.length + nextBottomPath.length >= MAX_PATH_LENGTH) {
      setLockedSide(selectedSide);
    }

    const meetingPath = combineMeetingPath(actorA, nextTopPath, actorB, nextBottomPath);
    if (meetingPath) {
      await finalizeCompletion(meetingPath, selectedSide, "Both sides met on the same node.");
      return;
    }

    const updatedLastNode = updatedPath[updatedPath.length - 1];
    if (updatedLastNode && isSameNode(updatedLastNode, targetNode)) {
      const winningPath = selectedSide === "top"
        ? [actorA, ...updatedPath]
        : reverseFullPath([actorB, ...updatedPath]);
      const source = shouldAutoComplete
        ? "A look-ahead suggestion connected directly into the target path."
        : "The target node was selected directly.";
      await finalizeCompletion(winningPath, selectedSide, source);
    }
  }, [actorA, actorB, applyDeadEndPenalty, blockedLoopNodeKeys, bottomPath, cycleRiskClickAddsPenalty, finalizeCompletion, isInteractionDisabled, selectedSide, targetNode, topPath]);

  const handleRemoveTopPathItem = () => {
    if (topPath.length === 0 || completion) {
      return;
    }

    setTopPath((currentPath) => currentPath.slice(0, -1));
    setLockedSide(null);
    setRewinds((currentRewinds) => currentRewinds + 1);
  };

  const handleRemoveBottomPathItem = () => {
    if (bottomPath.length === 0 || completion) {
      return;
    }

    setBottomPath((currentPath) => currentPath.slice(0, -1));
    setLockedSide(null);
    setRewinds((currentRewinds) => currentRewinds + 1);
  };

  const handleBackCurrentPathItem = () => {
    if (selectedSide === "top") {
      handleRemoveTopPathItem();
      return;
    }

    handleRemoveBottomPathItem();
  };

  const handleReverseSides = () => {
    if (!actorA || !actorB || completion) {
      return;
    }

    setActorA(actorB);
    setActorB(actorA);
    setTopPath(bottomPath);
    setBottomPath(topPath);
    // setOptimalPath removed
    setLockedSide((currentLockedSide) => {
      if (currentLockedSide === "top") {
        return "bottom";
      }

      if (currentLockedSide === "bottom") {
        return "top";
      }

      return null;
    });
  };

  const handleResetBoard = () => {
    setSelectedSide("top");
    setTopPath([]);
    setBottomPath([]);
    setLockedSide(null);
    setLeftPanelWriteInSide(null);
    setLeftPanelWriteInValue("");
    setTurns(0);
    setRewinds(0);
    setDeadEndPenalties(0);
    setShuffles(0);
    setShuffleSeed((currentSeed) => currentSeed + 1);
    setSuggestionError(null);
    setFilterValidationMessage(null);
    setCompletion(null);
    setIsCompletionDialogOpen(false);
    setIsCompletionInfoDialogOpen(false);
    setIsSavedHistoryDialogOpen(false);
  };

  const handleShuffle = () => {
    if (completion || !shouldRandomizeSuggestions) {
      return;
    }

    setShuffles((count) => count + 1);
    setShuffleSeed((currentSeed) => currentSeed + 1);
  };

  const handleRulesOverlayWheelCapture = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const dialog = rulesDialogRef.current;
    if (!dialog) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && dialog.contains(target)) {
      return;
    }

    if (dialog.scrollHeight <= dialog.clientHeight) {
      return;
    }

    dialog.scrollTop += event.deltaY;
    event.preventDefault();
  }, []);

  const handleRetryCompletedLevel = () => {
    handleResetBoard();
  };

  const handleReturnToLevelList = () => {
    navigate("/adventure", {
      state: {
        focusLevelIndex: routeState?.levelIndex,
      },
    });
  };

  const handleNextLevel = () => {
    if (typeof routeState?.levelIndex !== "number") {
      return;
    }

    navigate("/adventure", {
      state: {
        autoStartLevelIndex: routeState.levelIndex + 1,
      },
    });
  };

  const loadInspectorNode = useCallback(async (node: GameNode) => {
    setInspectorRelationSearch("");
    setNodeInspector(buildFallbackInspectorState(node));

    try {
      if (node.type === "actor") {
        if (activeDataSource === "snapshot" || activeDataSource === "demo") {
          const resources = await resolveSnapshotResources(activeDataSource === "demo");
          if (!resources || node.id === undefined) {
            throw new Error("Actor details are not available for this node.");
          }

          const actor = resources.indexes.actorsById.get(node.id);
          const fullNode = actor ? createNodeFromActor(actor) : node;
          const relatedEntities = getMoviesForActor(node.id, null, resources.indexes)
            .slice(0, 18)
            .map((relatedNode) => ({
              id: relatedNode.id ?? -1,
              type: "movie" as const,
              label: relatedNode.label,
              meta: formatGameNodeMeta(relatedNode),
              imageUrl: relatedNode.imageUrl ?? null,
              badges: getMovieBadges({
                genres: relatedNode.genres ?? [],
                originalLanguage: relatedNode.originalLanguage ?? null,
                contentRating: relatedNode.contentRating ?? null,
              }),
            }));

          setNodeInspector(createNodeInspectorState(
            fullNode,
            relatedEntities,
            uniqueText([
              actor ? formatActorLifespan(actor) : null,
              actor?.knownForDepartment ?? fullNode.knownForDepartment,
              actor?.placeOfBirth ?? fullNode.placeOfBirth,
              actor?.popularity !== null && actor?.popularity !== undefined ? `Popularity ${actor.popularity.toFixed(1)}` : null,
            ]),
            actor?.biography ?? null,
          ));
          return;
        }

        const [actorDetails, relatedMovies] = await Promise.all([
          fetchActorByName(node.label),
          node.id !== undefined ? fetchActorMovies(node.id) : Promise.resolve([]),
        ]);

        const fullNode = createNodeFromActor(actorDetails);
        const relatedEntities = relatedMovies.slice(0, 18).map((movie) => {
          const catalogMovie = moviesCatalog.find((entry) => entry.id === movie.id);
          return {
            id: movie.id,
            type: "movie" as const,
            label: movie.title,
            meta: formatMovieInlineMeta(movie),
            imageUrl: catalogMovie?.posterUrl ?? movie.posterUrl ?? null,
            badges: getMovieBadges(catalogMovie ?? movie),
          };
        });

        setNodeInspector(createNodeInspectorState(
          fullNode,
          relatedEntities,
          uniqueText([
            formatActorLifespan(actorDetails),
            actorDetails.knownForDepartment,
            actorDetails.placeOfBirth,
            actorDetails.popularity !== null && actorDetails.popularity !== undefined ? `Popularity ${actorDetails.popularity.toFixed(1)}` : null,
          ]),
          actorDetails.biography ?? null,
        ));
        return;
      }

      if (activeDataSource === "snapshot" || activeDataSource === "demo") {
        const resources = await resolveSnapshotResources(activeDataSource === "demo");
        if (!resources || node.id === undefined) {
          throw new Error("Movie details are not available for this node.");
        }

        const movie = resources.indexes.moviesById.get(node.id);
        const fullNode = movie ? createNodeFromMovie(movie) : node;
        const relatedActors = sortByPopularityDescending(
          getActorsForMovie(node.id, [], null, resources.indexes).slice(0, 24),
          (entry) => entry.popularity,
          (entry) => entry.label,
        );
        const relatedEntities = relatedActors.map((relatedNode) => ({
          id: relatedNode.id ?? -1,
          type: "actor" as const,
          label: relatedNode.label,
          meta: formatGameNodeMeta(relatedNode),
          imageUrl: relatedNode.imageUrl ?? null,
          badges: relatedNode.knownForDepartment ? [relatedNode.knownForDepartment] : [],
          popularity: relatedNode.popularity,
        }));

        setNodeInspector(createNodeInspectorState(
          fullNode,
          relatedEntities,
          uniqueText([
            fullNode.releaseDate ? `Released ${fullNode.releaseDate}` : null,
            fullNode.contentRating,
            fullNode.originalLanguage ? fullNode.originalLanguage.toUpperCase() : null,
            fullNode.genres?.slice(0, 3).join(" • "),
          ]),
          fullNode.overview ?? null,
        ));
        return;
      }

      const relatedActors = node.id !== undefined ? await fetchMovieActors(node.id, []) : [];
      const catalogMovie = node.id !== undefined ? moviesCatalog.find((entry) => entry.id === node.id) : null;
      const fullNode = catalogMovie ? createNodeFromMovie(catalogMovie) : node;
      const sortedActors = sortByPopularityDescending(relatedActors.slice(0, 24), (actor) => actor.popularity, (actor) => actor.name);
      const relatedEntities = sortedActors.map((actor) => {
        const catalogActor = actorsCatalog.find((entry) => entry.id === actor.id);
        return {
          id: actor.id,
          type: "actor" as const,
          label: actor.name,
          meta: formatActorInlineMeta(actor),
          imageUrl: catalogActor?.profileUrl ?? actor.profileUrl ?? null,
          badges: catalogActor?.knownForDepartment
            ? [catalogActor.knownForDepartment]
            : actor.knownForDepartment
            ? [actor.knownForDepartment]
            : [],
          popularity: catalogActor?.popularity ?? actor.popularity ?? null,
        };
      });

      setNodeInspector(createNodeInspectorState(
        fullNode,
        relatedEntities,
        uniqueText([
          fullNode.releaseDate ? `Released ${fullNode.releaseDate}` : null,
          fullNode.contentRating,
          fullNode.originalLanguage ? fullNode.originalLanguage.toUpperCase() : null,
          fullNode.genres?.slice(0, 3).join(" • "),
        ]),
        fullNode.overview ?? null,
      ));
    } catch (error) {
      setNodeInspector((currentState) => currentState
        ? {
            ...currentState,
            isLoading: false,
            errorMessage: error instanceof Error ? error.message : "Node details could not be loaded.",
          }
        : null);
    }
  }, [activeDataSource, actorsCatalog, moviesCatalog, resolveSnapshotResources]);

  const handleInspectNode = useCallback((node: GameNode, options?: { appendToTrail?: boolean }) => {
    const appendToTrail = options?.appendToTrail ?? false;

    setInspectorTrail((currentTrail) => {
      if (!appendToTrail) {
        return [node];
      }

      return buildNextDetailTrail(currentTrail, node, (left, right) => isSameNode(left, right));
    });

    void loadInspectorNode(node);
  }, [loadInspectorNode]);

  const handleWriteIn = useCallback(async (value: string, type: NodeType, allowedOptions: GameNode[], sourceLabel: string) => {
    setSuggestionError(null);

    try {
      const matchedOption = resolveWriteInOption(
        value,
        allowedOptions.filter((option) => option.type === type),
        true,
      );

      if (!matchedOption) {
        setSuggestionError(`No valid ${type} connected to ${sourceLabel} matches "${value}".`);
        return false;
      }

      await handleSuggestion(matchedOption);
      return true;
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : "The write-in value could not be resolved.");
      return false;
    }
  }, [handleSuggestion]);

  const handleOpenLeftPanelWriteIn = useCallback((side: SelectedSide) => {
    setSelectedSide(side);
    setLeftPanelWriteInSide(side);
    setLeftPanelWriteInValue("");
    setLeftWriteInSuggestionPool([]);
  }, []);

  const handleCloseLeftPanelWriteIn = useCallback(() => {
    setLeftPanelWriteInSide(null);
    setLeftPanelWriteInValue("");
    setLeftWriteInSuggestionPool([]);
  }, []);

  const handleSubmitLeftPanelWriteIn = useCallback(async () => {
    if (!leftPanelWriteInSide || isSubmittingLeftPanelWriteIn) {
      return;
    }

    const trimmedValue = leftPanelWriteInValue.trim();
    if (!trimmedValue) {
      return;
    }

    setIsSubmittingLeftPanelWriteIn(true);

    try {
      const didResolve = await handleWriteIn(
        trimmedValue,
        leftPanelWriteInContext.writeInType,
        leftWriteInSuggestionPool,
        leftPanelWriteInSelection?.label ?? "this node",
      );
      if (didResolve) {
        handleCloseLeftPanelWriteIn();
      }
    } finally {
      setIsSubmittingLeftPanelWriteIn(false);
    }
  }, [handleCloseLeftPanelWriteIn, handleWriteIn, isSubmittingLeftPanelWriteIn, leftPanelWriteInContext.writeInType, leftPanelWriteInSelection, leftPanelWriteInSide, leftPanelWriteInValue, leftWriteInSuggestionPool]);

  const handleSelectLeftPanelWriteInSuggestion = useCallback(async (choice: GameNode) => {
    if (!leftPanelWriteInSide || isSubmittingLeftPanelWriteIn) {
      return;
    }

    setIsSubmittingLeftPanelWriteIn(true);

    try {
      await handleSuggestion(choice);
      handleCloseLeftPanelWriteIn();
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : "The selected write-in could not be added.");
    } finally {
      setIsSubmittingLeftPanelWriteIn(false);
    }
  }, [handleCloseLeftPanelWriteIn, handleSuggestion, isSubmittingLeftPanelWriteIn, leftPanelWriteInSide]);


  const backDestination = routeState?.returnTo ?? "/play-now";
  const canOpenLevelList = backDestination === "/adventure" || typeof routeState?.levelIndex === "number";
  const hasNextLevel = typeof routeState?.levelIndex === "number"
    && typeof routeState?.totalLevels === "number"
    && routeState.levelIndex < routeState.totalLevels - 1;
  const shouldShowMobileHistoryTab = isCompactPhoneViewport && currentLevelCompleted;
  const inspectorHistory = useMemo<EntityDetailsHistoryEntry[]>(() => {
    return inspectorTrail.map((node) => ({
      key: `${node.type}-${node.id ?? node.label}`,
      type: node.type,
      label: node.label,
    }));
  }, [inspectorTrail]);

  useEffect(() => {
    setIsSuggestionPanelVisible(defaultSuggestionPanelVisible);
  }, [defaultSuggestionPanelVisible]);

  useEffect(() => {
    if (!shouldShowMobileHistoryTab && activeRulesTab === "saved-history") {
      setActiveRulesTab("how-to-play");
    }
  }, [activeRulesTab, shouldShowMobileHistoryTab]);

  useEffect(() => {
    if (isCompactPhoneViewport && activeRulesTab === "gameplay-settings") {
      setActiveRulesTab("how-to-play");
    }
  }, [activeRulesTab, isCompactPhoneViewport]);

  useEffect(() => {
    if (isCompactPhoneViewport && isRulesOpen) {
      setIsRulesOpen(false);
    }
  }, [isCompactPhoneViewport, isRulesOpen]);

  useEffect(() => {
    const handleOpenGameInfo = () => {
      if (isCompactPhoneViewport) {
        return;
      }

      setActiveRulesTab("how-to-play");
      setIsRulesOpen(true);
    };

    window.addEventListener("costars:open-game-info", handleOpenGameInfo as EventListener);

    return () => {
      window.removeEventListener("costars:open-game-info", handleOpenGameInfo as EventListener);
    };
  }, [isCompactPhoneViewport]);

  const gameGridPanel = (
    <GameLeftPanel
      actorA={actorA ?? createNode("Loading…", "actor")}
      actorB={actorB ?? createNode("Loading…", "actor")}
      selectedSide={selectedSide}
      topPath={topPath}
      bottomPath={bottomPath}
      lockedSide={lockedSide}
      completedPath={completion?.fullPath}
      currentHops={currentHops}
      optimalHops={optimalHops}
      showOptimalTracking={helperSettings["show-optimal-tracking"]}
      isInteractionDisabled={isInteractionDisabled}
      activeWriteInSide={leftPanelWriteInSide}
      writeInValue={leftPanelWriteInValue}
      writeInPlaceholder={leftPanelWriteInContext.placeholder}
      writeInSuggestions={leftWriteInSuggestionPool}
      writeInAutoSuggestEnabled={writeInAutoSuggestEnabled}
      showWriteInSuggestions={helperSettings["show-suggestions"]}
      isSubmittingWriteIn={isSubmittingLeftPanelWriteIn}
      isSuggestionPanelVisible={isSuggestionPanelVisible}
      showSuggestionToggle={!isCompactPhoneViewport}
      showSideSwapButton={isCompactPhoneViewport}
      turns={turns}
      rewinds={rewinds}
      shuffles={shuffles}
      deadEndPenalties={deadEndPenalties}
      shuffleAddsPenalty={shuffleAddsPenalty}
      rewindAddsPenalty={rewindAddsPenalty}
      deadEndAddsPenalty={cycleRiskClickAddsPenalty}
      hiddenPanelMessage={hiddenPanelMessage}
      suggestionTargetType={currentSelection?.type === "movie" ? "actor" : "movie"}
      onSelectSide={setSelectedSide}
      onInspectNode={(node) => {
        void handleInspectNode(node);
      }}
      onToggleSuggestionPanel={() => setIsSuggestionPanelVisible((currentValue) => !currentValue)}
      onSwapSides={handleReverseSides}
      onOpenWriteIn={handleOpenLeftPanelWriteIn}
      onCloseWriteIn={handleCloseLeftPanelWriteIn}
      onWriteInValueChange={setLeftPanelWriteInValue}
      onSubmitWriteIn={() => {
        void handleSubmitLeftPanelWriteIn();
      }}
      onSelectWriteInSuggestion={(choice) => {
        void handleSelectLeftPanelWriteInSuggestion(choice);
      }}
      onRemoveTopPathItem={handleRemoveTopPathItem}
      onRemoveBottomPathItem={handleRemoveBottomPathItem}
    />
  );

  const suggestionPanel = (
    <div className="gameSidebar">
      {isPathLimitReached && !isGameComplete ? (
        <div className="gameSidebarWarning gameSidebarWarning--visible">
          Max path length reached. Try again and keep it under 19 total placed selections, or rewind a branch to continue.
        </div>
      ) : null}

      {displayedSetupError ? <div className="gamePageStatus gamePageStatus--error">{displayedSetupError}</div> : null}
      {isDeadEndGameOver ? (
        <div className="gamePageStatus gamePageStatus--error gamePageStatusRetryPanel">
          <div>Game over: you reached the dead-end limit of {MAX_DEAD_END_PENALTIES}.</div>
          <button type="button" className="gamePageStatusRetryButton" onClick={handleResetBoard}>
            Retry level
          </button>
        </div>
      ) : null}

      <div className="gameSidebarPanelSlot">
        <GameRightPanel
          currentSelection={currentSelection ?? createNode("Loading…", "actor")}
          suggestions={visibleSuggestions}
          suggestionDisplay={suggestionDisplay}
          isShuffleModeEnabled={isShuffleModeEnabled}
          shuffleAddsPenalty={shuffleAddsPenalty}
          rewindAddsPenalty={rewindAddsPenalty}
          deadEndAddsPenalty={cycleRiskClickAddsPenalty}
          showSuggestionValues={helperSettings["show-suggestions"]}
          showHintColors={helperSettings["show-hint-color"]}
          writeInAutoSuggestEnabled={writeInAutoSuggestEnabled}
          writeInSuggestions={rightWriteInSuggestionPool}
          turns={turns}
          rewinds={rewinds}
          deadEndPenalties={deadEndPenalties}
          shuffles={shuffles}
          shuffleSeed={shuffleSeed}
          canGoBackOnCurrentSide={canGoBackOnCurrentSide}
          isDisabled={isInteractionDisabled}
          isComplete={isGameComplete}
          isLoading={isSuggestionsLoading}
          isRiskAnalysisEnabled={isRiskAnalysisEnabled}
          errorMessage={displayedSuggestionError}
          onBack={handleBackCurrentPathItem}
          onCompletePanelClick={() => setIsCompletionDialogOpen(true)}
          onReverse={handleReverseSides}
          onSuggestion={(choice) => {
            void handleSuggestion(choice);
          }}
          onInspectSuggestion={(choice) => {
            void handleInspectNode(choice);
          }}
          onSelectWriteInSuggestion={async (choice) => {
            await handleSuggestion(choice);
          }}
          onShuffle={handleShuffle}
          onWriteIn={handleWriteIn}
        />
      </div>
    </div>
  );

  return (
    <div className="gamePage">
      <PageNavigationHeader
        backTo={backDestination}
        backLabel="Back"
        centerContent={(
          <div className="gamePageHeaderLogo">
            <button type="button" className="gameLogoButton" onClick={handleResetBoard} aria-label="Reset board" title="Reset board">
              <GameLogo className="gameLogo" />
              <span className="gameLogoResetHint" aria-hidden="true">Reset board</span>
            </button>
          </div>
        )}
      />

      <div className={`gameContainer${completion && !isCompletionDialogOpen ? " gameContainer--with-pinned-summary" : ""}${!isSuggestionPanelVisible ? " gameContainer--solo-panel" : ""}`}>
        {isSuggestionPanelVisible ? (isPanelOrderSwapped ? suggestionPanel : gameGridPanel) : gameGridPanel}
        {isSuggestionPanelVisible ? (
          <div className="gamePanelSwapRail">
            <button
              type="button"
              className="gamePanelSwapButton"
              onClick={() => setIsPanelOrderSwapped((currentValue) => !currentValue)}
              aria-label="Swap the game grid and suggestions panels"
              title="Swap panel positions"
            >
              ⇄
            </button>
          </div>
        ) : null}
        {isSuggestionPanelVisible ? (isPanelOrderSwapped ? gameGridPanel : suggestionPanel) : null}
      </div>

      {completion && !isCompletionDialogOpen ? (
        <div className={`gameCompletionPinnedArea ${isSuggestionPanelVisible ? "gameCompletionPinnedArea--with-sidebar" : "gameCompletionPinnedArea--solo"}`}>
          {isCompactPhoneViewport ? (
            <div
              className={`gameCompletionPinnedScore gameCompletionPinnedScore--compact ${isSuggestionPanelVisible ? "gameCompletionPinnedScore--with-sidebar" : "gameCompletionPinnedScore--solo"}`}
              role="status"
              aria-live="polite"
            >
              <div className="gameCompletionPinnedScoreContent">
                <div className="gameCompletionPinnedScoreTitle">Level complete</div>
                <div className="gameCompletionPinnedScoreHeadline">
                  <span className={`gameCompletionStar gameCompletionStar--${completionStarTone}`} aria-hidden="true">★</span>
                  <span className="gameCompletionPinnedScoreValue">
                    {typeof displayedCompletionScore === "number" ? `${displayedCompletionScore.toFixed(1)}%` : "--"}
                  </span>
                </div>
              </div>
              <div className="gameCompletionPinnedScoreActions">
                <button
                  type="button"
                  className="gameCompletionPinnedScoreButton"
                  onClick={() => setIsCompletionDialogOpen(true)}
                >
                  View summary
                </button>
                {hasNextLevel ? (
                  <button
                    type="button"
                    className="gameCompletionPinnedScoreButton gameCompletionPinnedScoreButton--next"
                    onClick={handleNextLevel}
                  >
                    Next level
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div
              className={`gameCompletionPinnedScore ${isSuggestionPanelVisible ? "gameCompletionPinnedScore--with-sidebar" : "gameCompletionPinnedScore--solo"}`}
              role="status"
              aria-live="polite"
            >
              <div className="gameCompletionPinnedSection gameCompletionPinnedSection--summary">
                <button
                  type="button"
                  className="gameCompletionPinnedScoreButton"
                  onClick={() => setIsCompletionDialogOpen(true)}
                >
                  View summary
                </button>
              </div>
              <div className="gameCompletionPinnedSection gameCompletionPinnedSection--score">
                <div className="gameCompletionPinnedScoreContent">
                  <div className="gameCompletionPinnedScoreTitle">Level complete</div>
                  <div className="gameCompletionPinnedScoreHeadline">
                    <span className={`gameCompletionStar gameCompletionStar--${completionStarTone}`} aria-hidden="true">★</span>
                    <span className="gameCompletionPinnedScoreValue">
                      {typeof displayedCompletionScore === "number" ? `${displayedCompletionScore.toFixed(1)}%` : "--"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="gameCompletionPinnedSection gameCompletionPinnedSection--next">
                {hasNextLevel ? (
                  <button
                    type="button"
                    className="gameCompletionPinnedScoreButton gameCompletionPinnedScoreButton--next"
                    onClick={handleNextLevel}
                  >
                    Next level
                  </button>
                ) : (
                  <div className="gameCompletionPinnedScoreSpacer" aria-hidden="true" />
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {!isCompactPhoneViewport ? (
        <button
          type="button"
          className="gameInfoButton"
          onClick={() => setIsRulesOpen(true)}
          aria-label="Open game rules"
        >
          i
        </button>
      ) : null}

      {currentLevelCompleted && !isCompactPhoneViewport ? (
        <button
          type="button"
          className="gameHistoryButton"
          onClick={() => setIsSavedHistoryDialogOpen(true)}
          aria-label="Open saved history"
          title="View saved history"
        >
          🏆
        </button>
      ) : null}

      {isRulesOpen ? (
        <div className="gameRulesOverlay" onClick={() => setIsRulesOpen(false)} onWheelCapture={handleRulesOverlayWheelCapture}>
          <div ref={rulesDialogRef} className="gameRulesDialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="gameRulesCloseButton" onClick={() => setIsRulesOpen(false)} aria-label="Close rules">
              ×
            </button>
            <div className="gameRulesLayout">
              <div className="gameRulesTabs" role="tablist" aria-label="Game information sections">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeRulesTab === "how-to-play"}
                  className={`gameRulesTab${activeRulesTab === "how-to-play" ? " gameRulesTab--active" : ""}`}
                  onClick={() => setActiveRulesTab("how-to-play")}
                >
                  How to play
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeRulesTab === "gameplay-settings"}
                  className={`gameRulesTab${activeRulesTab === "gameplay-settings" ? " gameRulesTab--active" : ""}`}
                  onClick={() => setActiveRulesTab("gameplay-settings")}
                >
                  Gameplay settings
                </button>
                {shouldShowMobileHistoryTab ? (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeRulesTab === "saved-history"}
                    className={`gameRulesTab${activeRulesTab === "saved-history" ? " gameRulesTab--active" : ""}`}
                    onClick={() => setActiveRulesTab("saved-history")}
                  >
                    Saved history
                  </button>
                ) : null}
              </div>
              <div className="gameRulesPanel">
                {activeRulesTab === "how-to-play" ? (
                  <>
                    <h2 className="gameRulesTitle">How To Play</h2>
                    <p className="gameRulesText">
                      Each turn alternates actor → movie → actor until a valid path connects the two endpoints.
                    </p>
                    <p className="gameRulesText">
                      Suggestion lists are generated from the currently active dataset and ranked from strongest path options to weakest.
                    </p>
                    <p className="gameRulesText">
                      With shuffle turned off, you scroll through the full ranked list and the shuffle score shows as N/A until completion. With shuffle turned on, you see a fixed number of cards and can reroll them with the shuffle button.
                    </p>
                    <p className="gameRulesText">
                      Your current placed hops and the optimal count stay visible so you can compare your route against the shortest known solution.
                    </p>
                    <div className="gameRulesStatusCard">
                      <div className="gameRulesStatusTitle">Mobile game differences</div>
                      {MOBILE_GAME_DIFFERENCE_NOTES.map((note) => (
                        <div key={note} className="gameRulesStatusMeta">{note}</div>
                      ))}
                    </div>
                    <div className="gameRulesStatusCard">
                      <div className="gameRulesStatusTitle">Game info</div>
                      <div className="gameRulesStatusValue">Jeremy Brachle © 2026</div>
                      <div className="gameRulesStatusMeta">Current data source: {activeDataSourceLabel}</div>
                    </div>
                  </>
                ) : null}

                {activeRulesTab === "gameplay-settings" ? (
                  <div className="gameRulesDifficultySection">
                    <div className="gameRulesDifficultyTitle">Gameplay Settings</div>
                    <GameplaySettingsSectionLayout
                      activeSection={activeRulesGameplaySection}
                      onSectionSelect={setActiveRulesGameplaySection}
                      difficulty={settings.difficulty}
                      customSettings={helperSettings}
                      suggestionDisplay={suggestionDisplay}
                      dataFilters={dataFilters}
                      onDifficultyChange={setDifficulty}
                      onToggle={setCustomSetting}
                      onSubsetCountChange={setSubsetCount}
                      onOrderModeChange={setSuggestionOrderMode}
                      onSortModeChange={setSuggestionSortMode}
                      onActorPopularityCutoffChange={handleActorPopularityCutoffChange}
                      onReleaseYearCutoffChange={handleReleaseYearCutoffChange}
                      actorCountSummary={actorCountSummary}
                      movieCountSummary={movieCountSummary}
                      filterValidationMessage={filterValidationMessage}
                      customPanelClassName="gameRulesCustomPanel"
                      dataFilterPanelClassName="gameRulesCustomPanel"
                    />
                  </div>
                ) : null}

                {activeRulesTab === "saved-history" ? (
                  <div className="gameRulesDifficultySection">
                    <div className="gameRulesDifficultyTitle">Saved history</div>
                    <p className="gameRulesText">
                      Review previously completed attempts for this level without leaving the game board.
                    </p>
                    <div className="gameCompletionHistory">
                      <div className="gameCompletionHistoryHeader">
                        <div>
                          <div className="gameCompletionHistoryTitle">Saved history for this level</div>
                          <div className="gameCompletionHistoryMeta">
                            {levelHistory?.attempts.length ?? 0} saved route{(levelHistory?.attempts.length ?? 0) === 1 ? "" : "s"}
                            {latestAttempt ? ` • latest ${formatTimestamp(latestAttempt.timestamp)}` : ""}
                          </div>
                        </div>
                      </div>
                      {levelHistoryContent}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {completion && isCompletionDialogOpen ? (
        <div className="gameCompletionOverlay" onClick={() => {
          setIsCompletionDialogOpen(false);
          setIsCompletionInfoDialogOpen(false);
        }}>
          <div className="gameCompletionDialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="gameRulesCloseButton"
              onClick={() => {
                setIsCompletionDialogOpen(false);
                setIsCompletionInfoDialogOpen(false);
              }}
              aria-label="Close completion dialog"
            >
              ×
            </button>
            <h2 className="gameRulesTitle">Level Complete</h2>
            <p className="gameRulesText gameCompletionLead">{completion.source}</p>

            <div className="gameCompletionHero">
              <div className="gameCompletionHeroScoreRow">
                <span className={`gameCompletionStar gameCompletionStar--${completionStarTone}`} aria-hidden="true">★</span>
                <span className="gameCompletionHeroScore">{typeof displayedCompletionScore === "number" ? `${displayedCompletionScore.toFixed(1)}%` : "--"}</span>
              </div>
              <div className="gameCompletionHeroMeta">{completionPathSummary ?? "--"} in the final path</div>
              <button
                type="button"
                className="gameCompletionInfoButton"
                onClick={() => setIsCompletionInfoDialogOpen(true)}
              >
                Score info
              </button>
            </div>

            <details className="gameCompletionExpandable">
              <summary className="gameCompletionExpandableSummary">
                <span className="gameCompletionExpandableSummaryMain">
                  <span className="gameCompletionExpandableTitle">Route details</span>
                  <span className="gameCompletionExpandableHint">Path preview and misc metrics</span>
                </span>
                <span className="gameCompletionExpandablePlus" aria-hidden="true">+</span>
              </summary>
              <div className="gameCompletionExpandableBody">
                <div className="gameCompletionPreview">
                  <div className="gameCompletionPreviewTitle">Completed path preview</div>
                  {isCompactPhoneViewport ? (
                    <div className="gameCompletionPreviewMobileTrack">
                      {completion.fullPath.map((node, idx) => (
                        <div key={idx} className="gameCompletionPreviewMobileSegment">
                          <div className={`gameCompletionPreviewNode gameCompletionPreviewNode--${node.type}`}>
                            <EntityArtwork
                              type={node.type}
                              label={node.label}
                              imageUrl={node.imageUrl}
                              className="gameCompletionPreviewArtwork"
                              imageClassName="entityArtwork__image"
                              placeholderClassName="entityArtwork__emoji"
                            />
                            <span className="gameCompletionPreviewNodeLabel">{node.label}</span>
                          </div>
                          {idx < completion.fullPath.length - 1 ? <span className="gameCompletionArrow">→</span> : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                        {completion.fullPath.map((node, idx) => (
                          <li key={idx} style={{ display: "inline" }}>
                            <span className={`gameCompletionChip gameCompletionChip--${node.type}`}>{node.label}</span>
                            {idx < completion.fullPath.length - 1 ? <span className="gameCompletionArrow">→</span> : null}
                          </li>
                        ))}
                      </ul>
                      <div className="gameCompletionPreviewText">{completion.fullPath.map((node) => node.label).join(" → ")}</div>
                    </>
                  )}
                </div>
              </div>
            </details>

            <details className="gameCompletionExpandable">
              <summary className="gameCompletionExpandableSummary">
                <span className="gameCompletionExpandableSummaryMain">
                  <span className="gameCompletionExpandableTitle">Leaderboard</span>
                  <span className="gameCompletionExpandableHint">View path rankings</span>
                </span>
                <span className="gameCompletionExpandablePlus" aria-hidden="true">+</span>
              </summary>
              <div className="gameCompletionExpandableBody">
                <div className="gameCompletionLeaderboardOverview">
                  {levelHistory?.attempts.length ?? 0} saved route{(levelHistory?.attempts.length ?? 0) === 1 ? "" : "s"}
                  {latestAttempt ? ` • latest ${formatTimestamp(latestAttempt.timestamp)}` : ""}
                </div>
                {levelHistoryContent}
              </div>
            </details>

            <div className="gameCompletionActions">
              <div className="gameCompletionActionGrid">
                <button type="button" className="gameCompletionActionButton gameCompletionActionButtonSecondary" onClick={handleRetryCompletedLevel}>
                  Retry level
                </button>
                {canOpenLevelList ? (
                  <button
                    type="button"
                    className="gameCompletionActionButton gameCompletionActionButtonList"
                    onClick={handleReturnToLevelList}
                  >
                    Main level list
                  </button>
                ) : (
                  <div className="gameCompletionActionSpacer" aria-hidden="true" />
                )}
                {hasNextLevel ? (
                  <button type="button" className="gameCompletionActionButton gameCompletionActionButtonPrimary gameCompletionActionButtonNext gameCompletionActionButtonNext--wide" onClick={handleNextLevel}>
                    Next level
                  </button>
                ) : null}
              </div>
            </div>

            {isCompletionInfoDialogOpen ? (
              <div className="gameCompletionNestedOverlay" onClick={() => setIsCompletionInfoDialogOpen(false)}>
                <div className="gameCompletionNestedDialog" onClick={(event) => event.stopPropagation()}>
                  <button type="button" className="gameRulesCloseButton" onClick={() => setIsCompletionInfoDialogOpen(false)} aria-label="Close score details">
                    ×
                  </button>
                  <h3 className="gameRulesTitle">Score Details</h3>
                  <div className="gameCompletionHero gameCompletionHero--nested">
                    <div className="gameCompletionHeroScoreRow">
                      <span className={`gameCompletionStar gameCompletionStar--${completionStarTone}`} aria-hidden="true">★</span>
                      <span className="gameCompletionHeroScore">{typeof displayedCompletionScore === "number" ? `${displayedCompletionScore.toFixed(1)}%` : "--"}</span>
                    </div>
                    <div className="gameCompletionHeroMeta">{completionPathSummary ?? "--"} in the final path</div>
                  </div>
                  <div className="gameCompletionScoreBreakdown">
                    <div className="gameCompletionScoreBreakdownRow">
                      <span>Hop efficiency</span>
                      <span>{optimalHops ?? completion.usedHops} / {completion.usedHops}</span>
                    </div>
                    <div className="gameCompletionScoreBreakdownRow">
                      <span>Turn efficiency</span>
                      <span>{optimalHops ?? completion.usedHops} / {completion.effectiveTurns}</span>
                    </div>
                    <div className="gameCompletionScoreBreakdownRow">
                      <span>Suggestion assist penalty</span>
                      <span>{formatPenaltyValue(completionScoreBreakdown?.suggestionPenalty ?? 0)}</span>
                    </div>
                    <div className="gameCompletionScoreBreakdownRow">
                      <span>Turn load</span>
                      <span>{completion.turns} base + {completion.appliedShufflePenaltyCount} shuffle + {completion.appliedRewindPenaltyCount} rewind + {completion.deadEnds ?? 0} dead-end</span>
                    </div>
                    <div className="gameCompletionScoreBreakdownRow">
                      <span>Base efficiency score</span>
                      <span>{completionScoreBreakdown ? `${(((completionScoreBreakdown.hopEfficiency + completionScoreBreakdown.turnEfficiency) / 2) * 100).toFixed(1)}%` : "--"}</span>
                    </div>
                    <div className="gameCompletionScoreBreakdownRow">
                      <span>Popularity average</span>
                      <span>{completion.popularityScore}</span>
                    </div>
                    <div className="gameCompletionScoreBreakdownRow">
                      <span>Average release year</span>
                      <span>{formatAverageReleaseYear(completion.averageReleaseYear)}</span>
                    </div>
                    <div className="gameCompletionScoreBreakdownRow">
                      <span>Validation</span>
                      <span>
                        {completion.isValidated === true
                          ? "Validated"
                          : completion.isValidated === false
                            ? "Issue reported"
                            : "Unavailable"}
                      </span>
                    </div>
                    {completion.validationMessage ? (
                      <div className="gameCompletionScoreBreakdownRow">
                        <span>Validation note</span>
                        <span>{completion.validationMessage}</span>
                      </div>
                    ) : null}
                    <div className="gameCompletionScoreBreakdownRow gameCompletionScoreBreakdownRowStrong">
                      <span>Final score</span>
                      <span>{typeof displayedCompletionScore === "number" ? `${displayedCompletionScore.toFixed(1)}%` : "--"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isSavedHistoryDialogOpen ? (
        <div className="gameCompletionOverlay" onClick={() => setIsSavedHistoryDialogOpen(false)}>
          <div className="gameCompletionDialog gameSavedHistoryDialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="gameRulesCloseButton" onClick={() => setIsSavedHistoryDialogOpen(false)} aria-label="Close saved history dialog">
              ×
            </button>
            <h2 className="gameRulesTitle">Previous Game History</h2>
            <p className="gameRulesText gameCompletionLead">
              Ranked by hops first, then score within each hop count. Equal scores with equal hop counts can appear in any order.
            </p>
            <div className="gameCompletionHistory">
              <div className="gameCompletionHistoryHeader">
                <div>
                  <div className="gameCompletionHistoryTitle">Saved history for this level</div>
                  <div className="gameCompletionHistoryMeta">
                    {levelHistory?.attempts.length ?? 0} saved route{(levelHistory?.attempts.length ?? 0) === 1 ? "" : "s"}
                    {latestAttempt ? ` • latest ${formatTimestamp(latestAttempt.timestamp)}` : ""}
                  </div>
                </div>
              </div>
              {levelHistoryContent}
            </div>
          </div>
        </div>
      ) : null}

      {nodeInspector ? (
        <EntityDetailsDialog
          detail={nodeInspector.detail}
          history={inspectorHistory}
          relationSearch={inspectorRelationSearch}
          relatedEntities={nodeInspector.relatedEntities}
          isLoading={nodeInspector.isLoading}
          errorMessage={nodeInspector.errorMessage}
          onClose={() => {
            setNodeInspector(null);
            setInspectorTrail([]);
            setInspectorRelationSearch("");
          }}
          onRelationSearchChange={setInspectorRelationSearch}
          onOpenRelatedEntity={(entity) => {
            const relatedNode = createNode(entity.label, entity.type, {
              id: entity.id,
              imageUrl: entity.imageUrl,
              popularity: entity.popularity ?? null,
            });
            handleInspectNode(relatedNode, { appendToTrail: true });
          }}
          onNavigateHistory={(index) => {
            setInspectorTrail((currentTrail) => {
              const nextTrail = currentTrail.slice(0, index + 1);
              const nextActiveNode = nextTrail[nextTrail.length - 1];

              if (nextActiveNode) {
                void loadInspectorNode(nextActiveNode);
              }

              return nextTrail;
            });
          }}
        />
      ) : null}
    </div>
  );
}

export default GamePage;