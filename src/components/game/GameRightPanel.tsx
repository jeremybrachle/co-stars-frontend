import { useEffect, useMemo, useState } from "react";
import EntityArtwork from "../EntityArtwork";
import { formatYear, getMovieBadges } from "../../data/presentation";
import type { GameNode, NodeType } from "../../types";
import "./GameRightPanel.css";

const WRITE_IN_TEMPORARILY_DISABLED = true;

type Props = {
  currentSelection: GameNode;
  suggestions: GameNode[];
  turns: number;
  rewinds: number;
  shuffles: number;
  optimalHops: number | null;
  currentHops: number;
  isDisabled: boolean;
  isComplete: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onCompletePanelClick: () => void;
  onSuggestion: (choice: GameNode) => void;
  onReverse: () => void;
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

function GameRightPanel({
  currentSelection,
  suggestions,
  turns,
  rewinds,
  shuffles,
  optimalHops,
  currentHops,
  isDisabled,
  isComplete,
  isLoading,
  errorMessage,
  onBack,
  onCompletePanelClick,
  onSuggestion,
  onReverse,
  onShuffle,
  onWriteIn,
}: Props) {
  const [isWriteInOpen, setIsWriteInOpen] = useState(false);
  const [writeInValue, setWriteInValue] = useState("");
  const [isSubmittingWriteIn, setIsSubmittingWriteIn] = useState(false);
  const selectionContext = getSuggestionContextLabel(currentSelection);
  const isCycleWarning = errorMessage?.startsWith("Cycle detected:") ?? false;
  const visibleSuggestions = suggestions.slice(0, 6);
  const visibleChoiceCount = visibleSuggestions.length + 1;
  const choiceDensityClass = useMemo(() => {
    if (visibleChoiceCount >= 6) {
      return "game-right-panel__choices--compact";
    }

    if (visibleChoiceCount >= 4) {
      return "game-right-panel__choices--balanced";
    }

    return "game-right-panel__choices--spacious";
  }, [visibleChoiceCount]);
  const isToolbarDisabled = isLoading || isComplete;

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
      <div className={`game-right-panel__content${isDisabled ? " game-right-panel__content--disabled" : ""}${isComplete ? " game-right-panel__content--complete" : ""}`}>
        <div className="game-right-panel__toolbar">
          <button type="button" className="game-right-panel__toolbar-button" onClick={onBack} aria-label="Back" disabled={isToolbarDisabled}>
            <span className="game-right-panel__toolbar-icon" aria-hidden="true">↶</span>
          </button>
          <button type="button" className="game-right-panel__toolbar-button" onClick={onShuffle} aria-label="Shuffle" disabled={isToolbarDisabled}>
            <span className="game-right-panel__toolbar-icon" aria-hidden="true">⟳</span>
          </button>
          <button type="button" className="game-right-panel__toolbar-button" onClick={onReverse} aria-label="Reverse" disabled={isToolbarDisabled}>
            <span className="game-right-panel__toolbar-icon" aria-hidden="true">⇅</span>
          </button>
        </div>

        <div className="game-right-panel__label">
          <span className="game-right-panel__label-prefix">{selectionContext.prefix}</span>
          <span className="game-right-panel__label-selection">{currentSelection.label}</span>
        </div>

        <div className="game-right-panel__helper-copy">
          Shuffle rerolls a weighted suggestion pool with popularity and shortest-path hints.
        </div>

        {errorMessage ? <div className="game-right-panel__message game-right-panel__message--error">{errorMessage}</div> : null}
        {isLoading ? <div className="game-right-panel__message">Refreshing live suggestions…</div> : null}

        <div className={`game-right-panel__choices ${choiceDensityClass}${isComplete ? " game-right-panel__choices--complete" : ""}`}>
          {isComplete ? (
            <button type="button" className="game-right-panel__completion-review" onClick={onCompletePanelClick}>
              <span className="game-right-panel__completion-review-title">Game complete</span>
              <span className="game-right-panel__completion-review-text">Click here to reopen the completed path summary.</span>
            </button>
          ) : (
            <>
              <div className="game-right-panel__grid">
                {visibleSuggestions.map((suggestion, idx) => (
                  <button
                    key={`${suggestion.type}-${suggestion.label}-${idx}`}
                    className={`game-right-panel__suggestion-button${suggestion.highlight ? ` game-right-panel__suggestion-button--${suggestion.highlight.kind}` : ""}`}
                    disabled={isDisabled || isLoading}
                    onClick={() => onSuggestion(suggestion)}
                    title={suggestion.highlight?.description}
                  >
                    <div className="game-right-panel__suggestion-art-row">
                      <EntityArtwork
                        type={suggestion.type}
                        label={suggestion.label}
                        imageUrl={suggestion.imageUrl}
                        className="game-right-panel__suggestion-artwork"
                        imageClassName="game-right-panel__suggestion-artwork-image"
                        placeholderClassName="game-right-panel__suggestion-artwork-emoji"
                      />
                      <span className="game-right-panel__suggestion-label">{suggestion.label}</span>
                    </div>
                    {suggestion.type === "movie" ? (
                      <span className="game-right-panel__suggestion-meta">
                        {[formatYear(suggestion.releaseDate ?? null), suggestion.contentRating].filter(Boolean).join(" • ") || "Movie"}
                      </span>
                    ) : null}
                    {suggestion.type === "movie" && suggestion.genres?.length ? (
                      <span className="game-right-panel__suggestion-tags">
                        {getMovieBadges({
                          genres: suggestion.genres ?? [],
                          contentRating: null,
                          originalLanguage: null,
                        }).slice(0, 2).map((badge) => (
                          <span key={badge} className="game-right-panel__suggestion-tag">{badge}</span>
                        ))}
                      </span>
                    ) : null}
                    {suggestion.highlight ? (
                      <span className={`game-right-panel__suggestion-badge game-right-panel__suggestion-badge--${suggestion.highlight.kind}`}>
                        {suggestion.highlight.label}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

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
            </>
          )}
        </div>
      </div>

      <div className="game-right-panel__score-panel">
        <div className="game-right-panel__score-item">
          <span className="game-right-panel__score-label">Turns:</span>
          <span className="game-right-panel__score-value">{turns}</span>
        </div>
        <div className="game-right-panel__score-item game-right-panel__score-item--bordered">
          <span className="game-right-panel__score-label">Hops:</span>
          <span className="game-right-panel__score-value">{currentHops}</span>
        </div>
        <div className="game-right-panel__score-item game-right-panel__score-item--bordered">
          <span className="game-right-panel__score-label">Shuffles:</span>
          <span className="game-right-panel__score-value">{shuffles}</span>
        </div>
        <div className="game-right-panel__score-item game-right-panel__score-item--bordered">
          <span className="game-right-panel__score-label">Optimal:</span>
          <span className="game-right-panel__score-value">{optimalHops ?? "--"}</span>
        </div>
        <div className="game-right-panel__score-item game-right-panel__score-item--bordered">
          <span className="game-right-panel__score-label">Rewinds:</span>
          <span className="game-right-panel__score-value">{rewinds}</span>
        </div>
      </div>
    </aside>
  );
}

export default GameRightPanel;
