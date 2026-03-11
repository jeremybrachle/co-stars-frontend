import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  getApiBaseUrl,
  validatePath,
} from "../api/costars";
import {
  buildSuggestionSet,
  combineMeetingPath,
  isDirectConnectionSuggestion,
  isSameNode,
  MAX_PATH_LENGTH,
  nodeFromSummary,
  OPTIMAL_PATH_INCLUSION_RATE,
} from "../gameplay";
import { useDataSourceMode } from "../context/DataSourceModeContext";
import { useSnapshotData } from "../context/SnapshotDataContext";
import { getSnapshotBaseUrl } from "../data/frontendSnapshot";
import {
  createGameNodeFromSummary,
  findNodeByLabel,
  generateLocalPath,
  getActorsForMovie,
  getMoviesForActor,
  validateLocalPath,
} from "../data/localGraph";
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
};

type GamePageRouteState = {
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

function createNode(label: string, type: NodeType, partial?: Partial<GameNode>): GameNode {
  return {
    label,
    type,
    ...partial,
  };
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
  });
}

function createNodeFromMovie(movie: Movie): GameNode {
  return createNode(movie.title, "movie", {
    id: movie.id,
    releaseDate: movie.releaseDate,
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

function formatPathPreview(path: GameNode[]) {
  return path.map((node) => node.label).join(" → ");
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
  const { mode } = useDataSourceMode();

  const [actorA, setActorA] = useState<GameNode | null>(null);
  const [actorB, setActorB] = useState<GameNode | null>(null);
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

  const canUseSnapshot = !!snapshot && !!indexes;
  const effectiveDataSource: EffectiveDataSource = mode === "api" ? "api" : canUseSnapshot ? "snapshot" : "api";
  const fallbackMessage = mode !== "api" && effectiveDataSource === "api" && !isSnapshotLoading
    ? `Local snapshot data is unavailable, so Game Mode is using live API data from ${getApiBaseUrl()}.`
    : null;

  useEffect(() => {
    let isMounted = true;

    const loadGameSetup = async () => {
      setIsSetupLoading(true);
      setSetupError(null);
      setSuggestionError(null);
      setCompletion(null);
      setSuggestions([]);
      setTopPath([]);
      setBottomPath([]);
      setSelectedSide("top");
      setLockedSide(null);
      setTurns(0);
      setRewinds(0);
      setShuffles(0);
      setShuffleSeed(0);

      try {
        let resolvedActorA: GameNode;
        let resolvedActorB: GameNode;
        let resolvedOptimalHops = routeState?.optimalHops ?? null;
        let resolvedOptimalPath = routeState?.optimalPath?.map(nodeFromSummary) ?? [];

        if (effectiveDataSource === "snapshot") {
      if (!snapshot || !indexes) {
        return;
      }

      resolvedActorA = resolveRouteNode(
        routeState?.startA ?? routeState?.movieA ?? routeState?.actorA,
        routeState?.movieA ? "movie" : "actor",
        "George Clooney",
        indexes,
      );
      resolvedActorB = resolveRouteNode(
        routeState?.startB ?? routeState?.movieB ?? routeState?.actorB,
        routeState?.movieB ? "movie" : "actor",
        "Tobey Maguire",
        indexes,
      );

      if (resolvedOptimalPath.length === 0 || resolvedOptimalHops === null) {
        const startSummary = toNodeSummary(resolvedActorA);
        const targetSummary = toNodeSummary(resolvedActorB);

        if (startSummary && targetSummary) {
          const generatedPath = generateLocalPath(startSummary, targetSummary, indexes);
          resolvedOptimalHops = generatedPath.reason ? null : generatedPath.steps;
          resolvedOptimalPath = generatedPath.reason ? [] : generatedPath.nodes.map(nodeFromSummary);
        }
      }
    } else {
      const [actors, movies] = await Promise.all([fetchActors(), fetchMovies()]);
      resolvedActorA = await resolveApiRouteNode(
        routeState?.startA ?? routeState?.movieA ?? routeState?.actorA,
        routeState?.movieA ? "movie" : "actor",
        "George Clooney",
        actors,
        movies,
      );
      resolvedActorB = await resolveApiRouteNode(
        routeState?.startB ?? routeState?.movieB ?? routeState?.actorB,
        routeState?.movieB ? "movie" : "actor",
        "Tobey Maguire",
        actors,
        movies,
      );

      setMoviesCatalog(movies);

      if (resolvedOptimalPath.length === 0 || resolvedOptimalHops === null) {
        const generatedPath = await generatePath(toPathEndpoint(resolvedActorA), toPathEndpoint(resolvedActorB));
        resolvedOptimalHops = generatedPath.reason ? null : generatedPath.steps;
        resolvedOptimalPath = generatedPath.reason ? [] : generatedPath.nodes.map(nodeFromSummary);
      }
    }

        if (!isMounted) {
          return;
        }

        setActorA(resolvedActorA);
        setActorB(resolvedActorB);
        setOptimalHops(resolvedOptimalHops);
        setOptimalPath(resolvedOptimalPath);
      } catch (error) {
        if (isMounted) {
          setSetupError(error instanceof Error ? error.message : "Failed to initialize the game.");
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
  }, [effectiveDataSource, indexes, routeState?.actorA, routeState?.actorB, routeState?.movieA, routeState?.movieB, routeState?.optimalHops, routeState?.optimalPath, routeState?.startA, routeState?.startB, snapshot]);

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

  const isInteractionDisabled = isPathLimitReached || isSetupLoading || (effectiveDataSource === "snapshot" && isSnapshotLoading) || !!completion;

  useEffect(() => {
    if (!actorA || !actorB || !currentSelection || !targetNode || completion) {
      return;
    }

    setIsSuggestionsLoading(true);
    setSuggestionError(null);

    const loadSuggestions = async () => {
    try {
      let weightedSuggestions: GameNode[] = [];

      if (effectiveDataSource === "snapshot") {
        if (!indexes) {
          return;
        }

        const targetSummary = toNodeSummary(targetNode);

        if (!targetSummary) {
          setSuggestionError(`Missing target id for ${targetNode.label}.`);
          setSuggestions([]);
          return;
        }

        let localSuggestions: GameNode[] = [];

        if (currentSelection.type === "actor") {
          if (currentSelection.id === undefined) {
            setSuggestionError(`Missing actor id for ${currentSelection.label}.`);
            setSuggestions([]);
            return;
          }

          localSuggestions = getMoviesForActor(currentSelection.id, targetSummary, indexes);
        } else {
          if (currentSelection.id === undefined) {
            setSuggestionError(`Missing movie id for ${currentSelection.label}.`);
            setSuggestions([]);
            return;
          }

          const excludedNames = buildExcludedActorNames(actorA, actorB, topPath, bottomPath, targetNode);
          localSuggestions = getActorsForMovie(currentSelection.id, excludedNames, targetSummary, indexes);
        }

        weightedSuggestions = buildSuggestionSet(localSuggestions, targetNode);
        if (weightedSuggestions.length === 0) {
          setSuggestionError("No local suggestions were returned for this node.");
        }
      } else {
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
              pathHint: movie.pathHint,
            })),
            targetNode,
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
              pathHint: actor.pathHint,
              popularityRank: actor.popularityRank,
            })),
            targetNode,
          );
        }

        if (weightedSuggestions.length === 0) {
          setSuggestionError("No API suggestions were returned for this node.");
        }
      }

      setSuggestions(weightedSuggestions);
    } catch (error) {
      setSuggestions([]);
      setSuggestionError(error instanceof Error ? error.message : `Failed to load ${effectiveDataSource} suggestions.`);
    } finally {
      setIsSuggestionsLoading(false);
    }
  };

  void loadSuggestions();
  }, [actorA, actorB, bottomPath, completion, currentSelection, effectiveDataSource, indexes, shuffleSeed, targetNode, topPath]);

  const finalizeCompletion = async (fullPath: GameNode[], winningSide: SelectedSide, source: string) => {
    const provisionalCompletion: CompletionState = {
      fullPath,
      usedHops: fullPath.length - 1,
      winningSide,
      source,
      isValidated: null,
    };

    setCompletion(provisionalCompletion);

    try {
      const validation = effectiveDataSource === "snapshot"
			? (() => {
				if (!indexes) {
					throw new Error("Local snapshot indexes are not ready.");
				}

				return validateLocalPath(fullPath, indexes);
			})()
			: await validatePath(fullPath.map((node) => node.label));

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
  };

  const handleShuffle = () => {
    if (completion) {
      return;
    }

    setShuffles((count) => count + 1);
    setShuffleSeed((currentSeed) => currentSeed + 1);
  };

  const handleWriteIn = async (value: string, type: NodeType) => {
    setSuggestionError(null);

    try {
      if (effectiveDataSource === "snapshot") {
      if (type === "actor") {
        if (!indexes) {
          setSuggestionError("Snapshot indexes are not ready yet.");
          return;
        }

        const actor = findNodeByLabel(value, "actor", indexes);
        if (!actor) {
          setSuggestionError(`No actor named "${value}" was found in the local snapshot.`);
          return;
        }

        await handleSuggestion(createGameNodeFromSummary(actor, indexes));
        return;
      }

      if (!indexes) {
        setSuggestionError("Snapshot indexes are not ready yet.");
        return;
      }

      const movie = findNodeByLabel(value, "movie", indexes);
      if (!movie) {
        setSuggestionError(`No movie named "${value}" was found in the local snapshot.`);
        return;
      }

      await handleSuggestion(createGameNodeFromSummary(movie, indexes));
      return;
    }

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
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : "The write-in value could not be resolved.");
    }
  };

  const completionPreviewPath = completion?.fullPath ?? optimalPath;

  return (
    <div className="gamePage">
      <div className="topBar">
        <div className="topBarSide topBarSideLeft">
          <button className="backButton" style={{ fontSize: "1.3em", padding: "0.5em 1.2em" }} onClick={() => navigate("/adventure")}>
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
          onRemoveTopPathItem={handleRemoveTopPathItem}
          onRemoveBottomPathItem={handleRemoveBottomPathItem}
        />
        <div className="gameSidebar">
          <div className={`gameSidebarWarning${isPathLimitReached ? " gameSidebarWarning--visible" : ""}`}>
            Max path length reached. Try again and keep it under 19 total placed selections, or rewind a branch to continue.
          </div>

          {fallbackMessage ? <div className="gamePageStatus">{fallbackMessage}</div> : null}
          <div className="gamePageStatus">{effectiveDataSource === "snapshot" ? `Using local snapshot data from ${getSnapshotBaseUrl()}.` : `Using live API data from ${getApiBaseUrl()}.`}</div>
          {setupError || (effectiveDataSource === "snapshot" ? snapshotError : null) ? <div className="gamePageStatus gamePageStatus--error">{setupError ?? snapshotError}</div> : null}

          <GameRightPanel
            actorA={actorA ?? createNode("Loading…", "actor")}
            actorB={actorB ?? createNode("Loading…", "actor")}
            selectedSide={selectedSide}
            currentSelection={currentSelection ?? createNode("Loading…", "actor")}
            suggestions={suggestions}
            turns={turns}
            rewinds={rewinds}
            shuffles={shuffles}
            optimalHops={optimalHops}
            currentHops={currentHops}
            isDisabled={isInteractionDisabled}
            isLoading={isSuggestionsLoading}
            errorMessage={suggestionError}
            onBack={handleBackCurrentPathItem}
            onSuggestion={(choice) => {
              void handleSuggestion(choice);
            }}
            onWriteIn={handleWriteIn}
            onSelectSide={setSelectedSide}
            onReverse={handleReverseSides}
            onShuffle={handleShuffle}
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
              {effectiveDataSource === "snapshot"
				? `The frontend is currently playing from a locally cached graph snapshot sourced from ${getSnapshotBaseUrl()}. Each turn alternates actor → movie → actor until a valid path connects the two endpoints.`
				: `The frontend is currently using live API calls against ${getApiBaseUrl()}. Each turn alternates actor → movie → actor until a valid path connects the two endpoints.`}
            </p>
            <p className="gameRulesText">
              {effectiveDataSource === "snapshot"
				? "Suggestion lists are generated from cached actor, movie, and adjacency data stored in the browser. Actor lists are biased by popularity, movie lists are biased by shortest-path metadata and recency, and the shuffle button rerolls that weighted pool locally."
				: "Suggestion lists are generated by the backend API for the current node. Actor lists are biased by popularity, movie lists are biased by shortest-path metadata and recency, and the shuffle button rerolls that weighted pool after each request."}
            </p>
            <p className="gameRulesText">
              A best-path option has a {Math.round(OPTIMAL_PATH_INCLUSION_RATE * 100)}% chance to appear in each reroll when no direct connection is available. If a suggestion can immediately reveal the target on the next alternating node, it is always highlighted as Connection found.
            </p>
            <p className="gameRulesText">
              {effectiveDataSource === "snapshot"
				? "Optimal hops are computed locally from the snapshot before the round starts. Your current placed hops and the optimal count stay visible so you can compare your route against the shortest known solution."
				: "Optimal hops are fetched from the backend before the round starts. Your current placed hops and the optimal count stay visible so you can compare your route against the shortest known solution."}
            </p>
          </div>
        </div>
      ) : null}

      {completion ? (
        <div className="gameCompletionOverlay" onClick={() => setCompletion(null)}>
          <div className="gameCompletionDialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="gameRulesCloseButton" onClick={() => setCompletion(null)} aria-label="Close completion dialog">
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
                  <div key={`${node.type}-${node.label}-${index}`} className="gameCompletionTrackSegment">
                    <span className={`gameCompletionChip gameCompletionChip--${node.type}`}>{node.label}</span>
                    {index < completionPreviewPath.length - 1 ? <span className="gameCompletionArrow">→</span> : null}
                  </div>
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
    </div>
  );
}

export default GamePage;