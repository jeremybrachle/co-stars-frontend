import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CustomGameSettingsPanel from "../components/CustomGameSettingsPanel";
import EntityDetailsDialog, {
  type EntityDetailsDialogData,
  type EntityDetailsHistoryEntry,
  type EntityDetailsRelatedEntity,
} from "../components/EntityDetailsDialog";
import GameDataFilterPanel from "../components/GameDataFilterPanel";
import SuggestionDisplaySettingsPanel from "../components/SuggestionDisplaySettingsPanel";
import HomeButton from "../components/HomeButton";
import GameLogo from "../components/GameLogo";
import { GameLeftPanel, GameRightPanel } from "../components/game";
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
  generateLocalPath,
  getActorsForMovie,
  getMoviesForActor,
  validateLocalPath,
} from "../data/localGraph";
import { formatActorInlineMeta, formatActorLifespan, formatGameNodeMeta, formatMovieInlineMeta, getMovieBadges } from "../data/presentation";
import { calculateLevelScore } from "../utils/calculateLevelScore.ts";
import {
  isLevelCompleted,
  markLevelCompleted,
  readCompletedLevels,
  subscribeToLevelCompletionUpdates,
  type CompletedLevelsCollection,
} from "../utils/levelCompletionStorage.ts";
import {
  buildHopLeaderboardGroups,
  getLevelHistory,
  saveLevelAttempt,
  subscribeToLevelHistoryUpdates,
  type LevelHistoryRecord,
} from "../utils/levelHistoryStorage.ts";
import type { Actor, EffectiveDataSource, GameNode, Movie, NodeSummary, NodeType, SnapshotIndexes } from "../types";
import "./GamePage.css";

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

