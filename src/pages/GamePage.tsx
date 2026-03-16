import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import EntityArtwork from "../components/EntityArtwork";
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
  OPTIMAL_PATH_INCLUSION_RATE,
} from "../gameplay";
import { useDataSourceMode } from "../context/dataSourceMode";
import { CUSTOM_SETTING_DEFINITIONS, useGameSettings } from "../context/gameSettings";
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
  createGameNodeFromSummary,
  findNodeByLabel,
  generateLocalPath,
  getActorsForMovie,
  getMoviesForActor,
  validateLocalPath,
} from "../data/localGraph";
import { formatActorLifespan, formatGameNodeMeta, getMovieBadges } from "../data/presentation";
import type { Actor, DifficultyOption, EffectiveDataSource, GameNode, Movie, NodeSummary, NodeType, SnapshotIndexes } from "../types";
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
};

type SelectedSide = "top" | "bottom";

type CompletionState = {
  fullPath: GameNode[];
  usedHops: number;
  winningSide: SelectedSide;
  source: string;
  isValidated: boolean | null;
  validationMessage?: string;
};

type NodeInspectorState = {
  node: GameNode;
  detailLines: string[];
  description: string | null;
  relatedTitle: string;
  relatedNodes: GameNode[];
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

function buildExcludedActorNames(
  startA: GameNode,
  startB: GameNode,
  topPath: GameNode[],
  bottomPath: GameNode[],
  target: GameNode,
) {
  const names = new Set<string>();

  [startA, startB, ...topPath, ...bottomPath].forEach((node) => {
    if (node.type === "actor" && !isSameNode(node, target)) {
      names.add(node.label);
    }
  });

  return Array.from(names);
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

function formatPathPreview(path: GameNode[]) {
  return path.map((node) => node.label).join(" → ");
}

function uniqueText(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

function createNodeInspectorState(
  node: GameNode,
  relatedTitle: string,
  relatedNodes: GameNode[],
  detailLines: string[],
  description: string | null,
  isLoading = false,
  errorMessage: string | null = null,
): NodeInspectorState {
  return {
    node,
    relatedTitle,
    relatedNodes,
    detailLines,
    description,
    isLoading,
    errorMessage,
  };
}

function buildFallbackInspectorState(node: GameNode) {
  return createNodeInspectorState(
    node,
    node.type === "actor" ? "Movies" : "Cast",
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
  const { settings, setDifficulty, setCustomSetting } = useGameSettings();

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
  const [shuffles, setShuffles] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const [optimalHops, setOptimalHops] = useState<number | null>(routeState?.optimalHops ?? null);
  const [optimalPath, setOptimalPath] = useState<GameNode[]>(routeState?.optimalPath?.map(nodeFromSummary) ?? []);

  const [suggestions, setSuggestions] = useState<GameNode[]>([]);
  const [isSetupLoading, setIsSetupLoading] = useState(true);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionState | null>(null);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [resolvedDataSource, setResolvedDataSource] = useState<EffectiveDataSource | null>(null);
  const [isNetworkUnavailable, setIsNetworkUnavailable] = useState(false);
  const [nodeInspector, setNodeInspector] = useState<NodeInspectorState | null>(null);

  const preferredDataSource = getConfiguredPrimarySource(mode);
  const activeDataSource = resolvedDataSource ?? preferredDataSource;

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
      setOptimalPath([]);
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

    setActorA(demoSetup.actorA);
    setActorB(demoSetup.actorB);
  	setActorsCatalog([]);
    setMoviesCatalog([]);
    setOptimalHops(demoSetup.optimalHops);
    setOptimalPath(demoSetup.optimalPath);
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

            setActorA(apiSetup.actorA);
            setActorB(apiSetup.actorB);
      			setActorsCatalog(apiSetup.actors);
            setMoviesCatalog(apiSetup.movies);
            setOptimalHops(apiSetup.optimalHops);
            setOptimalPath(apiSetup.optimalPath);
            setResolvedDataSource("api");
            return;
          } catch {
            const snapshotSetup = await buildLocalSetup("snapshot");
            if (!isMounted) {
              return;
            }

            if (snapshotSetup) {
              setActorA(snapshotSetup.actorA);
              setActorB(snapshotSetup.actorB);
				setActorsCatalog([]);
              setMoviesCatalog([]);
              setOptimalHops(snapshotSetup.optimalHops);
              setOptimalPath(snapshotSetup.optimalPath);
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

          setActorA(snapshotSetup.actorA);
          setActorB(snapshotSetup.actorB);
		  setActorsCatalog([]);
          setMoviesCatalog([]);
          setOptimalHops(snapshotSetup.optimalHops);
          setOptimalPath(snapshotSetup.optimalPath);
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
  const isPathLimitReached = totalSelections >= MAX_PATH_LENGTH;
  const currentHops = totalSelections;

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

  const isInteractionDisabled = isPathLimitReached || isSetupLoading || isNetworkUnavailable || ((activeDataSource === "snapshot" || activeDataSource === "demo") && isSnapshotLoading && !isOfflineDemoMode(mode)) || !!completion;
  const isGameComplete = !!completion;

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

            const excludedNames = buildExcludedActorNames(actorA, actorB, topPath, bottomPath, targetNode);
            localSuggestions = getActorsForMovie(currentSelection.id, excludedNames, targetSummary, resources.indexes);
          }

          const weightedSuggestions = buildSuggestionSet(localSuggestions, targetNode, blockedLoopNodeKeys);
          setSuggestions(weightedSuggestions.length > 0 ? weightedSuggestions : createPlaceholderSuggestions(currentSelection.type));
          if (weightedSuggestions.length === 0) {
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
            );
          } else {
            if (currentSelection.id === undefined) {
              setSuggestionError(`Missing movie id for ${currentSelection.label}.`);
              setSuggestions([]);
              return;
            }

            const excludedNames = buildExcludedActorNames(actorA, actorB, topPath, bottomPath, targetNode);
            const actorSuggestions = await fetchMovieActors(currentSelection.id, excludedNames, targetNode.type, targetNode.id);
            weightedSuggestions = buildSuggestionSet(
              actorSuggestions.map((actor) => createNode(actor.name, "actor", {
                id: actor.id,
                popularity: actor.popularity,
				imageUrl: actorsCatalog.find((entry) => entry.id === actor.id)?.profileUrl ?? null,
				knownForDepartment: actorsCatalog.find((entry) => entry.id === actor.id)?.knownForDepartment ?? null,
				placeOfBirth: actorsCatalog.find((entry) => entry.id === actor.id)?.placeOfBirth ?? null,
                pathHint: actor.pathHint,
                popularityRank: actor.popularityRank,
              })),
              targetNode,
              blockedLoopNodeKeys,
            );
          }

          setSuggestions(weightedSuggestions.length > 0 ? weightedSuggestions : createPlaceholderSuggestions(currentSelection.type));
          if (weightedSuggestions.length === 0) {
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
            const excludedNames = buildExcludedActorNames(actorA, actorB, topPath, bottomPath, targetNode);
            localSuggestions = getActorsForMovie(currentSelection.id, excludedNames, targetSummary, resources.indexes);
          }

          const weightedSuggestions = buildSuggestionSet(localSuggestions, targetNode, blockedLoopNodeKeys);
          setResolvedDataSource(resources.source);
          setSuggestions(weightedSuggestions.length > 0 ? weightedSuggestions : createPlaceholderSuggestions(currentSelection.type));
          if (weightedSuggestions.length === 0) {
            setSuggestionError("No local suggestions were returned after falling back to snapshot data.");
          }
        }
      } finally {
        setIsSuggestionsLoading(false);
      }
    };

    void loadSuggestions();
  }, [actorA, actorB, actorsCatalog, blockedLoopNodeKeys, bottomPath, completion, currentSelection, activeDataSource, isNetworkUnavailable, moviesCatalog, resolveSnapshotResources, shuffleSeed, targetNode, topPath]);

  const finalizeCompletion = async (fullPath: GameNode[], winningSide: SelectedSide, source: string) => {
    const hydratedFullPath = hydrateCompletionPath(fullPath, [actorA, actorB].filter((node): node is GameNode => node !== null));
    const provisionalCompletion: CompletionState = {
      fullPath: hydratedFullPath,
      usedHops: hydratedFullPath.length - 1,
      winningSide,
      source,
      isValidated: null,
    };

    setCompletion(provisionalCompletion);
    setIsCompletionDialogOpen(true);
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

      setCompletion({
        ...provisionalCompletion,
        isValidated: validation.valid,
        validationMessage: validation.message,
      });
    } catch (error) {
      setCompletion({
        ...provisionalCompletion,
        isValidated: null,
        validationMessage: error instanceof Error ? error.message : "Path validation could not be completed.",
      });
    }
  };

  const handleSuggestion = async (choice: GameNode) => {
    if (!actorA || !actorB || !targetNode || isInteractionDisabled) {
      return;
    }

    const activePath = selectedSide === "top" ? topPath : bottomPath;
    const shouldAutoComplete = isDirectConnectionSuggestion(choice, targetNode);
    const autoCompletionTail = shouldAutoComplete
      ? (choice.pathHint?.path.slice(1).map(nodeFromSummary) ?? [])
      : [];
    const cycleNode = findLoopedNode([choice, ...autoCompletionTail], blockedLoopNodeKeys);

    if (cycleNode) {
      setSuggestionError(`Cycle detected: ${cycleNode.label} is already in your path. Make a different selection or rewind the path.`);
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
    setOptimalPath((currentPath) => [...currentPath].reverse());
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
    setShuffles(0);
    setShuffleSeed((currentSeed) => currentSeed + 1);
    setSuggestionError(null);
    setCompletion(null);
    setIsCompletionDialogOpen(false);
  };

  const handleShuffle = () => {
    if (completion) {
      return;
    }

    setShuffles((count) => count + 1);
    setShuffleSeed((currentSeed) => currentSeed + 1);
  };

  const handleInspectNode = useCallback(async (node: GameNode) => {
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
          const relatedNodes = getMoviesForActor(node.id, null, resources.indexes).slice(0, 18);

          setNodeInspector(createNodeInspectorState(
            fullNode,
            "Movies",
            relatedNodes,
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
        const relatedNodes = relatedMovies.slice(0, 18).map((movie) => {
          const catalogMovie = moviesCatalog.find((entry) => entry.id === movie.id);
          return createNode(movie.title, "movie", {
            id: movie.id,
            releaseDate: movie.releaseDate,
            imageUrl: catalogMovie?.posterUrl ?? movie.posterUrl ?? null,
            genres: catalogMovie?.genres ?? movie.genres ?? [],
            contentRating: catalogMovie?.contentRating ?? movie.contentRating ?? null,
            originalLanguage: catalogMovie?.originalLanguage ?? movie.originalLanguage ?? null,
            overview: catalogMovie?.overview ?? movie.overview ?? null,
          });
        });

        setNodeInspector(createNodeInspectorState(
          fullNode,
          "Movies",
          relatedNodes,
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
        const relatedNodes = getActorsForMovie(node.id, [], null, resources.indexes).slice(0, 24);

        setNodeInspector(createNodeInspectorState(
          fullNode,
          "Cast",
          relatedNodes,
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
      const relatedNodes = relatedActors.slice(0, 24).map((actor) => {
        const catalogActor = actorsCatalog.find((entry) => entry.id === actor.id);
        return createNode(actor.name, "actor", {
          id: actor.id,
          popularity: catalogActor?.popularity ?? actor.popularity ?? null,
          imageUrl: catalogActor?.profileUrl ?? actor.profileUrl ?? null,
          knownForDepartment: catalogActor?.knownForDepartment ?? actor.knownForDepartment ?? null,
          placeOfBirth: catalogActor?.placeOfBirth ?? actor.placeOfBirth ?? null,
        });
      });

      setNodeInspector(createNodeInspectorState(
        fullNode,
        "Cast",
        relatedNodes,
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

  const completionPreviewPath = completion?.fullPath ?? optimalPath;
  const backDestination = routeState?.returnTo ?? "/play-now";
  const difficultyOptions: DifficultyOption[] = ["easy", "medium", "hard", "custom"];

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

          {setupError || (activeDataSource === "snapshot" ? snapshotError : null) ? <div className="gamePageStatus gamePageStatus--error">{setupError ?? snapshotError}</div> : null}

          <GameRightPanel
            currentSelection={currentSelection ?? createNode("Loading…", "actor")}
            suggestions={suggestions}
            turns={turns}
            rewinds={rewinds}
            shuffles={shuffles}
            isDisabled={isInteractionDisabled}
            isComplete={isGameComplete}
            isLoading={isSuggestionsLoading}
            errorMessage={suggestionError}
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
              Suggestion lists are generated from the currently active dataset. Actor lists are biased by popularity, movie lists are biased by shortest-path metadata and recency, and the shuffle button rerolls that weighted pool each time.
            </p>
            <p className="gameRulesText">
              A best-path option has a {Math.round(OPTIMAL_PATH_INCLUSION_RATE * 100)}% chance to appear in each reroll when no direct connection is available. If a suggestion can immediately reveal the target on the next alternating node, it is always highlighted as Connection found.
            </p>
            <p className="gameRulesText">
              Your current placed hops and the optimal count stay visible so you can compare your route against the shortest known solution.
            </p>

              <div className="gameRulesDifficultySection">
                <div className="gameRulesDifficultyTitle">Difficulty</div>
                <div className="gameRulesDifficultyGrid">
                  {difficultyOptions.map((option) => (
                    <label
                      key={option}
                      className={`settingsOption settingsOption--radio settingsOption--radio-page settingsDifficultyCard gameRulesDifficultyCard${settings.difficulty === option ? " settingsOption--active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="game-difficulty"
                        checked={settings.difficulty === option}
                        onChange={() => setDifficulty(option)}
                      />
                      <span className="settingsOptionControl" aria-hidden="true" />
                      <span>
                        <strong>{option.charAt(0).toUpperCase() + option.slice(1)}</strong>
                      </span>
                    </label>
                  ))}
                </div>

                {settings.difficulty === "custom" ? (
                  <div className="settingsCustomPanel gameRulesCustomPanel">
                    <div className="settingsCustomHeader">
                      <h3>Custom Rules</h3>
                      <p className="settingsHint">Toggle any helper on or off for this run. These changes are shared with the main Settings page.</p>
                    </div>
                    <div className="settingsToggleList">
                      {CUSTOM_SETTING_DEFINITIONS.map((setting) => (
                        <label key={setting.id} className="settingsToggleRow">
                          <span className="settingsToggleText">
                            <strong>{setting.label}</strong>
                            <span className="settingsHint">{setting.hint}</span>
                          </span>
                          <button
                            type="button"
                            className={`settingsToggleSwitch${settings.customSettings[setting.id] ? " settingsToggleSwitch--on" : ""}`}
                            onClick={() => setCustomSetting(setting.id, !settings.customSettings[setting.id])}
                            aria-pressed={settings.customSettings[setting.id]}
                          >
                            <span className="settingsToggleThumb" aria-hidden="true" />
                          </button>
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
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
            </div>

            <div className="gameCompletionPreview">
              <div className="gameCompletionPreviewTitle">Completed path preview</div>
              <div className="gameCompletionTrack">
                {completionPreviewPath.map((node, index) => (
                  <Fragment key={`${node.type}-${node.label}-${index}`}>
                    <div key={`${node.type}-${node.label}-${index}`} className="gameCompletionTrackSegment">
                      <span className={`gameCompletionChip gameCompletionChip--${node.type}`}>{node.label}</span>
                    </div>
                    {index < completionPreviewPath.length - 1 ? <span key={`arrow-${node.type}-${node.label}-${index}`} className="gameCompletionArrow">→</span> : null}
                  </Fragment>
                ))}
              </div>
              <div className="gameCompletionPreviewText">{formatPathPreview(completion.fullPath)}</div>
            </div>

            <div className="gameCompletionValidation">
              {completion.isValidated === true ? "Path validated successfully." : completion.isValidated === false ? "Path validation reported an issue." : "Validation was not available."}
              {completion.validationMessage ? ` ${completion.validationMessage}` : ""}
            </div>
          </div>
        </div>
      ) : null}

      {nodeInspector ? (
        <div className="gameInspectorOverlay" onClick={() => setNodeInspector(null)}>
          <div className="gameInspectorDialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="gameRulesCloseButton" onClick={() => setNodeInspector(null)} aria-label="Close node details">
              ×
            </button>
            <div className="gameInspectorHero">
              <EntityArtwork
                type={nodeInspector.node.type}
                label={nodeInspector.node.label}
                imageUrl={nodeInspector.node.imageUrl}
                className="gameInspectorArtwork"
                imageClassName="gameInspectorArtworkImage"
                placeholderClassName="gameInspectorArtworkEmoji"
              />
              <div className="gameInspectorHeader">
                <div className="gameInspectorType">{nodeInspector.node.type === "actor" ? "Actor" : "Movie"}</div>
                <h2 className="gameInspectorTitle">{nodeInspector.node.label}</h2>
                <div className="gameInspectorMeta">
                  {nodeInspector.detailLines.map((line) => (
                    <span key={line} className="gameInspectorMetaPill">{line}</span>
                  ))}
                  {nodeInspector.node.type === "movie"
                    ? getMovieBadges({
                        genres: nodeInspector.node.genres ?? [],
                        contentRating: null,
                        originalLanguage: null,
                      }).slice(0, 2).map((badge) => (
                        <span key={badge} className="gameInspectorMetaPill gameInspectorMetaPill--muted">{badge}</span>
                      ))
                    : null}
                </div>
              </div>
            </div>

            {nodeInspector.description ? <p className="gameInspectorDescription">{nodeInspector.description}</p> : null}

            <div className="gameInspectorSectionTitle">{nodeInspector.relatedTitle}</div>
            {nodeInspector.isLoading ? <div className="gameInspectorEmpty">Loading details…</div> : null}
            {!nodeInspector.isLoading && nodeInspector.errorMessage ? <div className="gameInspectorEmpty">{nodeInspector.errorMessage}</div> : null}
            {!nodeInspector.isLoading && !nodeInspector.errorMessage ? (
              nodeInspector.relatedNodes.length > 0 ? (
                <div className="gameInspectorList">
                  {nodeInspector.relatedNodes.map((relatedNode, index) => (
                    <button
                      key={`${relatedNode.type}-${relatedNode.id ?? relatedNode.label}-${index}`}
                      type="button"
                      className="gameInspectorListItem"
                      onClick={() => {
                        void handleInspectNode(relatedNode);
                      }}
                    >
                      <EntityArtwork
                        type={relatedNode.type}
                        label={relatedNode.label}
                        imageUrl={relatedNode.imageUrl}
                        className="gameInspectorListArtwork"
                        imageClassName="gameInspectorArtworkImage"
                        placeholderClassName="gameInspectorListArtworkEmoji"
                      />
                      <span className="gameInspectorListText">
                        <span className="gameInspectorListTitle">{relatedNode.label}</span>
                        <span className="gameInspectorListMeta">{formatGameNodeMeta(relatedNode)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="gameInspectorEmpty">No related entries were available for this node.</div>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GamePage;