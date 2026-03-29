import { useMemo, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import EntityDetailsDialog, {
  type EntityDetailsDialogData,
  type EntityDetailsHistoryEntry,
  type EntityDetailsRelatedEntity,
} from "../components/EntityDetailsDialog";
import GameFilterSettingsDialog from "../components/GameFilterSettingsDialog";
import LevelPreviewDialog from "../components/LevelPreviewDialog";
import EntityArtwork from "../components/EntityArtwork";
import PageNavigationHeader from "../components/PageNavigationHeader";
import WriteInAutosuggestField from "../components/game/WriteInAutosuggestField";
import { useGameSettings } from "../context/gameSettings";
import { useSnapshotData } from "../context/snapshotData";
import {
  buildCatalogDetailDialogData,
  createActorRelations,
  createMovieRelations,
  type CatalogDetailEntry,
} from "../data/catalogEntityDetails";
import { getDemoSnapshotBundle } from "../data/demoSnapshot";
import { getActorFilterCountSummary, getMovieFilterCountSummary } from "../data/filterCounts";
import { createGameNodeFromSummary } from "../data/localGraph";
import type { GameDataFilters, GameNode, NodeSummary, NodeType, SnapshotIndexes } from "../types";
import { getReleaseYear } from "../utils/gameCompletionMetrics";
import { buildCustomLevelRoutePreview, createPreviewPathNodes } from "../utils/customLevelPreview";
import {
  MAX_PLAYER_CUSTOM_LEVELS,
  readPlayerCustomLevels,
  savePlayerCustomLevel,
  subscribeToPlayerCustomLevels,
  type CustomLevelDraft,
  type PlayerCustomLevel,
} from "../utils/customLevelsStorage";
import { resolveWriteInOption } from "../utils/writeInOptions";
import "./CustomLevelPage.css";

type QuickPlayPageRouteState = {
  draftLevel?: CustomLevelDraft | null;
};

type QuickPlayFormState = {
  sourceKey: string;
  startType: NodeType;
  targetType: NodeType;
  startQuery: string;
  targetQuery: string;
  startNode: NodeSummary | null;
  targetNode: NodeSummary | null;
  actorPopularityCutoff: number | null;
  releaseYearCutoff: number | null;
};

function buildNodePool(indexes: SnapshotIndexes, type: NodeType) {
  if (type === "actor") {
    return Array.from(indexes.actorsById.values())
      .map((actor) => createGameNodeFromSummary({ id: actor.id, type: "actor", label: actor.name }, indexes))
      .sort((left, right) => left.label.localeCompare(right.label));
  }

  return Array.from(indexes.moviesById.values())
    .map((movie) => createGameNodeFromSummary({ id: movie.id, type: "movie", label: movie.title }, indexes))
    .sort((left, right) => left.label.localeCompare(right.label));
}


function createFormStateFromDraft(sourceKey: string, level: CustomLevelDraft): QuickPlayFormState {
  return {
    sourceKey,
    startType: level.startNode.type,
    targetType: level.targetNode.type,
    startQuery: level.startNode.label,
    targetQuery: level.targetNode.label,
    startNode: level.startNode,
    targetNode: level.targetNode,
    actorPopularityCutoff: level.actorPopularityCutoff,
    releaseYearCutoff: level.releaseYearCutoff,
  };
}

function createDefaultFormState(
  sourceKey: string,
  actorPopularityCutoff: number | null,
  releaseYearCutoff: number | null,
): QuickPlayFormState {
  return {
    sourceKey,
    startType: "actor",
    targetType: "actor",
    startQuery: "",
    targetQuery: "",
    startNode: null,
    targetNode: null,
    actorPopularityCutoff,
    releaseYearCutoff,
  };
}

function isNodeAllowedByFilters(node: GameNode, filters: GameDataFilters) {
  if (node.type === "actor") {
    return filters.actorPopularityCutoff === null
      || (node.popularity ?? Number.NEGATIVE_INFINITY) >= filters.actorPopularityCutoff;
  }

  if (filters.releaseYearCutoff === null) {
    return true;
  }

  const releaseYear = getReleaseYear(node.releaseDate ?? null);
  return releaseYear !== null && releaseYear >= filters.releaseYearCutoff;
}

function formatPairingLabel(startType: NodeType, targetType: NodeType) {
  const startLabel = startType === "actor" ? "Actor" : "Movie";
  const targetLabel = targetType === "actor" ? "Actor" : "Movie";
  return `${startLabel} vs. ${targetLabel}`;
}

function formatFilterSummary(filters: Pick<GameDataFilters, "actorPopularityCutoff" | "releaseYearCutoff">) {
  const actorCutoff = filters.actorPopularityCutoff === null ? "no actor cutoff" : `actor >= ${filters.actorPopularityCutoff}`;
  const yearCutoff = filters.releaseYearCutoff === null ? "no year cutoff" : `year >= ${filters.releaseYearCutoff}`;
  return `${actorCutoff} • ${yearCutoff}`;
}

function getCatalogDetailEntry(node: NodeSummary, indexes: SnapshotIndexes): CatalogDetailEntry | null {
  if (node.type === "actor") {
    const actor = indexes.actorsById.get(node.id);
    return actor ? { type: "actor", item: actor } : null;
  }

  const movie = indexes.moviesById.get(node.id);
  return movie ? { type: "movie", item: movie } : null;
}

function isSameNodeSummary(left: NodeSummary, right: NodeSummary) {
  return left.id === right.id && left.type === right.type && left.label === right.label;
}

function isSameNodePath(left: NodeSummary[], right: NodeSummary[]) {
  return left.length === right.length && left.every((node, index) => isSameNodeSummary(node, right[index]!));
}

function isSameCustomLevelDraft(left: CustomLevelDraft, right: CustomLevelDraft) {
  return isSameNodeSummary(left.startNode, right.startNode)
    && isSameNodeSummary(left.targetNode, right.targetNode)
    && left.actorPopularityCutoff === right.actorPopularityCutoff
    && left.releaseYearCutoff === right.releaseYearCutoff
    && left.optimalHops === right.optimalHops
    && isSameNodePath(left.optimalPath, right.optimalPath);
}

function CustomLevelPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const routeState = (location.state as QuickPlayPageRouteState | null) ?? null;
  const editingLevelId = searchParams.get("levelId")?.trim() ?? "";
  const { indexes } = useSnapshotData();
  const demoBundle = getDemoSnapshotBundle();
  const previewIndexes = indexes ?? demoBundle.indexes;
  const isUsingDemoFallback = !indexes;
  const { settings, setActorPopularityCutoff, setReleaseYearCutoff } = useGameSettings();
  const playerLevels = useSyncExternalStore(subscribeToPlayerCustomLevels, readPlayerCustomLevels, readPlayerCustomLevels);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [detailTrail, setDetailTrail] = useState<CatalogDetailEntry[]>([]);
  const [detailRelationSearch, setDetailRelationSearch] = useState("");

  const storedEditingLevel = useMemo<PlayerCustomLevel | null>(
    () => editingLevelId ? playerLevels.find((level) => level.id === editingLevelId) ?? null : null,
    [editingLevelId, playerLevels],
  );
  const draftLevel = routeState?.draftLevel ?? null;
  const initialFormState = (() => {
    if (editingLevelId && storedEditingLevel) {
      return createFormStateFromDraft(`edit:${storedEditingLevel.id}:${storedEditingLevel.updatedAt}`, storedEditingLevel);
    }

    if (!editingLevelId && draftLevel) {
      return createFormStateFromDraft(
        [
          "route",
          draftLevel.startNode.type,
          draftLevel.startNode.id,
          draftLevel.targetNode.type,
          draftLevel.targetNode.id,
        ].join(":"),
        draftLevel,
      );
    }

    return createDefaultFormState(
      editingLevelId ? `missing:${editingLevelId}` : "default",
      settings.dataFilters.actorPopularityCutoff,
      settings.dataFilters.releaseYearCutoff,
    );
  })();
  const [formState, setFormState] = useState<QuickPlayFormState>(() => initialFormState);
  const effectiveFormState = formState.sourceKey === initialFormState.sourceKey ? formState : initialFormState;

  const startType = effectiveFormState.startType;
  const targetType = effectiveFormState.targetType;
  const startQuery = effectiveFormState.startQuery;
  const targetQuery = effectiveFormState.targetQuery;
  const startNode = effectiveFormState.startNode;
  const targetNode = effectiveFormState.targetNode;
  const dataFilters = useMemo(
    () => ({
      ...settings.dataFilters,
      actorPopularityCutoff: effectiveFormState.actorPopularityCutoff,
      releaseYearCutoff: effectiveFormState.releaseYearCutoff,
    }),
    [effectiveFormState.actorPopularityCutoff, effectiveFormState.releaseYearCutoff, settings.dataFilters],
  );

  const updateFormState = (updater: (current: QuickPlayFormState) => QuickPlayFormState) => {
    setFormState((current) => {
      const baseState = current.sourceKey === initialFormState.sourceKey ? current : initialFormState;
      return updater(baseState);
    });
  };

  const actorOptions = useMemo(() => buildNodePool(previewIndexes, "actor"), [previewIndexes]);
  const movieOptions = useMemo(() => buildNodePool(previewIndexes, "movie"), [previewIndexes]);
  const startOptions = startType === "actor" ? actorOptions : movieOptions;
  const targetOptions = targetType === "actor" ? actorOptions : movieOptions;
  const actorCountSummary = useMemo(
    () => getActorFilterCountSummary(previewIndexes.actorsById.values(), dataFilters.actorPopularityCutoff),
    [dataFilters.actorPopularityCutoff, previewIndexes],
  );
  const movieCountSummary = useMemo(
    () => getMovieFilterCountSummary(previewIndexes.moviesById.values(), dataFilters.releaseYearCutoff),
    [dataFilters.releaseYearCutoff, previewIndexes],
  );
  const preview = useMemo(
    () => buildCustomLevelRoutePreview(startNode, targetNode, previewIndexes, dataFilters),
    [dataFilters, previewIndexes, startNode, targetNode],
  );
  const isEditingStoredLevel = Boolean(editingLevelId && storedEditingLevel);
  const isAtPlayerLevelLimit = !editingLevelId && playerLevels.length >= MAX_PLAYER_CUSTOM_LEVELS;
  const currentDraft = startNode && targetNode ? {
    startNode,
    targetNode,
    actorPopularityCutoff: dataFilters.actorPopularityCutoff,
    releaseYearCutoff: dataFilters.releaseYearCutoff,
    optimalHops: preview.steps,
    optimalPath: preview.path,
  } satisfies CustomLevelDraft : null;
  const matchingSavedLevel = useMemo(
    () => currentDraft ? playerLevels.find((level) => isSameCustomLevelDraft(level, currentDraft)) ?? null : null,
    [currentDraft, playerLevels],
  );
  const pairingLabel = formatPairingLabel(startType, targetType);
  const isSelectionValid = preview.status === "ready" && currentDraft !== null;
  const isSelectionAlreadySaved = Boolean(currentDraft && matchingSavedLevel);
  const saveDisabledReason = isAtPlayerLevelLimit
    ? "The archive is full. Delete an existing player level before saving another."
    : isSelectionAlreadySaved
      ? "This level is already saved. Change the nodes or filter cutoffs before saving again."
      : null;
  const isSaveDisabled = saveDisabledReason !== null;
  const saveButtonTitle = isAtPlayerLevelLimit
    ? saveDisabledReason
    : editingLevelId ? "Update saved level" : "Save to archive";
  const hasAnySelection = Boolean(startNode || targetNode || startQuery || targetQuery);
  const startDisplayNode = useMemo(
    () => startNode ? createGameNodeFromSummary(startNode, previewIndexes) : null,
    [previewIndexes, startNode],
  );
  const targetDisplayNode = useMemo(
    () => targetNode ? createGameNodeFromSummary(targetNode, previewIndexes) : null,
    [previewIndexes, targetNode],
  );
  const previewPathNodes = useMemo(
    () => createPreviewPathNodes(preview.path, previewIndexes),
    [preview.path, previewIndexes],
  );
  const activeDetail = detailTrail.length > 0 ? detailTrail[detailTrail.length - 1] : null;
  const detailRelatedEntities = useMemo<EntityDetailsRelatedEntity[]>(() => {
    if (!activeDetail) {
      return [];
    }

    return activeDetail.type === "actor"
      ? createActorRelations(activeDetail.item, previewIndexes)
      : createMovieRelations(activeDetail.item, previewIndexes);
  }, [activeDetail, previewIndexes]);
  const detailDialogData = useMemo<EntityDetailsDialogData | null>(
    () => (activeDetail ? buildCatalogDetailDialogData(activeDetail, detailRelatedEntities.length) : null),
    [activeDetail, detailRelatedEntities.length],
  );
  const detailHistory = useMemo<EntityDetailsHistoryEntry[]>(
    () => detailTrail.map((entry) => ({
      key: `${entry.type}-${entry.item.id}`,
      type: entry.type,
      label: entry.type === "actor" ? entry.item.name : entry.item.title,
    })),
    [detailTrail],
  );

  const openEntityDetails = (node: NodeSummary | null) => {
    if (!node) {
      return;
    }

    const entry = getCatalogDetailEntry(node, previewIndexes);
    if (!entry) {
      return;
    }

    setDetailTrail([entry]);
    setDetailRelationSearch("");
  };

  const handleOpenRelatedEntity = (entity: EntityDetailsRelatedEntity) => {
    const entry = getCatalogDetailEntry({ id: entity.id, type: entity.type, label: entity.label }, previewIndexes);
    if (!entry) {
      return;
    }

    setDetailTrail((current) => [...current, entry]);
    setDetailRelationSearch("");
  };

  const handleNavigateDetailHistory = (index: number) => {
    setDetailTrail((current) => current.slice(0, index + 1));
    setDetailRelationSearch("");
  };

  const applySuggestion = (field: "start" | "target", suggestion: GameNode) => {
    if (suggestion.id === undefined) {
      return;
    }

    const nextNode: NodeSummary = {
      id: suggestion.id,
      type: suggestion.type,
      label: suggestion.label,
    };

    if (field === "start") {
      updateFormState((current) => ({
        ...current,
        startQuery: suggestion.label,
        startNode: nextNode,
      }));
      return;
    }

    updateFormState((current) => ({
      ...current,
      targetQuery: suggestion.label,
      targetNode: nextNode,
    }));
  };

  const randomizeSingleSelection = (field: "start" | "target") => {
    const currentOptions = (field === "start" ? startOptions : targetOptions)
      .filter((option) => isNodeAllowedByFilters(option, dataFilters));
    const oppositeNode = field === "start" ? targetNode : startNode;
    const maxAttempts = Math.min(160, currentOptions.length || 1);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = currentOptions[Math.floor(Math.random() * currentOptions.length)];
      if (!candidate || candidate.id === undefined) {
        continue;
      }

      const candidateNode: NodeSummary = {
        id: candidate.id,
        type: candidate.type,
        label: candidate.label,
      };

      if (oppositeNode) {
        const nextPreview = field === "start"
          ? buildCustomLevelRoutePreview(candidateNode, oppositeNode, previewIndexes, dataFilters)
          : buildCustomLevelRoutePreview(oppositeNode, candidateNode, previewIndexes, dataFilters);
        if (nextPreview.status !== "ready") {
          continue;
        }
      }

      applySuggestion(field, candidate);
      return;
    }
  };

  const randomizePairSelection = () => {
    const eligibleStartOptions = startOptions.filter((option) => isNodeAllowedByFilters(option, dataFilters));
    const eligibleTargetOptions = targetOptions.filter((option) => isNodeAllowedByFilters(option, dataFilters));
    const maxAttempts = Math.min(320, Math.max(eligibleStartOptions.length * 2, eligibleTargetOptions.length * 2, 40));

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const startCandidate = eligibleStartOptions[Math.floor(Math.random() * eligibleStartOptions.length)];
      const targetCandidate = eligibleTargetOptions[Math.floor(Math.random() * eligibleTargetOptions.length)];
      if (!startCandidate || !targetCandidate || startCandidate.id === undefined || targetCandidate.id === undefined) {
        continue;
      }

      const nextStartNode: NodeSummary = {
        id: startCandidate.id,
        type: startCandidate.type,
        label: startCandidate.label,
      };
      const nextTargetNode: NodeSummary = {
        id: targetCandidate.id,
        type: targetCandidate.type,
        label: targetCandidate.label,
      };

      if (nextStartNode.id === nextTargetNode.id && nextStartNode.type === nextTargetNode.type) {
        continue;
      }

      const nextPreview = buildCustomLevelRoutePreview(nextStartNode, nextTargetNode, previewIndexes, dataFilters);
      if (nextPreview.status !== "ready") {
        continue;
      }

      updateFormState((current) => ({
        ...current,
        startQuery: startCandidate.label,
        targetQuery: targetCandidate.label,
        startNode: nextStartNode,
        targetNode: nextTargetNode,
      }));
      return;
    }
  };

  const resolveTypedSelection = (field: "start" | "target") => {
    const options = field === "start" ? startOptions : targetOptions;
    const query = field === "start" ? startQuery : targetQuery;
    const resolved = resolveWriteInOption(query, options, true);
    if (!resolved || resolved.id === undefined) {
      return;
    }

    applySuggestion(field, resolved);
  };

  const handleSave = () => {
    if (!currentDraft || preview.status !== "ready" || isSelectionAlreadySaved) {
      return;
    }

    try {
      savePlayerCustomLevel(
        {
          ...currentDraft,
          savedFrom: isEditingStoredLevel ? "archive" : "quick-play",
        },
        isEditingStoredLevel ? editingLevelId : null,
      );
    } catch {
      return;
    }
  };

  const handleStartGame = () => {
    if (!currentDraft || preview.status !== "ready") {
      return;
    }

    setActorPopularityCutoff(currentDraft.actorPopularityCutoff);
    setReleaseYearCutoff(currentDraft.releaseYearCutoff);

    navigate("/game", {
      state: {
        returnTo: "/quick-play",
        startA: currentDraft.startNode,
        startB: currentDraft.targetNode,
        optimalHops: currentDraft.optimalHops,
        optimalPath: currentDraft.optimalPath,
        customLevelId: editingLevelId || null,
        customLevelDraft: currentDraft,
      },
    });
  };

  const handleOpenPreview = () => {
    if (!isSelectionValid) {
      return;
    }

    setIsPreviewDialogOpen(true);
  };

  const handleClearSelections = () => {
    updateFormState((current) => ({
      ...current,
      startQuery: "",
      targetQuery: "",
      startNode: null,
      targetNode: null,
    }));
    setIsPreviewDialogOpen(false);
  };

  return (
    <div className="settingsPage quickPlayWorkspace quickPlayPage">
      <PageNavigationHeader backTo="/play-now" backLabel="Back" />
      <div className="settingsPanel quickPlayPanel">
        <div className="quickPlayPanelHeader">
          <div className="quickPlayPanelHeaderTop">
            <div>
              <div className="pageEyebrow">Play Now</div>
              <h1>Quick Play</h1>
            </div>
            <div className="quickPlayPanelHeaderActions quickPlayPanelHeaderActions--stacked">
              <Link to="/level-archive" className="settingsActionButton quickPlayArchiveCreateButton">Open Archive</Link>
              <div className="quickPlayToolbarStatus quickPlayToolbarStatus--header">{playerLevels.length}/{MAX_PLAYER_CUSTOM_LEVELS} archive slots used</div>
            </div>
          </div>
          <p className="pageLead">Build a single custom matchup, validate it against the active filter cutoffs, and launch it into the normal game board. Saved levels stay in this browser and can be reopened from the archive later.</p>
          {isUsingDemoFallback ? (
            <p className="pageStatus">Full snapshot data is not loaded yet, so quick play is previewing against the built-in demo catalog for now.</p>
          ) : null}
        </div>

        <div className="settingsPanelScrollArea quickPlayPanelScrollArea">
          <section className="quickPlaySection quickPlaySection--creator">
            <div className="quickPlaySectionHeader">
              <div>
                <h2>Level Creator</h2>
                <p className="settingsHint">Choose the endpoint types first, then type or randomize the actual start and target nodes.</p>
              </div>
              <div className="quickPlayCreatorHeaderActions">
                <button
                  type="button"
                  className="quickPlayIconButton quickPlayIconButton--filter"
                  onClick={() => setIsFilterDialogOpen(true)}
                  aria-label="Open data filters"
                  title="Open data filters"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="quickPlayIconGlyph">
                    <path d="M3.5 5.5h17l-6.8 7.6v4.7l-3.4 1.7v-6.4L3.5 5.5z" fill="currentColor" />
                  </svg>
                  <span>Filters</span>
                </button>
                <button
                  type="button"
                  className="quickPlayIconButton quickPlayIconButton--shuffle"
                  onClick={randomizePairSelection}
                  aria-label="Randomize both endpoints"
                  title="Randomize both endpoints"
                >
                  <span className="quickPlayIconEmoji" aria-hidden="true">⟳</span>
                  <span>Randomize</span>
                </button>
                {isSelectionValid ? (
                  <span
                    className={`quickPlayIconButtonTooltipWrap${saveDisabledReason ? " quickPlayIconButtonTooltipWrap--disabled" : ""}`}
                    data-tooltip={saveDisabledReason ?? undefined}
                  >
                    <button
                      type="button"
                      className="quickPlayIconButton quickPlayIconButton--save"
                      onClick={handleSave}
                      disabled={isSaveDisabled}
                      aria-label={editingLevelId ? "Update saved level" : "Save to archive"}
                      title={isAtPlayerLevelLimit ? undefined : saveButtonTitle ?? undefined}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="quickPlayIconGlyph">
                        <path
                          d="M6 4.75h9.5L18.75 8v11.25H6z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9 4.75v5.5h5.5v-5.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9 18h6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>Save</span>
                    </button>
                  </span>
                ) : null}
                {hasAnySelection ? (
                  <button
                    type="button"
                    className="quickPlayIconButton"
                    onClick={handleClearSelections}
                    aria-label="Clear current selections"
                    title="Clear current selections"
                  >
                    <span className="quickPlayIconEmoji" aria-hidden="true">🗑</span>
                    <span>Clear</span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="quickPlayTypeGrid">
              <label className="formField quickPlayTypeField">
                <span>Starting node type</span>
                <select
                  value={startType}
                  onChange={(event) => {
                    const nextType = event.target.value as NodeType;
                    updateFormState((current) => ({
                      ...current,
                      startType: nextType,
                      startQuery: "",
                      startNode: null,
                    }));
                  }}
                >
                  <option value="actor">Actor</option>
                  <option value="movie">Movie</option>
                </select>
              </label>
              <label className="formField quickPlayTypeField">
                <span>Target node type</span>
                <select
                  value={targetType}
                  onChange={(event) => {
                    const nextType = event.target.value as NodeType;
                    updateFormState((current) => ({
                      ...current,
                      targetType: nextType,
                      targetQuery: "",
                      targetNode: null,
                    }));
                  }}
                >
                  <option value="actor">Actor</option>
                  <option value="movie">Movie</option>
                </select>
              </label>
            </div>

            <div className="quickPlayInputGrid">
              <div className="quickPlayInputCard">
                <div className="quickPlayInputLabel">Starting node</div>
                <div className="quickPlayInputControlRow">
                  <div className="quickPlayInputFieldWrap">
                    <WriteInAutosuggestField
                      value={startQuery}
                      placeholder={startType === "actor" ? "Start typing an actor" : "Start typing a movie"}
                      suggestions={startOptions}
                      autoSuggestEnabled={settings.customSettings["write-in-autosuggest"]}
                      disabled={false}
                      inputClassName="findPathSearchInput"
                      dropdownLabel="Start node suggestions"
                      emptyMessage="No matching nodes in the loaded catalog."
                      onChange={(value) => {
                        updateFormState((current) => ({
                          ...current,
                          startQuery: value,
                          startNode: null,
                        }));
                      }}
                      onSubmit={() => resolveTypedSelection("start")}
                      onSuggestionSelect={(suggestion) => applySuggestion("start", suggestion)}
                    />
                  </div>
                  {startDisplayNode ? (
                    <button
                      type="button"
                      className="quickPlaySelectionArtworkButton"
                      onClick={() => openEntityDetails(startNode)}
                      aria-label={`Open details for ${startDisplayNode.label}`}
                      title={`Open details for ${startDisplayNode.label}`}
                    >
                      <EntityArtwork
                        type={startDisplayNode.type}
                        label={startDisplayNode.label}
                        imageUrl={startDisplayNode.imageUrl}
                        className="entityArtwork entityArtwork--row quickPlaySelectionArtwork"
                        imageClassName="entityArtwork__image"
                        placeholderClassName="entityArtwork__emoji"
                      />
                    </button>
                  ) : null}
                  <button type="button" className="settingsActionButton settingsActionButton--compact quickPlayRandomButton" onClick={() => randomizeSingleSelection("start")}>
                    Random {startType}
                  </button>
                </div>
              </div>
              <div className="quickPlayInputCard">
                <div className="quickPlayInputLabel">Target node</div>
                <div className="quickPlayInputControlRow">
                  <div className="quickPlayInputFieldWrap">
                    <WriteInAutosuggestField
                      value={targetQuery}
                      placeholder={targetType === "actor" ? "Start typing an actor" : "Start typing a movie"}
                      suggestions={targetOptions}
                      autoSuggestEnabled={settings.customSettings["write-in-autosuggest"]}
                      disabled={false}
                      inputClassName="findPathSearchInput"
                      dropdownLabel="Target node suggestions"
                      emptyMessage="No matching nodes in the loaded catalog."
                      onChange={(value) => {
                        updateFormState((current) => ({
                          ...current,
                          targetQuery: value,
                          targetNode: null,
                        }));
                      }}
                      onSubmit={() => resolveTypedSelection("target")}
                      onSuggestionSelect={(suggestion) => applySuggestion("target", suggestion)}
                    />
                  </div>
                  {targetDisplayNode ? (
                    <button
                      type="button"
                      className="quickPlaySelectionArtworkButton"
                      onClick={() => openEntityDetails(targetNode)}
                      aria-label={`Open details for ${targetDisplayNode.label}`}
                      title={`Open details for ${targetDisplayNode.label}`}
                    >
                      <EntityArtwork
                        type={targetDisplayNode.type}
                        label={targetDisplayNode.label}
                        imageUrl={targetDisplayNode.imageUrl}
                        className="entityArtwork entityArtwork--row quickPlaySelectionArtwork"
                        imageClassName="entityArtwork__image"
                        placeholderClassName="entityArtwork__emoji"
                      />
                    </button>
                  ) : null}
                  <button type="button" className="settingsActionButton settingsActionButton--compact quickPlayRandomButton" onClick={() => randomizeSingleSelection("target")}>
                    Random {targetType}
                  </button>
                </div>
              </div>
            </div>

            <div className="quickPlayCreatorFooter">
              {isSelectionValid ? (
                <div className="quickPlayCreatorStatusRow">
                  <button type="button" className="quickPlayValidationLabel quickPlayValidationLabel--ready" onClick={handleOpenPreview}>
                    Valid with current filters. Preview.
                  </button>
                </div>
              ) : null}
              <button type="button" className="quickPlayStartButton" onClick={handleStartGame} disabled={!isSelectionValid}>
                Start Game
              </button>
            </div>
          </section>
        </div>
        <div className="settingsPanelFooter quickPlayFooter">
          <Link to="/play-now" className="settingsBackLink">Back to Play Now</Link>
        </div>
      </div>
      <LevelPreviewDialog
        isOpen={isPreviewDialogOpen}
        onClose={() => setIsPreviewDialogOpen(false)}
        closeLabel="Close quick play preview"
        eyebrow="Quick Play Preview"
        title={pairingLabel}
        description="Review the optimal route before you launch the board. The path preview and intermediate count are the main checks here."
        status={preview.status}
        message={preview.message}
        startNode={startDisplayNode}
        targetNode={targetDisplayNode}
        pathNodes={previewPathNodes}
        optimalIntermediates={preview.intermediates}
        optimalHops={preview.steps}
        onNodeSelect={(node) => {
          if (node.id === undefined) {
            return;
          }

          openEntityDetails({ id: node.id, type: node.type, label: node.label });
        }}
        details={[
          { label: "Pairing mode", value: pairingLabel },
          { label: "Filters", value: formatFilterSummary(dataFilters) },
          { label: "Preview data", value: isUsingDemoFallback ? "Built-in demo fallback" : "Loaded snapshot" },
        ]}
        actions={[
          { label: "Back to creator", onClick: () => setIsPreviewDialogOpen(false) },
          { label: "Start from preview", onClick: handleStartGame, disabled: preview.status !== "ready" || !currentDraft, variant: "primary" },
        ]}
      />
      <GameFilterSettingsDialog
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        eyebrow="Level Creator"
        title="Current Filter Settings"
        description="These cutoffs and ordering rules apply to quick play validation, randomization, and board creation. Adjust them below when you want to change the current board rules."
        dataFilters={dataFilters}
        actorCountSummary={actorCountSummary}
        movieCountSummary={movieCountSummary}
        closeLabel="Close filters"
        editorTitle="Quick Play Cutoff Overrides"
        editorDescription="Change the actor and movie cutoffs here when you want this quick play board to use different eligibility rules."
        onActorPopularityCutoffChange={(value) => {
          updateFormState((current) => ({
            ...current,
            actorPopularityCutoff: value,
          }));
        }}
        onReleaseYearCutoffChange={(value) => {
          updateFormState((current) => ({
            ...current,
            releaseYearCutoff: value,
          }));
        }}
      />
      <EntityDetailsDialog
        detail={detailDialogData}
        history={detailHistory}
        relationSearch={detailRelationSearch}
        relatedEntities={detailRelatedEntities}
        isLoading={false}
        errorMessage={null}
        onClose={() => {
          setDetailTrail([]);
          setDetailRelationSearch("");
        }}
        onRelationSearchChange={setDetailRelationSearch}
        onOpenRelatedEntity={handleOpenRelatedEntity}
        onNavigateHistory={handleNavigateDetailHistory}
      />
    </div>
  );
}

export default CustomLevelPage;