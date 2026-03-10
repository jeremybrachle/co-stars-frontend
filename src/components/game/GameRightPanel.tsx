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

        <button className="game-right-panel__suggestion-button game-right-panel__wide-button">+</button>

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
