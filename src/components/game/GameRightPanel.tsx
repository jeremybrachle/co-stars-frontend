import { useEffect, useState } from "react";
import type { GameNode, NodeType } from "../../types";
import "./GameRightPanel.css";

type Props = {
  actorA: GameNode;
  actorB: GameNode;
  selectedSide: "top" | "bottom";
  currentSelection: GameNode;
  suggestions: GameNode[];
  turns: number;
  rewinds: number;
  shuffles: number;
  isDisabled: boolean;
  onBack: () => void;
  onSuggestion: (choice: GameNode) => void;
  onSelectSide: (side: "top" | "bottom") => void;
  onReverse: () => void;
  onShuffle: () => void;
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
  actorA,
  actorB,
  selectedSide,
  currentSelection,
  suggestions,
  turns,
  rewinds,
  shuffles,
  isDisabled,
  onBack,
  onSuggestion,
  onSelectSide,
  onReverse,
  onShuffle,
}: Props) {
  const [isWriteInOpen, setIsWriteInOpen] = useState(false);
  const [writeInValue, setWriteInValue] = useState("");
  const selectionContext = getSuggestionContextLabel(currentSelection);

  useEffect(() => {
    if (isDisabled) {
      setIsWriteInOpen(false);
      setWriteInValue("");
    }
  }, [isDisabled]);

  const handleCloseWriteIn = () => {
    setIsWriteInOpen(false);
    setWriteInValue("");
  };

  const handleSubmitWriteIn = () => {
    const trimmedValue = writeInValue.trim();
    if (!trimmedValue) {
      return;
    }

    if (isDisabled) {
      return;
    }

    onSuggestion({
      label: trimmedValue,
      type: selectionContext.writeInType,
    });
    setWriteInValue("");
    setIsWriteInOpen(false);
  };

  return (
    <aside className="game-right-panel">
      <button
        type="button"
        className={`game-right-panel__side-rail game-right-panel__side-rail--top${selectedSide === "top" ? " game-right-panel__side-rail--active game-right-panel__side-rail--active-top" : ""}`}
        onClick={() => onSelectSide("top")}
        aria-label={`Select ${actorA.label}`}
      >
        <span className="game-right-panel__side-rail-path" aria-hidden="true" />
      </button>

      <div className={`game-right-panel__content${isDisabled ? " game-right-panel__content--disabled" : ""}`}>
        <div className="game-right-panel__toolbar">
          <button type="button" className="game-right-panel__toolbar-button" onClick={onBack} aria-label="Back">
            <span className="game-right-panel__toolbar-icon" aria-hidden="true">↶</span>
          </button>
          <button type="button" className="game-right-panel__toolbar-button" onClick={onShuffle} aria-label="Shuffle">
            <span className="game-right-panel__toolbar-icon" aria-hidden="true">⟳</span>
          </button>
          <button type="button" className="game-right-panel__toolbar-button" onClick={onReverse} aria-label="Reverse">
            <span className="game-right-panel__toolbar-icon" aria-hidden="true">⇅</span>
          </button>
        </div>

        <div className="game-right-panel__label">
          <span className="game-right-panel__label-prefix">{selectionContext.prefix}</span>
          <span className="game-right-panel__label-selection">{currentSelection.label}</span>
        </div>

        <div className="game-right-panel__grid">
          {suggestions.slice(0, 6).map((suggestion, idx) => (
            <button
              key={`${suggestion.type}-${suggestion.label}-${idx}`}
              className="game-right-panel__suggestion-button"
              disabled={isDisabled}
              onClick={() => onSuggestion(suggestion)}
            >
              {suggestion.label}
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
              disabled={isDisabled}
              autoFocus
            />
            <div className="game-right-panel__write-in-actions">
              <button
                className="game-right-panel__suggestion-button game-right-panel__write-in-toggle"
                disabled={isDisabled}
                onClick={handleCloseWriteIn}
                aria-label="Close write in"
              >
                −
              </button>
              <button
                className="game-right-panel__go-button"
                onClick={handleSubmitWriteIn}
                disabled={isDisabled || writeInValue.trim().length === 0}
              >
                Go
              </button>
            </div>
          </div>
        ) : (
          <button
            className="game-right-panel__suggestion-button game-right-panel__wide-button"
            disabled={isDisabled}
            onClick={() => setIsWriteInOpen(true)}
            aria-label="Open write in"
          >
            +
          </button>
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
      </div>

      <button
        type="button"
        className={`game-right-panel__side-rail game-right-panel__side-rail--bottom${selectedSide === "bottom" ? " game-right-panel__side-rail--active game-right-panel__side-rail--active-bottom" : ""}`}
        onClick={() => onSelectSide("bottom")}
        aria-label={`Select ${actorB.label}`}
      >
        <span className="game-right-panel__side-rail-path" aria-hidden="true" />
      </button>
    </aside>
  );
}

export default GameRightPanel;