interface CompletionState {
  fullPath: GameNode[];
  usedHops: number;
  winningSide: SelectedSide;
  source: string;
  isValidated: boolean | null;
  validationMessage?: string;
  score?: number;
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

function getSuggestionPriorityScore(node: GameNode) {
  if (node.highlight?.kind === "optimal") return 0;
  if (node.highlight?.kind === "connection") return 0;
  if (!node.highlight && node.pathHint?.reachable) return 1;

  if (
    node.highlight?.kind === "deep-loop"
    || node.highlight?.kind === "cast-lock"
    || node.highlight?.kind === "full-cast-lock"
  ) {
    return 2;
  }

  if (node.highlight?.kind === "loop") return 3;
  if (node.highlight?.kind === "blocked") return 5;
  return 4;
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

function getCompletionScoreSymbol(score: number | undefined) {
  if (typeof score !== "number") {
    return "✅";
  }

  if (score >= 90) {
    return "🏆";
  }

  if (score >= 75) {
    return "⭐";
  }

  if (score >= 50) {
    return "🎉";
  }

  return "✅";
}

function getDisplayedCompletionScore(
  completion: CompletionState | null,
  optimalHops: number | null,
  shuffles: number,
  rewinds: number,
  deadEndPenalties: number,
) {
  if (!completion) {
    return null;
  }

  return calculateLevelScore({
    hops: completion.usedHops,
    optimalHops: optimalHops ?? completion.usedHops,
    shuffles,
    rewinds,
    deadEnds: deadEndPenalties,
  });
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
  const { settings, setCustomSetting, setActorPopularityCutoff, setReleaseYearCutoff, setMovieSortMode, setActorSortMode, setSuggestionViewMode, setSubsetCount, setAllWindowMode } = useGameSettings();
  const helperSettings = settings.customSettings;
  const suggestionDisplay = settings.suggestionDisplay;
  const dataFilters = settings.dataFilters;
  const shouldGuaranteeBestPathSuggestion = helperSettings["guarantee-best-path-suggestion"];
  const showVisitedSuggestions = helperSettings["show-visited-suggestions"];
  const sortSuggestionsByRiskPriority = helperSettings["sort-suggestions-by-risk-priority"];
  const cycleRiskClickAddsPenalty = helperSettings["cycle-risk-click-adds-penalty"];
  const showCastLockRiskHighlight = helperSettings["show-cast-lock-risk"];
  const showFullCastLockHighlight = helperSettings["show-full-cast-lock"];

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
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const [optimalHops, setOptimalHops] = useState<number | null>(routeState?.optimalHops ?? null);


  const [suggestions, setSuggestions] = useState<GameNode[]>([]);
  const [isSetupLoading, setIsSetupLoading] = useState(true);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionState | null>(null);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [isCompletionHistoryOpen, setIsCompletionHistoryOpen] = useState(false);
  const [completedLevels, setCompletedLevels] = useState<CompletedLevelsCollection>(() => readCompletedLevels());
  const [currentLevelIdentity, setCurrentLevelIdentity] = useState<{ startLabel: string; endLabel: string } | null>(null);
  const [levelHistory, setLevelHistory] = useState<LevelHistoryRecord | null>(null);
  const [resolvedDataSource, setResolvedDataSource] = useState<EffectiveDataSource | null>(null);
  const [isNetworkUnavailable, setIsNetworkUnavailable] = useState(false);
  const [inspectorTrail, setInspectorTrail] = useState<GameNode[]>([]);
  const [nodeInspector, setNodeInspector] = useState<NodeInspectorState | null>(null);
  const [inspectorRelationSearch, setInspectorRelationSearch] = useState("");
  const cycleRiskChildCacheRef = useRef<Map<string, GameNode[]>>(new Map());
  const levelIdentityRef = useRef<{ startLabel: string; endLabel: string } | null>(null);

  const preferredDataSource = getConfiguredPrimarySource(mode);
  const activeDataSource = resolvedDataSource ?? preferredDataSource;
  const leaderboardGroups = useMemo(() => buildHopLeaderboardGroups(levelHistory?.attempts ?? []), [levelHistory]);
  const latestAttempt = levelHistory?.attempts[0] ?? null;
  const displayedCompletionScore = useMemo(
    () => getDisplayedCompletionScore(completion, optimalHops, shuffles, rewinds, deadEndPenalties),
    [completion, deadEndPenalties, optimalHops, rewinds, shuffles],
  );
  const currentLevelCompleted = useMemo(() => {
    if (!currentLevelIdentity) {
      return false;
    }

    return isLevelCompleted(currentLevelIdentity.startLabel, currentLevelIdentity.endLabel, completedLevels);
  }, [completedLevels, currentLevelIdentity]);

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
  const isRiskAnalysisEnabled = helperSettings["show-hint-color"] && hasPlacedSelections && (showCastLockRiskHighlight || showFullCastLockHighlight);
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

  const targetNode = useMemo(() => {
    if (!actorA || !actorB) {
      return null;
    }

    return selectedSide === "top" ? actorB : actorA;
  }, [actorA, actorB, selectedSide]);

  const shouldRandomizeSuggestions = useMemo(() => {
    if (!currentSelection) {
      return false;
    }

    return currentSelection.type === "actor"
      ? dataFilters.movieSortMode === "random"
      : dataFilters.actorSortMode === "random";
  }, [currentSelection, dataFilters.actorSortMode, dataFilters.movieSortMode]);

  const suggestionBuildOptions = useMemo(() => ({
    shouldShuffle: shouldRandomizeSuggestions,
    shouldGuaranteeBestPath: shouldGuaranteeBestPathSuggestion,
    suggestionLimit: suggestionDisplay.viewMode === "subset" ? suggestionDisplay.subsetCount : null,
    movieSortMode: dataFilters.movieSortMode,
    actorSortMode: dataFilters.actorSortMode,
  }), [dataFilters.actorSortMode, dataFilters.movieSortMode, shouldGuaranteeBestPathSuggestion, shouldRandomizeSuggestions, suggestionDisplay.viewMode, suggestionDisplay.subsetCount]);

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
    return createBlockedLoopNodeKeySet([actorA, actorB, ...topPath, ...bottomPath], allowedKeys);
  }, [actorA, actorB, bottomPath, oppositeFrontierNode, targetNode, topPath]);

  const visitedMovieNodeKeys = useMemo(() => {
    if (!actorA || !actorB) {
      return new Set<string>();
    }

    return new Set(
      [actorA, actorB, ...topPath, ...bottomPath]
        .filter((node) => node.type === "movie")
        .map((node) => getNodeKey(node)),
    );
  }, [actorA, actorB, bottomPath, topPath]);

