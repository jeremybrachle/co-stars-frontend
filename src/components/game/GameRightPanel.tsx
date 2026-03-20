import { useEffect, useMemo, useState } from "react";
import EntityArtwork from "../EntityArtwork";
import { formatYear, getMovieBadges } from "../../data/presentation";
import type { GameNode, NodeType, SuggestionDisplaySettings } from "../../types";
import "./GameRightPanel.css";

const WRITE_IN_TEMPORARILY_DISABLED = true;

type Props = {
  currentSelection: GameNode;
  suggestions: GameNode[];
  suggestionDisplay: SuggestionDisplaySettings;
  canRandomizeSuggestions: boolean;
  showSuggestionValues: boolean;
  showHintColors: boolean;
  turns: number;
  rewinds: number;
  deadEndPenalties: number;
  shuffles: number;
  isDisabled: boolean;
  isComplete: boolean;
  isLoading: boolean;
  isRiskAnalysisEnabled: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onCompletePanelClick: () => void;
  onReverse: () => void;
  onSuggestion: (choice: GameNode) => void;
  onShuffle: () => void;
  onWriteIn: (value: string, type: NodeType) => Promise<void>;
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
  canRandomizeSuggestions,
  showSuggestionValues,
  showHintColors,
  turns,
  rewinds,
  deadEndPenalties,
  shuffles,
  isDisabled,
  isComplete,
  isLoading,
  isRiskAnalysisEnabled,
  errorMessage,
  onBack,
  onCompletePanelClick,
  onReverse,
  onSuggestion,
  onShuffle,
  onWriteIn,
}: Props) {
  const [isWriteInOpen, setIsWriteInOpen] = useState(false);
  const [writeInValue, setWriteInValue] = useState("");
  const [isSubmittingWriteIn, setIsSubmittingWriteIn] = useState(false);
  const selectionContext = getSuggestionContextLabel(currentSelection);
  const isCycleWarning = errorMessage?.startsWith("Cycle detected:") ?? false;
  
  // Determine display modes
  const isViewingAll = suggestionDisplay.viewMode === "all";
  const isViewingSubset = suggestionDisplay.viewMode === "subset";
	const isScrollMode = isViewingAll && suggestionDisplay.allWindowMode === "scroll";
	const isPaginationMode = isViewingAll && suggestionDisplay.allWindowMode === "pagination";
  const isRandomMode = canRandomizeSuggestions;
  
  const isShuffleDisabled = isCycleWarning || !isRandomMode;
  const canShowHintState = showSuggestionValues && showHintColors;
  const windowSize = suggestionDisplay.subsetCount;
  const [pageIndex, setPageIndex] = useState(0);
  const totalPages = Math.max(1, Math.ceil(suggestions.length / windowSize));
  
  const visibleSuggestions = useMemo(() => {
    // Scroll mode (fixed window, all items visible by scrolling)
    if (isScrollMode) {
      return suggestions;
    }

    // Pagination mode (show N items per page)
    if (isPaginationMode) {
      const startIndex = pageIndex * windowSize;
      return suggestions.slice(startIndex, startIndex + windowSize);
    }

  	// Subset random mode (show first N from randomized list)
  	if (isRandomMode && isViewingSubset) {
        return suggestions.slice(0, windowSize);
    }

    // Subset no-shuffle or fallback (show first N from sorted list)
      return suggestions.slice(0, windowSize);
  	}, [isRandomMode, isScrollMode, isPaginationMode, isViewingSubset, pageIndex, suggestions, windowSize]);
  
  const suggestionSlots = useMemo(
    () => Array.from({ length: isScrollMode ? visibleSuggestions.length : windowSize }, (_, index) => visibleSuggestions[index] ?? null),
    [isScrollMode, visibleSuggestions, windowSize],
  );

  const renderedSuggestions = isScrollMode ? visibleSuggestions : suggestionSlots;
  const hasBlueSuggestionInCurrentList = useMemo(
    () => renderedSuggestions.some((suggestion) => suggestion?.highlight?.kind === "optimal"),
    [renderedSuggestions],
  );

  useEffect(() => {
    setPageIndex(0);
  }, [windowSize, suggestions]);

  useEffect(() => {
    if (pageIndex >= totalPages) {
      setPageIndex(Math.max(0, totalPages - 1));
    }
  }, [pageIndex, totalPages]);

  useEffect(() => {
    if (WRITE_IN_TEMPORARILY_DISABLED || isDisabled || isLoading || isComplete) {
      setIsWriteInOpen(false);
      setWriteInValue("");
    }
  }, [isComplete, isDisabled, isLoading]);

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
      await onWriteIn(trimmedValue, selectionContext.writeInType);
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
            aria-label="Rewind"
            title="Rewind"
          >
            <span className="game-right-panel__toolbar-icon" aria-hidden="true">↶</span>
          </button>
          {isCycleWarning ? (
            <span className="game-right-panel__toolbar-label">Rewind</span>
          ) : null}
        </div>
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
        <button
          type="button"
          className="game-right-panel__toolbar-button"
          onClick={onReverse}
          disabled={isCycleWarning}
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
          {isViewingAll
            ? isScrollMode
              ? `Scrolling through all suggestions.`
              : `Paginating all suggestions (page ${Math.min(totalPages, pageIndex + 1)} / ${totalPages}).`
			: isRandomMode
			? `Random mode shows ${windowSize} suggestions from a reshuffled list. Click shuffle to regenerate.`
            : `Showing next ${windowSize} suggestions.`}
        </div>

        {isPaginationMode ? (
                <div className="game-right-panel__pagination">
                  <button
                    type="button"
                    className="game-right-panel__pagination-button"
                    onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                    disabled={pageIndex <= 0 || isDisabled || isLoading}
                  >
                    Prev
                  </button>
                  <span className="game-right-panel__pagination-label">Page {Math.min(totalPages, pageIndex + 1)} / {totalPages}</span>
                  <button
                    type="button"
                    className="game-right-panel__pagination-button"
                    onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
                    disabled={pageIndex >= totalPages - 1 || isDisabled || isLoading}
                  >
                    Next
                  </button>
                </div>
              ) : null}

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
                className={`game-right-panel__grid${isScrollMode ? " game-right-panel__grid--scroll" : ""}`}
                style={isScrollMode
				  ? { maxHeight: `calc(var(--game-right-panel-card-height) * ${Math.max(1, Math.ceil(windowSize / 2))} + ${(Math.max(1, Math.ceil(windowSize / 2)) - 1) * 8}px)` }
                  : { gridTemplateRows: `repeat(${Math.max(1, Math.ceil(windowSize / 2))}, var(--game-right-panel-card-height))` }}
              >
                {renderedSuggestions.map((suggestion, idx) => {
                  if (!suggestion) {
                    return <div key={`empty-slot-${idx}`} className="game-right-panel__suggestion-placeholder" aria-hidden="true" />;
                  }

                  const shouldUseFallbackBlue = canShowHintState && !hasBlueSuggestionInCurrentList && !suggestion.highlight;

                  return (
                    <button
                      key={`${suggestion.type}-${suggestion.label}-${idx}`}
                      className={`game-right-panel__suggestion-button ${getSuggestionSizeClass(suggestion)}${canShowHintState && suggestion.highlight ? ` game-right-panel__suggestion-button--${suggestion.highlight.kind}` : ""}${shouldUseFallbackBlue ? " game-right-panel__suggestion-button--fallback-blue" : ""}${showSuggestionValues ? "" : " game-right-panel__suggestion-button--concealed"}`}
                      disabled={isDisabled || isLoading}
                      onClick={() => onSuggestion(suggestion)}
                      title={canShowHintState ? suggestion.highlight?.description : undefined}
                    >
                      {showSuggestionValues ? (
                        <div className="game-right-panel__suggestion-main">
                          <EntityArtwork
                            type={suggestion.type}
                            label={suggestion.label}
                            imageUrl={suggestion.imageUrl}
                            className="game-right-panel__suggestion-artwork"
                            imageClassName="game-right-panel__suggestion-artwork-image"
                            placeholderClassName="game-right-panel__suggestion-artwork-emoji"
                          />
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
                    </button>
                  );
                })}
              </div>

              {isPaginationMode ? (
                <div className="game-right-panel__pagination">
                  <button
                    type="button"
                    className="game-right-panel__pagination-button"
                    onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
                    disabled={pageIndex <= 0 || isDisabled || isLoading}
                  >
                    Prev
                  </button>
                  <span className="game-right-panel__pagination-label">Page {Math.min(totalPages, pageIndex + 1)} / {totalPages}</span>
                  <button
                    type="button"
                    className="game-right-panel__pagination-button"
                    onClick={() => setPageIndex((current) => Math.min(totalPages - 1, current + 1))}
                    disabled={pageIndex >= totalPages - 1 || isDisabled || isLoading}
                  >
                    Next
                  </button>
                </div>
              ) : null}

              {isWriteInOpen ? (
                <div className="game-right-panel__write-in-panel">
                  <input
                    type="text"
                    value={writeInValue}
                    onChange={(event) => setWriteInValue(event.target.value)}
                    placeholder={selectionContext.placeholder}
                    className="game-right-panel__write-in-input"
                    disabled={WRITE_IN_TEMPORARILY_DISABLED || isDisabled || isLoading || isSubmittingWriteIn}
                    autoFocus
                  />
                  <div className="game-right-panel__write-in-actions">
                    <button
                      className="game-right-panel__suggestion-button game-right-panel__write-in-toggle"
                      disabled={WRITE_IN_TEMPORARILY_DISABLED || isDisabled || isLoading || isSubmittingWriteIn}
                      onClick={handleCloseWriteIn}
                      aria-label="Close write in"
                    >
                      −
                    </button>
                    <button
                      className="game-right-panel__go-button"
                      onClick={handleSubmitWriteIn}
                      disabled={WRITE_IN_TEMPORARILY_DISABLED || isDisabled || isLoading || isSubmittingWriteIn || writeInValue.trim().length === 0}
                    >
                      {isSubmittingWriteIn ? "Finding…" : "Go"}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`game-right-panel__write-in-trigger${WRITE_IN_TEMPORARILY_DISABLED ? " game-right-panel__write-in-trigger--disabled" : ""}`}
                  data-tooltip={WRITE_IN_TEMPORARILY_DISABLED ? "User input is currently disabled" : undefined}
                >
                  <button
                    className="game-right-panel__suggestion-button game-right-panel__wide-button"
                    disabled={WRITE_IN_TEMPORARILY_DISABLED || isDisabled || isLoading}
                    onClick={() => {
                      if (!WRITE_IN_TEMPORARILY_DISABLED) {
                        setIsWriteInOpen(true);
                      }
                    }}
                    aria-label={WRITE_IN_TEMPORARILY_DISABLED ? "Write in temporarily disabled" : "Open write in"}
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
            <span className="game-right-panel__score-label">Shuffles:</span>
            <span className="game-right-panel__score-value">{shuffles}</span>
          </div>
          <div className="game-right-panel__score-item game-right-panel__score-item--bordered">
            <span className="game-right-panel__score-label">Rewinds:</span>
            <span className="game-right-panel__score-value">{rewinds}</span>
          </div>
          <div className="game-right-panel__score-item game-right-panel__score-item--bordered">
            <span className="game-right-panel__score-label">Dead-ends:</span>
            <span className={`game-right-panel__score-value${deadEndPenalties > 0 ? " game-right-panel__score-value--penalty" : ""}`}>{deadEndPenalties}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default GameRightPanel;
