import { useState } from "react";
import "./GameRightPanel.css";

type Props = {
  currentSelection: string;
  suggestions: string[];
  turns: number;
  rewinds: number;
  shuffles: number;
  onSuggestion: (choice: string) => void;
  onShuffle: () => void;
};

function GameRightPanel({
  currentSelection,
  suggestions,
  turns,
  rewinds,
  shuffles,
  onSuggestion,
  onShuffle,
}: Props) {
  const [isWriteInOpen, setIsWriteInOpen] = useState(false);
  const [writeInValue, setWriteInValue] = useState("");

  const handleCloseWriteIn = () => {
    setIsWriteInOpen(false);
    setWriteInValue("");
  };

  const handleSubmitWriteIn = () => {
    const trimmedValue = writeInValue.trim();
    if (!trimmedValue) {
      return;
    }

    onSuggestion(trimmedValue);
    setWriteInValue("");
    setIsWriteInOpen(false);
  };

  return (
    <aside className="game-right-panel">
      <div className="game-right-panel__content">
        <div className="game-right-panel__label">{`Movies for ${currentSelection}`}</div>

        <div className="game-right-panel__grid">
          {suggestions.slice(0, 6).map((suggestion, idx) => (
            <button
              key={`${suggestion}-${idx}`}
              className="game-right-panel__suggestion-button"
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
              autoFocus
            />
            <div className="game-right-panel__write-in-actions">
              <button
                className="game-right-panel__suggestion-button game-right-panel__write-in-toggle"
                onClick={handleCloseWriteIn}
                aria-label="Close write in"
              >
                −
              </button>
              <button
                className="game-right-panel__go-button"
                onClick={handleSubmitWriteIn}
                disabled={writeInValue.trim().length === 0}
              >
                Go
              </button>
            </div>
          </div>
        ) : (
          <button
            className="game-right-panel__suggestion-button game-right-panel__wide-button"
            onClick={() => setIsWriteInOpen(true)}
            aria-label="Open write in"
          >
            +
          </button>
        )}

        <button className="game-right-panel__wide-button game-right-panel__shuffle-button" onClick={onShuffle}>
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
    </aside>
  );
}

export default GameRightPanel;
