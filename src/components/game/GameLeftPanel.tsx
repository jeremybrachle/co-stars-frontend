import "./GameLeftPanel.css";
import type { GameNode } from "../../types";
import { MAX_PATH_LENGTH } from "../../gameplay";

type SelectedSide = "top" | "bottom";
type Side = SelectedSide;
type BoardPoint = {
  row: number;
  col: number;
};

type BoardToken = {
  key: string;
  text: string;
  fontSize: number;
  side: Side;
  coord: BoardPoint;
  startArrow?: string;
  outgoingArrow?: string;
  isCurrent: boolean;
  isDimmed: boolean;
  removable: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
};

type BoardEllipsis = {
  key: string;
  side: Side;
  coord: BoardPoint;
  isDimmed: boolean;
  startArrow?: string;
  onSelect: () => void;
};

type Props = {
  actorA: GameNode;
  actorB: GameNode;
  selectedSide: SelectedSide;
  topPath: GameNode[];
  bottomPath: GameNode[];
  lockedSide: SelectedSide | null;
  completedPath?: GameNode[];
  currentHops: number;
  optimalHops: number | null;
  onSelectSide: (side: SelectedSide) => void;
  onRemoveTopPathItem: () => void;
  onRemoveBottomPathItem: () => void;
};

const GRID_COLUMNS = 4;
const GRID_ROWS = 5;
const TOTAL_SLOTS = GRID_COLUMNS * GRID_ROWS;

function buildSnakeOrder(rows: number, columns: number) {
  const snakeOrder: BoardPoint[] = [];

  for (let row = 0; row < rows; row += 1) {
    const rowColumns = row % 2 === 0
      ? Array.from({ length: columns }, (_, index) => index)
      : Array.from({ length: columns }, (_, index) => columns - 1 - index);
    rowColumns.forEach((col) => {
      snakeOrder.push({ row, col });
    });
  }

  return snakeOrder;
}

const TOP_ORDER = buildSnakeOrder(GRID_ROWS, GRID_COLUMNS);

function buildBottomSnakeOrder() {
  const snakeOrder: BoardPoint[] = [];

  for (let row = GRID_ROWS - 1; row >= 0; row -= 1) {
    const isBottomOffsetEven = (GRID_ROWS - 1 - row) % 2 === 0;
    const columns = isBottomOffsetEven ? [3, 2, 1, 0] : [0, 1, 2, 3];
    columns.forEach((col) => {
      snakeOrder.push({ row, col });
    });
  }

  return snakeOrder;
}

const BOTTOM_ORDER = buildBottomSnakeOrder();

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

function getDirectionalArrow(from: BoardPoint, to: BoardPoint) {
  const rowDelta = Math.sign(to.row - from.row);
  const colDelta = Math.sign(to.col - from.col);

  if (rowDelta === 1 && colDelta === 0) return "↓";
  if (rowDelta === -1 && colDelta === 0) return "↑";
  if (rowDelta === 0 && colDelta === 1) return "→";
  if (rowDelta === 0 && colDelta === -1) return "←";
  if (rowDelta === 1 && colDelta === 1) return "↘";
  if (rowDelta === 1 && colDelta === -1) return "↙";
  if (rowDelta === -1 && colDelta === 1) return "↗";
  if (rowDelta === -1 && colDelta === -1) return "↖";

  return "•";
}

function getOrderForSide(side: Side) {
  return side === "top" ? TOP_ORDER : BOTTOM_ORDER;
}

function getArrowPositionClass(arrow?: string) {
  switch (arrow) {
    case "↓":
      return "game-left-panel__board-arrow--down";
    case "↑":
      return "game-left-panel__board-arrow--up";
    case "→":
      return "game-left-panel__board-arrow--right";
    case "←":
      return "game-left-panel__board-arrow--left";
    case "↘":
      return "game-left-panel__board-arrow--down-right";
    case "↙":
      return "game-left-panel__board-arrow--down-left";
    case "↗":
      return "game-left-panel__board-arrow--up-right";
    case "↖":
      return "game-left-panel__board-arrow--up-left";
    default:
      return "";
  }
}

