import { useEffect, useMemo, useRef, useState } from "react";
import EntityArtwork from "../EntityArtwork";
import WriteInAutosuggestField from "./WriteInAutosuggestField";
import { useIsCompactPhoneViewport } from "../../hooks/useIsCompactPhoneViewport";
import { formatYear, getMovieBadges } from "../../data/presentation";
import { shuffleSuggestionsWithSeed } from "../../gameplay";
import type { GameNode, NodeType, SuggestionDisplaySettings } from "../../types";
import "./GameRightPanel.css";

const RANKED_VISIBLE_SLOT_COUNT = 6;

type Props = {
  currentSelection: GameNode;
  suggestions: GameNode[];
  suggestionDisplay: SuggestionDisplaySettings;
  isShuffleModeEnabled: boolean;
  shuffleAddsPenalty: boolean;
  rewindAddsPenalty: boolean;
  deadEndAddsPenalty: boolean;
  showSuggestionValues: boolean;
  showHintColors: boolean;
  writeInAutoSuggestEnabled: boolean;
  writeInSuggestions: GameNode[];
  turns: number;
  rewinds: number;
  deadEndPenalties: number;
  shuffles: number;
  shuffleSeed: number;
  canGoBackOnCurrentSide: boolean;
  isDisabled: boolean;
  isComplete: boolean;
  isLoading: boolean;
  isRiskAnalysisEnabled: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onCompletePanelClick: () => void;
  onReverse: () => void;
  onSuggestion: (choice: GameNode) => void;
  onInspectSuggestion: (choice: GameNode) => void;
  onSelectWriteInSuggestion: (choice: GameNode) => Promise<void>;
  onShuffle: () => void;
  onWriteIn: (value: string, type: NodeType, allowedOptions: GameNode[], sourceLabel: string) => Promise<boolean>;
};

function getSuggestionContextLabel(selection: GameNode) {
  if (selection.type === "actor") {
    return {
      prefix: "Movies for ",
      placeholder: "Enter a movie title",
      writeInType: "movie" as NodeType,
    };
  }

  return {
    prefix: "Co-Stars in ",
    placeholder: "Enter an actor name",
    writeInType: "actor" as NodeType,
  };
}

function getSuggestionSizeClass(suggestion: GameNode) {
  if (suggestion.highlight?.kind === "optimal" || suggestion.highlight?.kind === "connection") {
    return "game-right-panel__suggestion-button--size-best";
  }

  if (!suggestion.highlight && suggestion.pathHint?.reachable) {
    return "game-right-panel__suggestion-button--size-medium";
  }

  if (suggestion.highlight?.kind === "loop" || suggestion.highlight?.kind === "blocked") {
    return "game-right-panel__suggestion-button--size-small";
  }

  return "game-right-panel__suggestion-button--size-medium";
}