  const isInteractionDisabled = isPathLimitReached || isSetupLoading || isNetworkUnavailable || ((activeDataSource === "snapshot" || activeDataSource === "demo") && isSnapshotLoading && !isOfflineDemoMode(mode)) || !!completion;
  const isGameComplete = !!completion;

  const visibleSuggestions = useMemo(() => {
    const filtered = showVisitedSuggestions
      ? [...suggestions]
      : suggestions.filter((suggestion) => suggestion.highlight?.kind !== "blocked");

    if (!sortSuggestionsByRiskPriority) {
      return filtered;
    }

    return [...filtered].sort((a, b) => getSuggestionPriorityScore(a) - getSuggestionPriorityScore(b));
  }, [showVisitedSuggestions, sortSuggestionsByRiskPriority, suggestions]);

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

    const useCache = CYCLE_RISK_CACHE_ENABLED && source === "api";
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

    const useCache = CYCLE_RISK_CACHE_ENABLED && source === "api";
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

    // Helper function: checks if a single node would be marked as yellow (all its children blocked)
    const wouldBeYellow = async (node: GameNode): Promise<boolean> => {
      if (node.id === undefined) {
        return false;
      }

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
            const isFullyCastLocked = analyzedCast.every((entry) => entry.selfOnly);
            const isCastLocked = analyzedCast.every((entry) => entry.selfOrVisitedOnly);

            if (showFullCastLockHighlight && isFullyCastLocked) {
              return {
                ...suggestion,
                highlight: {
                  kind: "full-cast-lock" as const,
                  label: "Full cast lock",
                  description: "All cast members from this movie only connect back to this same movie.",
                },
              };
            }

            if (isCastLocked) {
              return {
                ...suggestion,
                highlight: {
                  kind: "cast-lock" as const,
                  label: "Cast lock risk",
                  description: "All cast members from this movie only connect to this movie or movies already in your path.",
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
  }, [applyActorPopularityFilter, blockedLoopNodeKeys, getCycleRiskChildrenForSuggestion, getExhaustiveChildrenForNode, hasPlacedSelections, resolveSnapshotResources, showCastLockRiskHighlight, showFullCastLockHighlight, targetNode, visitedMovieNodeKeys]);

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
          setSuggestions(cycleRiskAnnotatedSuggestions.length > 0 ? cycleRiskAnnotatedSuggestions : createPlaceholderSuggestions(currentSelection.type));
          if (cycleRiskAnnotatedSuggestions.length === 0) {
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
				imageUrl: moviesCatalog.find((entry) => entry.id === movie.id)?.posterUrl ?? null,
				genres: moviesCatalog.find((entry) => entry.id === movie.id)?.genres ?? [],
				contentRating: moviesCatalog.find((entry) => entry.id === movie.id)?.contentRating ?? null,
				originalLanguage: moviesCatalog.find((entry) => entry.id === movie.id)?.originalLanguage ?? null,
				overview: moviesCatalog.find((entry) => entry.id === movie.id)?.overview ?? null,
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
				imageUrl: actorsCatalog.find((entry) => entry.id === actor.id)?.profileUrl ?? null,
				knownForDepartment: actorsCatalog.find((entry) => entry.id === actor.id)?.knownForDepartment ?? null,
				placeOfBirth: actorsCatalog.find((entry) => entry.id === actor.id)?.placeOfBirth ?? null,
                pathHint: actor.pathHint,
                popularityRank: actor.popularityRank,
              }))),
              targetNode,
              blockedLoopNodeKeys,
              suggestionBuildOptions,
            );
          }

          const cycleRiskAnnotatedSuggestions = await annotateOneStepCycleRisk(weightedSuggestions, activeDataSource);
          setSuggestions(cycleRiskAnnotatedSuggestions.length > 0 ? cycleRiskAnnotatedSuggestions : createPlaceholderSuggestions(currentSelection.type));
          if (cycleRiskAnnotatedSuggestions.length === 0) {
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
          setSuggestions(cycleRiskAnnotatedSuggestions.length > 0 ? cycleRiskAnnotatedSuggestions : createPlaceholderSuggestions(currentSelection.type));
          if (cycleRiskAnnotatedSuggestions.length === 0) {
            setSuggestionError("No local suggestions were returned after falling back to snapshot data.");
          }
        }
      } finally {
        setIsSuggestionsLoading(false);
      }
    };

    void loadSuggestions();
  }, [actorA, actorB, actorsCatalog, annotateOneStepCycleRisk, applyActorPopularityFilter, blockedLoopNodeKeys, bottomPath, completion, currentSelection, activeDataSource, isNetworkUnavailable, moviesCatalog, resolveSnapshotResources, shuffleSeed, suggestionBuildOptions, targetNode, topPath]);

  const finalizeCompletion = async (fullPath: GameNode[], winningSide: SelectedSide, source: string) => {
    const hydratedFullPath = hydrateCompletionPath(fullPath, [actorA, actorB].filter((node): node is GameNode => node !== null));
    const hops = hydratedFullPath.length - 1;
    const shufflesCount = shuffles;
    const rewindsCount = rewinds;
    const deadEndsCount = deadEndPenalties;
    const optimalHopsValue = optimalHops ?? hops;
    const score = calculateLevelScore({
      hops,
      optimalHops: optimalHopsValue,
      shuffles: shufflesCount,
      rewinds: rewindsCount,
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
        shuffles: shufflesCount,
        rewinds: rewindsCount,
        deadEnds: deadEndsCount,
        timestamp: Date.now(),
      });
      setLevelHistory(savedHistory);
    }

    const provisionalCompletion: CompletionState = {
      fullPath: hydratedFullPath,
      usedHops: hops,
      winningSide,
      source,
      isValidated: null,
      score,
    };

    setCompletion(provisionalCompletion);
    setIsCompletionDialogOpen(true);
    setIsCompletionHistoryOpen(false);
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
  };

  const handleSuggestion = async (choice: GameNode) => {
    if (!actorA || !actorB || !targetNode || isInteractionDisabled) {
      return;
    }

    if (cycleRiskClickAddsPenalty && choice.highlight?.kind === "loop") {
      setDeadEndPenalties((currentPenalties) => currentPenalties + 1);
      setSuggestionError(`Cycle risk selected: ${choice.label} would only branch to already-visited nodes. Dead-end penalty applied.`);
      return;
    }

    const activePath = selectedSide === "top" ? topPath : bottomPath;
    const shouldAutoComplete = isDirectConnectionSuggestion(choice, targetNode);
    const autoCompletionTail = shouldAutoComplete
      ? (choice.pathHint?.path.slice(1).map(nodeFromSummary) ?? [])
      : [];
    const cycleNode = findLoopedNode([choice, ...autoCompletionTail], blockedLoopNodeKeys);

    if (cycleNode) {
      setDeadEndPenalties((currentPenalties) => currentPenalties + 1);
      setSuggestionError(`Cycle detected: ${cycleNode.label} is already in your path. Please rewind and make a different selection.`);
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
  };

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
    setTurns(0);
    setRewinds(0);
    setDeadEndPenalties(0);
    setShuffles(0);
    setShuffleSeed((currentSeed) => currentSeed + 1);
    setSuggestionError(null);
    setCompletion(null);
    setIsCompletionDialogOpen(false);
    setIsCompletionHistoryOpen(false);
  };

  const handleShuffle = () => {
    if (completion || !shouldRandomizeSuggestions) {
      return;
    }

    setShuffles((count) => count + 1);
    setShuffleSeed((currentSeed) => currentSeed + 1);
  };

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

  const handleWriteIn = async (value: string, type: NodeType) => {
    setSuggestionError(null);

    try {
      if (activeDataSource === "snapshot" || activeDataSource === "demo") {
		const resources = await resolveSnapshotResources(activeDataSource === "demo");
        if (!resources) {
          setSuggestionError(NETWORK_UNAVAILABLE_MESSAGE);
          setIsNetworkUnavailable(true);
          setSuggestions(createPlaceholderSuggestions(type));
          return;
        }

        if (type === "actor") {
          const actor = findNodeByLabel(value, "actor", resources.indexes);
          if (!actor) {
            setSuggestionError(`No actor named "${value}" was found in the local snapshot.`);
            return;
          }

          await handleSuggestion(createGameNodeFromSummary(actor, resources.indexes));
          return;
        }

        const movie = findNodeByLabel(value, "movie", resources.indexes);
        if (!movie) {
          setSuggestionError(`No movie named "${value}" was found in the local snapshot.`);
          return;
        }

        await handleSuggestion(createGameNodeFromSummary(movie, resources.indexes));
        return;
      }

      try {
        if (type === "actor") {
          const actor = await fetchActorByName(value);
          await handleSuggestion(createNodeFromActor(actor));
          return;
        }

        const movie = moviesCatalog.find((entry) => entry.title.toLowerCase() === value.toLowerCase());
        if (!movie) {
          setSuggestionError(`No movie named "${value}" was found in the API movie catalog.`);
          return;
        }

        await handleSuggestion(createNodeFromMovie(movie));
      } catch {
        const resources = (await resolveSnapshotResources()) ?? (await resolveSnapshotResources(true));
        if (!resources) {
          setSuggestionError(NETWORK_UNAVAILABLE_MESSAGE);
          setIsNetworkUnavailable(true);
          setSuggestions(createPlaceholderSuggestions(type));
          return;
        }

        if (type === "actor") {
          const actor = findNodeByLabel(value, "actor", resources.indexes);
          if (!actor) {
            setSuggestionError(`No actor named "${value}" was found after falling back to snapshot data.`);
            return;
          }

          setResolvedDataSource(resources.source);
          await handleSuggestion(createGameNodeFromSummary(actor, resources.indexes));
          return;
        }

        const movie = findNodeByLabel(value, "movie", resources.indexes);
        if (!movie) {
          setSuggestionError(`No movie named "${value}" was found after falling back to snapshot data.`);
          return;
        }

        setResolvedDataSource(resources.source);
        await handleSuggestion(createGameNodeFromSummary(movie, resources.indexes));
      }
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : "The write-in value could not be resolved.");
    }
  };


  const backDestination = routeState?.returnTo ?? "/play-now";
  const canOpenLevelList = backDestination === "/adventure" || typeof routeState?.levelIndex === "number";
  const hasNextLevel = typeof routeState?.levelIndex === "number"
    && typeof routeState?.totalLevels === "number"
    && routeState.levelIndex < routeState.totalLevels - 1;
  const completionScoreSymbol = getCompletionScoreSymbol(displayedCompletionScore ?? undefined);
  const inspectorHistory = useMemo<EntityDetailsHistoryEntry[]>(() => {
    return inspectorTrail.map((node) => ({
      key: `${node.type}-${node.id ?? node.label}`,
      type: node.type,
      label: node.label,
    }));
  }, [inspectorTrail]);

  return (
    <div className="gamePage">
      <div className="topBar">
        <div className="topBarSide topBarSideLeft">
          <button className="backButton" style={{ fontSize: "1.3em", padding: "0.5em 1.2em" }} onClick={() => navigate(backDestination)}>
            ← Back
          </button>
        </div>
        <div className="topBarCenter">
          <button type="button" className="gameLogoButton" onClick={handleResetBoard} aria-label="Reset board" title="Reset board">
            <GameLogo className="gameLogo" />
            <span className="gameLogoResetHint" aria-hidden="true">Reset board</span>
          </button>
        </div>
        <div className="topBarSide topBarSideRight homeWrapper">
          <HomeButton />
        </div>
      </div>

      <div className="gameContainer">
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
          onSelectSide={setSelectedSide}
          onInspectNode={(node) => {
            void handleInspectNode(node);
          }}
          onRemoveTopPathItem={handleRemoveTopPathItem}
          onRemoveBottomPathItem={handleRemoveBottomPathItem}
        />
        <div className="gameSidebar">
          {isPathLimitReached && !isGameComplete ? (
            <div className="gameSidebarWarning gameSidebarWarning--visible">
              Max path length reached. Try again and keep it under 19 total placed selections, or rewind a branch to continue.
            </div>
          ) : null}

          {displayedSetupError ? <div className="gamePageStatus gamePageStatus--error">{displayedSetupError}</div> : null}
          <div className={`gamePageStatus ${currentLevelCompleted ? "gamePageStatus--success" : "gamePageStatus--neutral"}`}>
            {currentLevelCompleted ? "☑ This level is completed." : "☐ This level is not completed yet."}
          </div>

          <GameRightPanel
            currentSelection={currentSelection ?? createNode("Loading…", "actor")}
            suggestions={visibleSuggestions}
            suggestionDisplay={suggestionDisplay}
            canRandomizeSuggestions={shouldRandomizeSuggestions}
            showSuggestionValues={helperSettings["show-suggestions"]}
            showHintColors={helperSettings["show-hint-color"]}
            turns={turns}
            rewinds={rewinds}
            deadEndPenalties={deadEndPenalties}
            shuffles={shuffles}
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
            onShuffle={handleShuffle}
            onWriteIn={handleWriteIn}
          />
        </div>
      </div>

      {completion && !isCompletionDialogOpen ? (
        <div className="gameCompletionPinnedScore" role="status" aria-live="polite">
          <div className="gameCompletionPinnedScoreIcon" aria-hidden="true">{completionScoreSymbol}</div>
          <div className="gameCompletionPinnedScoreContent">
            <div className="gameCompletionPinnedScoreTitle">Level completed</div>
            <div className="gameCompletionPinnedScoreValue">
              Score: {typeof displayedCompletionScore === "number" ? `${displayedCompletionScore.toFixed(1)}%` : "--"}
            </div>
            <div className="gameCompletionPinnedScoreMeta">
              {completion.usedHops} hops used{optimalHops !== null ? ` • optimal ${optimalHops}` : ""}
            </div>
          </div>
          <button
            type="button"
            className="gameCompletionPinnedScoreButton"
            onClick={() => setIsCompletionDialogOpen(true)}
          >
            View summary
          </button>
        </div>
      ) : null}

      <button type="button" className="gameInfoButton" onClick={() => setIsRulesOpen(true)} aria-label="Open game rules">
        i
      </button>

      {isRulesOpen ? (
        <div className="gameRulesOverlay" onClick={() => setIsRulesOpen(false)}>
          <div className="gameRulesDialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="gameRulesCloseButton" onClick={() => setIsRulesOpen(false)} aria-label="Close rules">
              ×
            </button>
            <h2 className="gameRulesTitle">How To Play</h2>
            <p className="gameRulesText">
              Each turn alternates actor → movie → actor until a valid path connects the two endpoints.
            </p>
            <p className="gameRulesText">
              Suggestion lists are generated from the currently active dataset. Actor lists can be sorted by popularity or randomized, and movie lists can be sorted by release year or randomized.
            </p>
            <p className="gameRulesText">
              Best-path inclusion can be guaranteed from settings. When random ordering is enabled for the current list type, the shuffle button rerolls the full list order; otherwise the list stays sorted and you can page or scroll through it using the selected window size.
            </p>
            <p className="gameRulesText">
              Your current placed hops and the optimal count stay visible so you can compare your route against the shortest known solution.
            </p>

              <div className="gameRulesDifficultySection">
                <div className="gameRulesDifficultyTitle">Difficulty</div>
                <CustomGameSettingsPanel
                  customSettings={helperSettings}
                  onToggle={setCustomSetting}
                  title="Gameplay Helpers"
                  hint="These toggles are shared with the Settings page and apply immediately to the board."
                  className="gameRulesCustomPanel"
                />
                <GameDataFilterPanel
                  dataFilters={dataFilters}
                  onActorPopularityCutoffChange={setActorPopularityCutoff}
                  onReleaseYearCutoffChange={setReleaseYearCutoff}
                  onMovieSortModeChange={setMovieSortMode}
                  onActorSortModeChange={setActorSortMode}
                  className="gameRulesCustomPanel"
                />
                <SuggestionDisplaySettingsPanel
                  suggestionDisplay={suggestionDisplay}
                  onViewModeChange={setSuggestionViewMode}
                  onSubsetCountChange={setSubsetCount}
                  onAllWindowModeChange={setAllWindowMode}
                  className="gameRulesCustomPanel"
                />
              </div>
          </div>
        </div>
      ) : null}

      {completion && isCompletionDialogOpen ? (
        <div className="gameCompletionOverlay" onClick={() => setIsCompletionDialogOpen(false)}>
          <div className="gameCompletionDialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="gameRulesCloseButton" onClick={() => setIsCompletionDialogOpen(false)} aria-label="Close completion dialog">
              ×
            </button>
            <h2 className="gameRulesTitle">Level Complete</h2>
            <p className="gameRulesText gameCompletionLead">{completion.source}</p>

            <div className="gameCompletionStats">
              <div className="gameCompletionStat">
                <span className="gameCompletionStatLabel">Score</span>
                <span className="gameCompletionStatValue">{typeof displayedCompletionScore === "number" ? `${displayedCompletionScore.toFixed(1)}%` : "--"}</span>
              </div>
              <div className="gameCompletionStat">
                <span className="gameCompletionStatLabel">Completed hops</span>
                <span className="gameCompletionStatValue">{completion.usedHops}</span>
              </div>
              <div className="gameCompletionStat">
                <span className="gameCompletionStatLabel">Optimal hops</span>
                <span className="gameCompletionStatValue">{optimalHops ?? "--"}</span>
              </div>
              <div className="gameCompletionStat">
                <span className="gameCompletionStatLabel">Turns used</span>
                <span className="gameCompletionStatValue">{turns}</span>
              </div>
              <div className="gameCompletionStat">
                <span className="gameCompletionStatLabel">Shuffles</span>
                <span className="gameCompletionStatValue">{shuffles}</span>
              </div>
              <div className="gameCompletionStat">
                <span className="gameCompletionStatLabel">Rewinds</span>
                <span className="gameCompletionStatValue">{rewinds}</span>
              </div>
              <div className="gameCompletionStat">
                <span className="gameCompletionStatLabel">Dead ends</span>
                <span className="gameCompletionStatValue">{deadEndPenalties}</span>
              </div>
            </div>

            <p className="gameCompletionFormula">
              This level is now marked completed and will show as completed on the Adventure level list.
            </p>

            <div className="gameCompletionScoreBreakdown">
              <div className="gameCompletionScoreBreakdownTitle">Score breakdown</div>
              <div className="gameCompletionScoreBreakdownRow">
                <span>Hop efficiency</span>
                <span>{optimalHops ?? completion.usedHops} / {completion.usedHops}</span>
              </div>
              <div className="gameCompletionScoreBreakdownRow">
                <span>Shuffle penalties</span>
                <span>-{shuffles * 3}</span>
              </div>
              <div className="gameCompletionScoreBreakdownRow">
                <span>Rewind penalties</span>
                <span>-{rewinds * 4}</span>
              </div>
              <div className="gameCompletionScoreBreakdownRow">
                <span>Dead-end penalties</span>
                <span>-{deadEndPenalties * 6}</span>
              </div>
              <div className="gameCompletionScoreBreakdownRow gameCompletionScoreBreakdownRowStrong">
                <span>Final score</span>
                <span>{typeof displayedCompletionScore === "number" ? `${displayedCompletionScore.toFixed(1)}%` : "--"}</span>
              </div>
            </div>

            <div className="gameCompletionPreview">
              <div className="gameCompletionPreviewTitle">Completed path preview</div>
              <ul style={{ padding: 0, margin: 0, listStyle: "none" }}>
                {completion.fullPath.map((node, idx) => (
                  <li key={idx} style={{ display: "inline" }}>
                    <span className={`gameCompletionChip gameCompletionChip--${node.type}`}>{node.label}</span>
                    {idx < completion.fullPath.length - 1 ? <span className="gameCompletionArrow">→</span> : null}
                  </li>
                ))}
              </ul>
              <div className="gameCompletionPreviewText">{completion.fullPath.map(n => n.label).join(" → ")}</div>
            </div>

            <div className="gameCompletionValidation">
              {completion.isValidated === true ? `Path validated successfully. ${displayedCompletionScore !== null ? `Score: ${displayedCompletionScore.toFixed(1)}%` : ""}` : completion.isValidated === false ? "Path validation reported an issue." : "Validation was not available."}
              {completion.validationMessage ? ` ${completion.validationMessage}` : ""}
            </div>

            <div className="gameCompletionValidationScore">
              Score: {typeof displayedCompletionScore === "number" ? `${displayedCompletionScore.toFixed(1)}%` : "--"}
            </div>

            <div className="gameCompletionHistory">
              <button
                type="button"
                className="gameCompletionHistoryToggle"
                onClick={() => setIsCompletionHistoryOpen((currentValue) => !currentValue)}
                aria-expanded={isCompletionHistoryOpen}
              >
                <div>
                  <div className="gameCompletionHistoryTitle">Saved history for this level</div>
                  <div className="gameCompletionHistoryMeta">
                    {levelHistory?.attempts.length ?? 0} saved route{(levelHistory?.attempts.length ?? 0) === 1 ? "" : "s"}
                    {latestAttempt ? ` • latest ${formatTimestamp(latestAttempt.timestamp)}` : ""}
                  </div>
                </div>
                <span className="gameCompletionHistoryToggleLabel">
                  {isCompletionHistoryOpen ? "Hide leaderboard" : "Show leaderboard"}
                </span>
              </button>

              {isCompletionHistoryOpen ? (
                leaderboardGroups.length === 0 ? (
                  <div className="gameCompletionHistoryEmpty">This level does not have any saved history yet.</div>
                ) : (
                  <div className="gameCompletionLeaderboardGroups">
                    {leaderboardGroups.map((group: NonNullable<typeof leaderboardGroups>[number]) => (
                      <div key={group.hops} className="gameCompletionLeaderboardGroup">
                        <div className="gameCompletionLeaderboardGroupTitle">
                          <span>{group.hops} hops</span>
                          <span>{group.attempts.length} route{group.attempts.length === 1 ? "" : "s"}</span>
                        </div>
                        <ol className="gameCompletionLeaderboardList">
                          {group.attempts.map((attempt: NonNullable<typeof group.attempts>[number], attemptIndex: number) => (
                            <li key={attempt.id} className="gameCompletionLeaderboardItem">
                              <div className="gameCompletionLeaderboardTopRow">
                                <span className="gameCompletionLeaderboardRank">#{attemptIndex + 1}</span>
                                <span className="gameCompletionLeaderboardScore">{attempt.score.toFixed(1)}%</span>
                                <span className="gameCompletionLeaderboardMeta">
                                  shuffles {attempt.shuffles} · rewinds {attempt.rewinds} · dead ends {attempt.deadEnds}
                                </span>
                              </div>
                              <div className="gameCompletionLeaderboardPath">
                                {attempt.path.map((node: NonNullable<typeof attempt.path>[number]) => node.label).join(" → ")}
                              </div>
                              <div className="gameCompletionLeaderboardTimestamp">{formatTimestamp(attempt.timestamp)}</div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                )
              ) : null}
            </div>

            <div className="gameCompletionActions">
              <button type="button" className="gameCompletionActionButton gameCompletionActionButtonPrimary" onClick={handleRetryCompletedLevel}>
                Retry level
              </button>
              {canOpenLevelList ? (
                <button type="button" className="gameCompletionActionButton" onClick={handleReturnToLevelList}>
                  Main level list
                </button>
              ) : null}
              {hasNextLevel ? (
                <button type="button" className="gameCompletionActionButton" onClick={handleNextLevel}>
                  Next level
                </button>
              ) : null}
              <button type="button" className="gameCompletionActionButton gameCompletionActionButtonGhost" onClick={() => setIsCompletionDialogOpen(false)}>
                Close and stay here
              </button>
            </div>

            <div className="gameCompletionFooterScore" role="status" aria-live="polite">
              <span className="gameCompletionFooterScoreIcon" aria-hidden="true">{completionScoreSymbol}</span>
              <span className="gameCompletionFooterScoreText">
                Final score: {typeof displayedCompletionScore === "number" ? `${displayedCompletionScore.toFixed(1)}%` : "--"}
              </span>
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