function buildBoardTokens({
  path,
  side,
  isActivePath,
  isBoardLocked,
  cappedSide,
  fontSize,
  onSelectSide,
  onRemove,
}: {
  path: GameNode[];
  side: Side;
  isActivePath: boolean;
  isBoardLocked: boolean;
  cappedSide: Side | null;
  fontSize: number;
  onSelectSide: (side: Side) => void;
  onRemove: () => void;
}) {
  const order = getOrderForSide(side);
  const slotPath = path.slice(0, MAX_PATH_LENGTH);
  const canRenderEllipsis = !isBoardLocked || cappedSide === side;
  const ellipsisCoord = canRenderEllipsis && path.length < TOTAL_SLOTS ? order[path.length] : null;

  const tokens: BoardToken[] = slotPath.map((step, index) => {
    const coord = order[index];
    const isCurrent = isActivePath && index === slotPath.length - 1;
    const nextCoord = index < slotPath.length - 1 ? order[index + 1] : ellipsisCoord;

    return {
      key: `${side}-${step.type}-${step.label}-${index}`,
      text: step.label,
      fontSize,
      side,
      coord,
      startArrow: index === 0 ? (side === "top" ? "↓" : "↑") : undefined,
      outgoingArrow: nextCoord ? getDirectionalArrow(coord, nextCoord) : undefined,
      isCurrent,
      isDimmed: !isActivePath,
      removable: isCurrent,
      onSelect: isCurrent ? () => onSelectSide(side) : undefined,
      onRemove: isCurrent ? onRemove : undefined,
    };
  });

  return {
    tokens,
    ellipsis:
      ellipsisCoord !== null
        ? {
            key: `${side}-ellipsis-${path.length}`,
            side,
            coord: ellipsisCoord,
            isDimmed: !isActivePath,
            startArrow: path.length === 0 ? (side === "top" ? "↓" : "↑") : undefined,
            onSelect: () => onSelectSide(side),
          }
        : null,
  };
}

function renderStepRow({
  text,
  fontSize,
  isCurrent,
  removable,
  onRemove,
  onSelect,
}: {
  text: string;
  fontSize: number;
  isCurrent: boolean;
  removable: boolean;
  onRemove?: () => void;
  onSelect?: () => void;
}) {
  return (
    <div className="game-left-panel__step-row">
      {removable ? (
        <button
          type="button"
          className="game-left-panel__remove-button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove?.();
          }}
          aria-label={`Remove ${text} from current path`}
        >
          ×
        </button>
      ) : null}
      <div
        className={`game-left-panel__actor-box game-left-panel__board-box${isCurrent ? " game-left-panel__actor-box--path-current-primary" : " game-left-panel__actor-box--placed"}`}
        style={{ fontSize }}
        onClick={onSelect}
      >
        {text}
      </div>
    </div>
  );
}

function renderBoardToken(token: BoardToken) {
  const tokenRow = renderStepRow({
    text: token.text,
    fontSize: token.fontSize,
    isCurrent: token.isCurrent,
    removable: token.removable,
    onRemove: token.onRemove,
    onSelect: token.onSelect,
  });

  const originArrowClassName = `game-left-panel__arrow game-left-panel__board-arrow ${token.side === "top" ? "game-left-panel__board-arrow--up-origin" : "game-left-panel__board-arrow--down-origin"}${token.isDimmed ? " game-left-panel__board-arrow--inactive" : ""}`;
  const arrowClassName = `game-left-panel__arrow game-left-panel__board-arrow ${getArrowPositionClass(token.outgoingArrow)}${token.isDimmed ? " game-left-panel__board-arrow--inactive" : ""}`;

  return (
    <div className={`game-left-panel__board-slot${token.isDimmed ? " game-left-panel__board-slot--inactive" : ""}`}>
      {token.startArrow ? <span className={originArrowClassName}>{token.startArrow}</span> : null}
      {token.outgoingArrow ? <span className={arrowClassName}>{token.outgoingArrow}</span> : null}
      {tokenRow}
    </div>
  );
}

function renderBoardEllipsis(ellipsis: BoardEllipsis) {
  const arrowClassName = `game-left-panel__arrow game-left-panel__board-arrow ${ellipsis.side === "top" ? "game-left-panel__board-arrow--up-origin" : "game-left-panel__board-arrow--down-origin"}${ellipsis.isDimmed ? " game-left-panel__board-arrow--inactive" : ""}`;

  return (
    <div className={`game-left-panel__board-slot${ellipsis.isDimmed ? " game-left-panel__board-slot--inactive" : ""}`}>
      {ellipsis.startArrow ? <span className={arrowClassName}>{ellipsis.startArrow}</span> : null}
      <VerticalEllipsisBox onClick={ellipsis.onSelect} highlight={!ellipsis.isDimmed} />
    </div>
  );
}

