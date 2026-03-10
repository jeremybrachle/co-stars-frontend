import { useEffect, useState } from "react";
import "./GameRightPanel.css";

type Props = {
  currentSelection: string;
  suggestions: string[];
  turns: number;
  rewinds: number;
  shuffles: number;
  isDisabled: boolean;
  onSuggestion: (choice: string) => void;
  onShuffle: () => void;
  onResetBoard: () => void;
};

function GameRightPanel({
  currentSelection,
  suggestions,
  turns,
  rewinds,
  shuffles,
  isDisabled,
  onSuggestion,
  onShuffle,
  onResetBoard,
}: Props) {
  const [isWriteInOpen, setIsWriteInOpen] = useState(false);
  const [writeInValue, setWriteInValue] = useState("");

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

    onSuggestion(trimmedValue);
    setWriteInValue("");
    setIsWriteInOpen(false);
  };

  return (
    <aside className="game-right-panel">
      <div className={`game-right-panel__content${isDisabled ? " game-right-panel__content--disabled" : ""}`}>
        <div className="game-right-panel__label">
          <span className="game-right-panel__label-prefix">Movies for </span>
          <span className="game-right-panel__label-selection">{currentSelection}</span>
        </div>

        <div className="game-right-panel__grid">
          {suggestions.slice(0, 6).map((suggestion, idx) => (
            <button
              key={`${suggestion}-${idx}`}
              className="game-right-panel__suggestion-button"
              disabled={isDisabled}
              onClick={() => onSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>

        {isWriteInOpen ? (
          <div className="game-right-panel__write-in-panel">
            <input
              type="text"
              value={writeInValue}
              onChange={(event) => setWriteInValue(event.target.value)}
              placeholder="Type a movie title"
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

        <button className="game-right-panel__wide-button game-right-panel__shuffle-button" disabled={isDisabled} onClick={onShuffle}>
          Shuffle
        </button>
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

      <button type="button" className="game-right-panel__reset-button" onClick={onResetBoard}>
        Reset Board
      </button>
    </aside>
  );
}

export default GameRightPanel;
