import "./GameLeftPanel.css";

type SelectedSide = "top" | "bottom";

type Props = {
  actorA: string;
  actorB: string;
  selectedSide: SelectedSide;
  topPath: string[];
  bottomPath: string[];
  onSelectSide: (side: SelectedSide) => void;
};

const DownArrow = () => <span className="game-left-panel__arrow">↓</span>;
const UpArrow = () => <span className="game-left-panel__arrow">↑</span>;

function VerticalEllipsisBox({
  onClick,
  highlight,
}: {
  onClick: () => void;
  highlight: boolean;
}) {
  return (
    <div
      className={`game-left-panel__actor-box game-left-panel__ellipsis${highlight ? " game-left-panel__ellipsis--active" : ""}`}
      onClick={onClick}
    >
      <span className="game-left-panel__ellipsis-icon">⋮</span>
    </div>
  );
}

function GameLeftPanel({
  actorA,
  actorB,
  selectedSide,
  topPath,
  bottomPath,
  onSelectSide,
}: Props) {
  const baseFont = 22;
  const minFont = 12;

  const renderTopPath = (pathArr: string[]) => {
    const fontSize = Math.max(minFont, baseFont - pathArr.length * 2);

    return (
      <div className="game-left-panel__path-stack">
        <DownArrow />
        {pathArr.map((step, idx) => {
          const isLast = idx === pathArr.length - 1;
          return (
            <div key={`${step}-${idx}`} className="game-left-panel__step-group">
              <div
                className={`game-left-panel__actor-box game-left-panel__actor-box--placed${isLast ? " game-left-panel__actor-box--path-current" : ""}`}
                style={{ fontSize }}
                onClick={isLast ? () => onSelectSide("top") : undefined}
              >
                {step}
              </div>
              <DownArrow />
            </div>
          );
        })}
        <VerticalEllipsisBox onClick={() => onSelectSide("top")} highlight={selectedSide === "top"} />
      </div>
    );
  };

  const renderBottomPath = (pathArr: string[]) => {
    const fontSize = Math.max(minFont, baseFont - pathArr.length * 2);
    const reversed = pathArr.slice().reverse();

    return (
      <div className="game-left-panel__path-stack game-left-panel__path-stack--bottom">
        <VerticalEllipsisBox onClick={() => onSelectSide("bottom")} highlight={selectedSide === "bottom"} />
        {reversed.map((step, revIdx) => {
          const idx = pathArr.length - 1 - revIdx;
          const isLastSelected = idx === pathArr.length - 1;
          return (
            <div key={`${step}-${idx}`} className="game-left-panel__step-group">
              <UpArrow />
              <div
                className={`game-left-panel__actor-box game-left-panel__actor-box--placed${isLastSelected ? " game-left-panel__actor-box--path-current" : ""}`}
                style={{ fontSize }}
                onClick={isLastSelected ? () => onSelectSide("bottom") : undefined}
              >
                {step}
              </div>
            </div>
          );
        })}
        <UpArrow />
      </div>
    );
  };

  return (
    <section className="game-left-panel">
      <div
        className={`game-left-panel__actor-box${selectedSide === "top" ? " game-left-panel__actor-box--selected-side" : ""}`}
        onClick={() => onSelectSide("top")}
      >
        {actorA}
      </div>

      <div className="game-left-panel__path-area">
        <div className="game-left-panel__path-region">{renderTopPath(topPath)}</div>
        <div className="game-left-panel__path-region">{renderBottomPath(bottomPath)}</div>
      </div>

      <div
        className={`game-left-panel__actor-box${selectedSide === "bottom" ? " game-left-panel__actor-box--selected-side" : ""}`}
        onClick={() => onSelectSide("bottom")}
      >
        {actorB}
      </div>
    </section>
  );
}

export default GameLeftPanel;