function renderCompletedBoard(completedPath: GameNode[]) {
  const totalNodes = completedPath.length;
  const columns = Math.min(4, Math.max(2, totalNodes >= 4 ? 4 : totalNodes));
  const rows = Math.max(1, Math.ceil(totalNodes / columns));
  const snakeOrder = buildSnakeOrder(rows, columns);

  return (
    <div className="game-left-panel__completed-shell">
      <div
        className="game-left-panel__completed-board"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        }}
      >
        {completedPath.map((node, index) => {
          const coord = snakeOrder[index];
          const nextCoord = snakeOrder[index + 1];
          const outgoingArrow = nextCoord ? getDirectionalArrow(coord, nextCoord) : undefined;
          const isEndpoint = index === 0 || index === completedPath.length - 1;

          return (
            <div
              key={`${node.type}-${node.label}-${index}`}
              className="game-left-panel__board-cell"
              style={{ gridColumn: coord.col + 1, gridRow: coord.row + 1 }}
            >
              <div className="game-left-panel__board-slot">
                {outgoingArrow ? (
                  <span className={`game-left-panel__arrow game-left-panel__board-arrow ${getArrowPositionClass(outgoingArrow)}`}>
                    {outgoingArrow}
                  </span>
                ) : null}
                <div
                  className={`game-left-panel__actor-box game-left-panel__board-box game-left-panel__completed-node${isEndpoint ? " game-left-panel__completed-node--endpoint" : ""}`}
                >
                  {node.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GameLeftPanel({
  actorA,
  actorB,
  selectedSide,
  topPath,
  bottomPath,
  lockedSide,
  completedPath,
  currentHops,
  optimalHops,
  onSelectSide,
  onRemoveTopPathItem,
  onRemoveBottomPathItem,
}: Props) {
  const baseFont = 22;
  const minFont = 12;
  const topFontSize = Math.max(minFont, baseFont - topPath.length * 2);
  const bottomFontSize = Math.max(minFont, baseFont - bottomPath.length * 2);
  const isBoardLocked = topPath.length + bottomPath.length >= MAX_PATH_LENGTH;
  const cappedSide = isBoardLocked ? lockedSide : null;

  const topBoardState = buildBoardTokens({
    path: topPath,
    side: "top",
    isActivePath: selectedSide === "top",
    isBoardLocked,
    cappedSide,
    fontSize: topFontSize,
    onSelectSide,
    onRemove: onRemoveTopPathItem,
  });

  const bottomBoardState = buildBoardTokens({
    path: bottomPath,
    side: "bottom",
    isActivePath: selectedSide === "bottom",
    isBoardLocked,
    cappedSide,
    fontSize: bottomFontSize,
    onSelectSide,
    onRemove: onRemoveBottomPathItem,
  });

  const boardCells = TOP_ORDER.map((coord) => {
    const topToken = topBoardState.tokens.find(
      (token) => token.coord.row === coord.row && token.coord.col === coord.col,
    );
    const bottomToken = bottomBoardState.tokens.find(
      (token) => token.coord.row === coord.row && token.coord.col === coord.col,
    );
    const topEllipsis =
      topBoardState.ellipsis?.coord.row === coord.row && topBoardState.ellipsis.coord.col === coord.col
        ? topBoardState.ellipsis
        : null;
    const bottomEllipsis =
      bottomBoardState.ellipsis?.coord.row === coord.row && bottomBoardState.ellipsis.coord.col === coord.col
        ? bottomBoardState.ellipsis
        : null;

    return {
      coord,
      topToken,
      bottomToken,
      topEllipsis,
      bottomEllipsis,
    };
  });

  return (
    <section className="game-left-panel">
      <div className="game-left-panel__status-row">
        <span className="game-left-panel__status-pill">Current hops: {currentHops}</span>
        <span className="game-left-panel__status-pill game-left-panel__status-pill--muted">
          Optimal hops: {optimalHops ?? "--"}
        </span>
      </div>

      {completedPath ? (
        <>
          <div className="game-left-panel__completion-heading">Completed path</div>
          {renderCompletedBoard(completedPath)}
        </>
      ) : (
        <>
          <div
            className={`game-left-panel__actor-box game-left-panel__actor-box--top${selectedSide === "top" ? " game-left-panel__actor-box--selected-side-top" : ""}`}
            onClick={() => onSelectSide("top")}
          >
            {actorA.label}
          </div>

          <div className="game-left-panel__path-area">
            <div className="game-left-panel__board">
              {boardCells.map(({ coord, topToken, bottomToken, topEllipsis, bottomEllipsis }) => (
                <div
                  key={`cell-${coord.row}-${coord.col}`}
                  className="game-left-panel__board-cell"
                  style={{ gridColumn: coord.col + 1, gridRow: coord.row + 1 }}
                >
                  {topToken ? renderBoardToken(topToken) : topEllipsis ? renderBoardEllipsis(topEllipsis) : null}
                  {bottomToken
                    ? renderBoardToken(bottomToken)
                    : bottomEllipsis
                      ? renderBoardEllipsis(bottomEllipsis)
                      : null}
                </div>
              ))}
            </div>
          </div>

          <div
            className={`game-left-panel__actor-box game-left-panel__actor-box--bottom${selectedSide === "bottom" ? " game-left-panel__actor-box--selected-side-bottom" : ""}`}
            onClick={() => onSelectSide("bottom")}
          >
            {actorB.label}
          </div>
        </>
      )}
    </section>
  );
}

export default GameLeftPanel;