function GameRightPanel({
  currentSelection,
  suggestions,
  suggestionDisplay,
  isShuffleModeEnabled,
  shuffleAddsPenalty,
  rewindAddsPenalty,
  deadEndAddsPenalty,
  showSuggestionValues,
  showHintColors,
  writeInAutoSuggestEnabled,
  writeInSuggestions,
  turns,
  rewinds,
  deadEndPenalties,
  shuffles,
  shuffleSeed,
  canGoBackOnCurrentSide,
  isDisabled,
  isComplete,
  isLoading,
  isRiskAnalysisEnabled,
  errorMessage,
  onBack,
  onCompletePanelClick,
  onReverse,
  onSuggestion,
  onInspectSuggestion,
  onSelectWriteInSuggestion,
  onShuffle,
  onWriteIn,
}: Props) {
  const [isWriteInOpen, setIsWriteInOpen] = useState(false);
  const [writeInValue, setWriteInValue] = useState("");
  const [isSubmittingWriteIn, setIsSubmittingWriteIn] = useState(false);
  const writeInPanelRef = useRef<HTMLDivElement | null>(null);
  const writeInTriggerRef = useRef<HTMLDivElement | null>(null);
  const isCompactPhoneViewport = useIsCompactPhoneViewport();
  const selectionContext = getSuggestionContextLabel(currentSelection);
  const isCycleWarning = errorMessage?.startsWith("Cycle detected:") ?? false;
  const isScrollMode = !isShuffleModeEnabled;
  const isShuffleDisabled = isCycleWarning || isDisabled || isLoading || isComplete;
  const canShowHintState = showSuggestionValues && showHintColors;
  const showWriteInSuggestionList = isCompactPhoneViewport && showSuggestionValues;
  const rightPanelAutoSuggestEnabled = isCompactPhoneViewport && writeInAutoSuggestEnabled;
  const windowSize = suggestionDisplay.subsetCount;
  const orderedSuggestions = useMemo(() => {
    if (!isShuffleModeEnabled) {
      return suggestions;
    }

    return shuffleSuggestionsWithSeed(suggestions, shuffleSeed);
  }, [isShuffleModeEnabled, shuffleSeed, suggestions]);
  const isRankedScrollable = isScrollMode && orderedSuggestions.length > RANKED_VISIBLE_SLOT_COUNT;
  
  const visibleSuggestions = useMemo(() => {
    if (isScrollMode) {
      return orderedSuggestions;
    }

    return orderedSuggestions.slice(0, windowSize);
  }, [isScrollMode, orderedSuggestions, windowSize]);
  
  const suggestionSlots = useMemo(
    () => Array.from(
      { length: isScrollMode ? Math.max(RANKED_VISIBLE_SLOT_COUNT, visibleSuggestions.length) : windowSize },
      (_, index) => visibleSuggestions[index] ?? null,
    ),
    [isScrollMode, visibleSuggestions, windowSize],
  );

  const renderedSuggestions = suggestionSlots;
  const hasBlueSuggestionInCurrentList = useMemo(
    () => renderedSuggestions.some((suggestion) => suggestion?.highlight?.kind === "optimal"),
    [renderedSuggestions],
  );
  useEffect(() => {
    if (isDisabled || isLoading || isComplete) {
      setIsWriteInOpen(false);
      setWriteInValue("");
    }
  }, [isComplete, isDisabled, isLoading]);

  useEffect(() => {
    if (!isWriteInOpen || isCompactPhoneViewport) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (writeInPanelRef.current?.contains(target) || writeInTriggerRef.current?.contains(target)) {
        return;
      }

      setIsWriteInOpen(false);
      setWriteInValue("");
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isCompactPhoneViewport, isWriteInOpen]);

  const handleCloseWriteIn = () => {
    setIsWriteInOpen(false);
    setWriteInValue("");
  };

  const handleSubmitWriteIn = async () => {
    const trimmedValue = writeInValue.trim();
    if (!trimmedValue) {
      return;
    }

    if (isDisabled || isLoading || isSubmittingWriteIn || isComplete) {
      return;
    }

    setIsSubmittingWriteIn(true);

    try {
      const didResolve = await onWriteIn(trimmedValue, selectionContext.writeInType, writeInSuggestions, currentSelection.label);
      if (didResolve) {
        setWriteInValue("");
        setIsWriteInOpen(false);
      }
    } finally {
      setIsSubmittingWriteIn(false);
    }
  };

  const handleSelectWriteInSuggestion = async (choice: GameNode) => {
    if (isDisabled || isLoading || isSubmittingWriteIn || isComplete) {
      return;
    }

    setIsSubmittingWriteIn(true);

    try {
      await onSelectWriteInSuggestion(choice);
      setWriteInValue("");
      setIsWriteInOpen(false);
    } finally {
      setIsSubmittingWriteIn(false);
    }
  };

  return (
    <aside className={`game-right-panel${isCycleWarning ? " game-right-panel--cycle-warning" : ""}`}>
      <div className="game-right-panel__toolbar-row" aria-label="Game controls">
        <div className="game-right-panel__toolbar-button-wrapper">
          <button
            type="button"
            className={`game-right-panel__toolbar-button${isCycleWarning ? " game-right-panel__toolbar-button--highlighted" : ""}`}
            onClick={onBack}
            disabled={!canGoBackOnCurrentSide || isDisabled || isLoading || isComplete}
            aria-label="Rewind"
            title="Rewind"
          >
            <span className="game-right-panel__toolbar-icon" aria-hidden="true">↶</span>
          </button>
          {isCycleWarning ? (
            <span className="game-right-panel__toolbar-label">Rewind</span>
          ) : null}
        </div>
        {isShuffleModeEnabled ? (
          <button
            type="button"
            className="game-right-panel__toolbar-button"
            onClick={onShuffle}
            disabled={isShuffleDisabled}
            aria-label="Shuffle"
            title="Shuffle"
          >
            <span className="game-right-panel__toolbar-icon" aria-hidden="true">⟳</span>
          </button>
        ) : null}
        <button
          type="button"
          className="game-right-panel__toolbar-button"
          onClick={onReverse}
          disabled={isCycleWarning || isDisabled || isLoading || isComplete}
          aria-label="Swap"
          title="Swap"
        >
          <span className="game-right-panel__toolbar-icon" aria-hidden="true">⇅</span>
        </button>
      </div>

      <div className={`game-right-panel__content${isDisabled ? " game-right-panel__content--disabled" : ""}${isComplete ? " game-right-panel__content--complete" : ""}`}>
        <div className="game-right-panel__label">
          <span className="game-right-panel__label-prefix">{selectionContext.prefix}</span>
          <span className="game-right-panel__label-selection">{currentSelection.label}</span>
        </div>

        <div className="game-right-panel__helper-copy">
          {isShuffleModeEnabled
            ? `Shuffle mode shows ${windowSize} cards from a reshuffled list. Click shuffle to reroll.`
            : "Scrolling through the full ranked suggestion list."}
        </div>

        {errorMessage ? <div className="game-right-panel__message game-right-panel__message--error">{errorMessage}</div> : null}
        {isLoading ? <div className="game-right-panel__message">{isRiskAnalysisEnabled ? "Refreshing suggestions and analyzing path risks…" : "Refreshing live suggestions…"}</div> : null}

        <div className={`game-right-panel__choices${isComplete ? " game-right-panel__choices--complete" : ""}`}>
          {isComplete ? (
            <button type="button" className="game-right-panel__completion-review" onClick={onCompletePanelClick}>
              <span className="game-right-panel__completion-review-title">Game complete</span>
              <span className="game-right-panel__completion-review-text">Click here to reopen the completed path summary.</span>
            </button>
          ) : (
            <>
              <div className="game-right-panel__choices-spacer" aria-hidden="true" />
              <div
                className={`game-right-panel__grid${isRankedScrollable ? " game-right-panel__grid--scroll" : ""}`}
                style={isScrollMode
				  ? isRankedScrollable
				    ? { maxHeight: `calc(var(--game-right-panel-card-height) * 3 + 16px)` }
				    : { gridTemplateRows: `repeat(3, var(--game-right-panel-card-height))` }
                  : { gridTemplateRows: `repeat(${Math.max(1, Math.ceil(windowSize / 2))}, var(--game-right-panel-card-height))` }}
              >
                {renderedSuggestions.map((suggestion, idx) => {
                  if (!suggestion) {
                    return <div key={`empty-slot-${idx}`} className="game-right-panel__suggestion-placeholder" aria-hidden="true" />;
                  }

                  const shouldUseFallbackBlue = canShowHintState && !hasBlueSuggestionInCurrentList && !suggestion.highlight;
                  const isSuggestionDisabled = isDisabled || isLoading;

                  return (
                    <div
                      key={`${suggestion.type}-${suggestion.label}-${idx}`}
                      role="button"
                      tabIndex={isSuggestionDisabled ? -1 : 0}
                      aria-disabled={isSuggestionDisabled}
                      className={`game-right-panel__suggestion-button${canShowHintState ? ` ${getSuggestionSizeClass(suggestion)}` : ""}${canShowHintState && suggestion.highlight ? ` game-right-panel__suggestion-button--${suggestion.highlight.kind}` : ""}${shouldUseFallbackBlue ? " game-right-panel__suggestion-button--fallback-blue" : ""}${showSuggestionValues ? "" : " game-right-panel__suggestion-button--concealed"}`}
                      onClick={() => {
                        if (isSuggestionDisabled) {
                          return;
                        }

                        onSuggestion(suggestion);
                      }}
                      onKeyDown={(event) => {
                        if (isSuggestionDisabled) {
                          return;
                        }

                        if (event.key !== "Enter" && event.key !== " ") {
                          return;
                        }

                        event.preventDefault();
                        onSuggestion(suggestion);
                      }}
                      title={canShowHintState ? suggestion.highlight?.description : undefined}
                    >
                      {showSuggestionValues ? (
                        <div className="game-right-panel__suggestion-main">
                          <button
                            type="button"
                            className="game-right-panel__suggestion-artwork-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onInspectSuggestion(suggestion);
                            }}
                            disabled={isSuggestionDisabled}
                            aria-label={`View details for ${suggestion.label}`}
                          >
                            <EntityArtwork
                              type={suggestion.type}
                              label={suggestion.label}
                              imageUrl={suggestion.imageUrl}
                              className="game-right-panel__suggestion-artwork"
                              imageClassName="game-right-panel__suggestion-artwork-image"
                              placeholderClassName="game-right-panel__suggestion-artwork-emoji"
                            />
                          </button>
                          <div className="game-right-panel__suggestion-content">
                            <span className="game-right-panel__suggestion-label">{suggestion.label}</span>
                            <span className={`game-right-panel__suggestion-meta${suggestion.type === "actor" ? " game-right-panel__suggestion-meta--actor" : ""}`}>
                              {suggestion.type === "movie"
                                ? ([formatYear(suggestion.releaseDate ?? null), suggestion.contentRating].filter(Boolean).join(" • ") || "Movie")
                                : "Actor"}
                            </span>
                            {suggestion.type === "movie" && suggestion.genres?.length ? (
                              <span className="game-right-panel__suggestion-tags">
                                {getMovieBadges({
                                  genres: suggestion.genres ?? [],
                                  contentRating: null,
                                  originalLanguage: null,
                                }).slice(0, 1).map((badge) => (
                                  <span key={badge} className="game-right-panel__suggestion-tag">{badge}</span>
                                ))}
                              </span>
                            ) : null}
                            {canShowHintState && suggestion.highlight ? (
                              <span className={`game-right-panel__suggestion-badge game-right-panel__suggestion-badge--${suggestion.highlight.kind}`}>
                                {suggestion.highlight.label}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="game-right-panel__suggestion-hidden" aria-label="Hidden suggestion">
                          <span className="game-right-panel__suggestion-hidden-mark">?</span>
                          <span className="game-right-panel__suggestion-hidden-text">Hidden suggestion</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {isWriteInOpen ? (
                <div ref={writeInPanelRef} className="game-right-panel__write-in-panel">
                  {showWriteInSuggestionList ? (
                    <div className="game-right-panel__write-in-suggestion-shell">
                      <div className="game-right-panel__write-in-suggestion-list" role="listbox" aria-label={`${selectionContext.writeInType} write in suggestions`}>
                        {writeInSuggestions.length > 0 ? (
                          writeInSuggestions.map((suggestion) => (
                            <button
                              key={`${suggestion.type}-${suggestion.id ?? suggestion.label}`}
                              type="button"
                              className="write-in-autosuggest__option"
                              onClick={() => {
                                void handleSelectWriteInSuggestion(suggestion);
                              }}
                              disabled={isDisabled || isLoading || isSubmittingWriteIn}
                            >
                              <EntityArtwork
                                type={suggestion.type}
                                label={suggestion.label}
                                imageUrl={suggestion.imageUrl}
                                className="write-in-autosuggest__artwork"
                                imageClassName="write-in-autosuggest__artwork-image"
                                placeholderClassName="write-in-autosuggest__artwork-emoji"
                              />
                              <span className="write-in-autosuggest__option-copy">
                                <span className="write-in-autosuggest__option-label">{suggestion.label}</span>
                                <span className="write-in-autosuggest__option-meta">
                                  {suggestion.type === "movie"
                                    ? ([formatYear(suggestion.releaseDate ?? null), suggestion.contentRating].filter(Boolean).join(" • ") || "Movie")
                                    : "Actor"}
                                </span>
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="game-right-panel__write-in-suggestion-empty">No filtered options are available right now.</div>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <WriteInAutosuggestField
                    value={writeInValue}
                    onChange={setWriteInValue}
                    onSubmit={() => {
                      void handleSubmitWriteIn();
                    }}
                    placeholder={selectionContext.placeholder}
                    suggestions={writeInSuggestions}
                    autoSuggestEnabled={rightPanelAutoSuggestEnabled}
                    disabled={isDisabled || isLoading || isSubmittingWriteIn}
                    autoFocus
                    inputClassName="game-right-panel__write-in-input"
                    dropdownLabel={`${selectionContext.writeInType} write in suggestions`}
                    emptyMessage={`No matching ${selectionContext.writeInType === "actor" ? "actors" : "movies"}.`}
                    onSuggestionSelect={(choice) => {
                      void handleSelectWriteInSuggestion(choice);
                    }}
                  />
                  <div className="game-right-panel__write-in-hint">
                    {rightPanelAutoSuggestEnabled
                      ? "Type-ahead is on. Pick a match or submit a fuzzy search."
                      : "Enter a name and press Go for fuzzy matching."}
                  </div>
                  <div className="game-right-panel__write-in-actions">
                    <button
                      className="game-right-panel__suggestion-button game-right-panel__wide-button game-right-panel__write-in-toggle"
                      disabled={isDisabled || isLoading || isSubmittingWriteIn}
                      onClick={handleCloseWriteIn}
                      aria-label="Close write in"
                    >
                      −
                    </button>
                    <button
                      className="game-right-panel__go-button"
                      onClick={handleSubmitWriteIn}
                      disabled={isDisabled || isLoading || isSubmittingWriteIn || writeInValue.trim().length === 0}
                    >
                      {isSubmittingWriteIn ? "Finding…" : "Go"}
                    </button>
                  </div>
                </div>
              ) : (
                <div ref={writeInTriggerRef} className="game-right-panel__write-in-trigger">
                  <button
                    className="game-right-panel__suggestion-button game-right-panel__wide-button"
                    disabled={isDisabled || isLoading}
                    onClick={() => {
                      setIsWriteInOpen(true);
                    }}
                    aria-label="Open write in"
                  >
                    +
                  </button>
                </div>
              )}
              <div className="game-right-panel__choices-spacer" aria-hidden="true" />
            </>
          )}
        </div>

        <div className="game-right-panel__score-panel">
          <div className="game-right-panel__score-item">
            <span className="game-right-panel__score-label">Turns:</span>
            <span className="game-right-panel__score-value">{turns}</span>
          </div>
          <div className="game-right-panel__score-item game-right-panel__score-item--bordered">
            <span className="game-right-panel__score-label">Rewinds:</span>
            <span
              className="game-right-panel__score-value"
              title={rewindAddsPenalty ? undefined : "rewind penalties are disabled"}
            >
              {rewindAddsPenalty ? rewinds : "N/A"}
            </span>
          </div>
          <div className="game-right-panel__score-item game-right-panel__score-item--bordered">
            <span className="game-right-panel__score-label">Shuffles:</span>
            <span
              className="game-right-panel__score-value"
              title={shuffleAddsPenalty ? undefined : "shuffle penalties are disabled"}
            >
              {shuffleAddsPenalty ? shuffles : "N/A"}
            </span>
          </div>
          <div className="game-right-panel__score-item game-right-panel__score-item--bordered">
            <span className="game-right-panel__score-label">Dead-ends:</span>
            <span
              className={`game-right-panel__score-value${deadEndAddsPenalty && deadEndPenalties > 0 ? " game-right-panel__score-value--penalty" : ""}`}
              title={deadEndAddsPenalty ? undefined : "dead-end penalties are disabled"}
            >
              {deadEndAddsPenalty ? deadEndPenalties : "N/A"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default GameRightPanel;
