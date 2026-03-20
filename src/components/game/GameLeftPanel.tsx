import "./GameLeftPanel.css";
import EntityArtwork from "../EntityArtwork";
import WriteInAutosuggestField from "./WriteInAutosuggestField";
import type { GameNode } from "../../types";
import { MAX_PATH_LENGTH } from "../../gameplay";
import type { NodeType } from "../../types";

type SelectedSide = "top" | "bottom";
type Side = SelectedSide;
type BoardPoint = {
  row: number;
  col: number;
};

type BoardToken = {
  key: string;
  node: GameNode;
  fontSize: number;
  side: Side;
  coord: BoardPoint;
  startArrow?: string;
  outgoingArrow?: string;
  isCurrent: boolean;
  isDimmed: boolean;
  removable: boolean;
  onInspect: () => void;
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
  showOptimalTracking: boolean;
  isInteractionDisabled: boolean;
  activeWriteInSide: SelectedSide | null;
  writeInValue: string;
  writeInPlaceholder: string;
  writeInSuggestions: GameNode[];
  writeInAutoSuggestEnabled: boolean;
  isSubmittingWriteIn: boolean;
  isSuggestionPanelVisible: boolean;
  turns: number;
  rewinds: number;
  shuffles: number;
  deadEndPenalties: number;
  shuffleAddsPenalty: boolean;
  rewindAddsPenalty: boolean;
  deadEndAddsPenalty: boolean;
  hiddenPanelMessage: string | null;
  suggestionTargetType: NodeType;
  onSelectSide: (side: SelectedSide) => void;
  onInspectNode: (node: GameNode) => void;
  onToggleSuggestionPanel: () => void;
  onOpenWriteIn: (side: SelectedSide) => void;
  onCloseWriteIn: () => void;
  onWriteInValueChange: (value: string) => void;
  onSubmitWriteIn: () => void;
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

function PlusWriteInTrigger({
  onClick,
  highlight,
  disabled,
}: {
  onClick: () => void;
  highlight: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      className={`game-left-panel__actor-box game-left-panel__ellipsis${highlight ? " game-left-panel__ellipsis--active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label="Open write in"
    >
      <span className="game-left-panel__ellipsis-icon">+</span>
    </button>
  );
}

function BoardWriteInBox({
  side,
  value,
  placeholder,
  suggestions,
  autoSuggestEnabled,
  isSubmitting,
  isDisabled,
  onChange,
  onClose,
  onSubmit,
}: {
  side: Side;
  value: string;
  placeholder: string;
  suggestions: GameNode[];
  autoSuggestEnabled: boolean;
  isSubmitting: boolean;
  isDisabled: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className={`game-left-panel__write-in-panel game-left-panel__write-in-panel--${side}`}>
      <WriteInAutosuggestField
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
        suggestions={suggestions}
        autoSuggestEnabled={autoSuggestEnabled}
        disabled={isDisabled || isSubmitting}
        autoFocus
        inputClassName="game-left-panel__write-in-input"
        dropdownLabel={`${side} board write in suggestions`}
        emptyMessage="No matching write-ins."
      />
      <div className="game-left-panel__write-in-actions">
        <button
          type="button"
          className="game-left-panel__write-in-button game-left-panel__write-in-button--ghost"
          onClick={onClose}
          disabled={isDisabled || isSubmitting}
          aria-label="Close write in"
        >
          ×
        </button>
        <button
          type="button"
          className="game-left-panel__write-in-button"
          onClick={onSubmit}
          disabled={isDisabled || isSubmitting || value.trim().length === 0}
        >
          {isSubmitting ? "…" : "Go"}
        </button>
      </div>
    </div>
  );
}

function renderHiddenPanelStat(label: string, value: number | "N/A", isPenalty = false) {
  return (
    <div className="game-left-panel__score-item">
      <span className="game-left-panel__score-label">{label}</span>
      <span className={`game-left-panel__score-value${isPenalty ? " game-left-panel__score-value--penalty" : ""}`}>{value}</span>
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
  onInspectNode,
  onRemove,
}: {
  path: GameNode[];
  side: Side;
  isActivePath: boolean;
  isBoardLocked: boolean;
  cappedSide: Side | null;
  fontSize: number;
  onSelectSide: (side: Side) => void;
  onInspectNode: (node: GameNode) => void;
  onRemove: () => void;
}): { tokens: BoardToken[]; ellipsis: BoardEllipsis | null } {
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
      node: step,
      fontSize,
      side,
      coord,
      startArrow: index === 0 ? (side === "top" ? "↓" : "↑") : undefined,
      outgoingArrow: nextCoord ? getDirectionalArrow(coord, nextCoord) : undefined,
      isCurrent,
      isDimmed: !isActivePath,
      removable: isCurrent,
      onInspect: () => onInspectNode(step),
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
  node,
  fontSize,
  isCurrent,
  removable,
  onRemove,
  onInspect,
}: {
  node: GameNode;
  fontSize: number;
  isCurrent: boolean;
  removable: boolean;
  onRemove?: () => void;
  onInspect: () => void;
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
          aria-label={`Remove ${node.label} from current path`}
        >
          ×
        </button>
      ) : null}
      <div
        className={`game-left-panel__actor-box game-left-panel__board-box${isCurrent ? " game-left-panel__actor-box--path-current-primary" : " game-left-panel__actor-box--placed"}`}
        style={{ fontSize: `${fontSize}px` }}
        onClick={onInspect}
      >
        <div className="game-left-panel__node-identity">
          <EntityArtwork
            type={node.type}
            label={node.label}
            imageUrl={node.imageUrl}
            className="game-left-panel__node-artwork"
            imageClassName="game-left-panel__node-artwork-image"
            placeholderClassName="game-left-panel__node-artwork-emoji"
          />
          <span className="game-left-panel__node-label">{node.label}</span>
        </div>
      </div>
    </div>
  );
}

function renderBoardToken(token: BoardToken) {
  const tokenRow = renderStepRow({
    node: token.node,
    fontSize: token.fontSize,
    isCurrent: token.isCurrent,
    removable: token.removable,
    onRemove: token.onRemove,
    onInspect: token.onInspect,
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

function renderBoardEllipsis(
  ellipsis: BoardEllipsis,
  options: {
    activeWriteInSide: SelectedSide | null;
    writeInValue: string;
    writeInPlaceholder: string;
    writeInSuggestions: GameNode[];
    writeInAutoSuggestEnabled: boolean;
    isSubmittingWriteIn: boolean;
    isInteractionDisabled: boolean;
    onOpenWriteIn: (side: SelectedSide) => void;
    onCloseWriteIn: () => void;
    onWriteInValueChange: (value: string) => void;
    onSubmitWriteIn: () => void;
  },
) {
  const arrowClassName = `game-left-panel__arrow game-left-panel__board-arrow ${ellipsis.side === "top" ? "game-left-panel__board-arrow--up-origin" : "game-left-panel__board-arrow--down-origin"}${ellipsis.isDimmed ? " game-left-panel__board-arrow--inactive" : ""}`;
  const isWriteInOpen = options.activeWriteInSide === ellipsis.side;

  return (
    <div className={`game-left-panel__board-slot${ellipsis.isDimmed ? " game-left-panel__board-slot--inactive" : ""}`}>
      {ellipsis.startArrow ? <span className={arrowClassName}>{ellipsis.startArrow}</span> : null}
      {isWriteInOpen ? (
        <BoardWriteInBox
          side={ellipsis.side}
          value={options.writeInValue}
          placeholder={options.writeInPlaceholder}
          suggestions={options.writeInSuggestions}
          autoSuggestEnabled={options.writeInAutoSuggestEnabled}
          isSubmitting={options.isSubmittingWriteIn}
          isDisabled={options.isInteractionDisabled}
          onChange={options.onWriteInValueChange}
          onClose={options.onCloseWriteIn}
          onSubmit={options.onSubmitWriteIn}
        />
      ) : (
        <PlusWriteInTrigger
          onClick={() => options.onOpenWriteIn(ellipsis.side)}
          highlight={!ellipsis.isDimmed}
          disabled={options.isInteractionDisabled}
        />
      )}
    </div>
  );
}

function renderCompletedBoard(completedPath: GameNode[], onInspectNode: (node: GameNode) => void) {
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
          gap: rows === 2 ? "10px 26px" : undefined,
        }}
      >
        {completedPath.map((node, index) => {
          const coord = snakeOrder[index];
          const nextCoord = index < completedPath.length - 1 ? snakeOrder[index + 1] : undefined;
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
                  onClick={() => onInspectNode(node)}
                >
                  <div className="game-left-panel__node-identity">
                    <EntityArtwork
                      type={node.type}
                      label={node.label}
                      imageUrl={node.imageUrl}
                      className="game-left-panel__node-artwork"
                      imageClassName="game-left-panel__node-artwork-image"
                      placeholderClassName="game-left-panel__node-artwork-emoji"
                    />
                    <span className="game-left-panel__node-label">{node.label}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderEndpoint(node: GameNode, side: SelectedSide, isSelected: boolean, onInspectNode: (node: GameNode) => void) {
  return (
    <div
      className={`game-left-panel__actor-box game-left-panel__endpoint${side === "top" ? " game-left-panel__actor-box--top" : " game-left-panel__actor-box--bottom"}${isSelected ? ` game-left-panel__actor-box--selected-side-${side}` : ""}`}
      onClick={() => onInspectNode(node)}
    >
      <div className="game-left-panel__node-identity game-left-panel__node-identity--endpoint">
        <EntityArtwork
          type={node.type}
          label={node.label}
          imageUrl={node.imageUrl}
          className="game-left-panel__endpoint-artwork"
          imageClassName="game-left-panel__node-artwork-image"
          placeholderClassName="game-left-panel__node-artwork-emoji"
        />
        <span className="game-left-panel__endpoint-label">{node.label}</span>
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
  showOptimalTracking,
  isInteractionDisabled,
  activeWriteInSide,
  writeInValue,
  writeInPlaceholder,
  writeInSuggestions,
  writeInAutoSuggestEnabled,
  isSubmittingWriteIn,
  isSuggestionPanelVisible,
  turns,
  rewinds,
  shuffles,
  deadEndPenalties,
  shuffleAddsPenalty,
  rewindAddsPenalty,
  deadEndAddsPenalty,
  hiddenPanelMessage,
  suggestionTargetType,
  onSelectSide,
  onInspectNode,
  onToggleSuggestionPanel,
  onOpenWriteIn,
  onCloseWriteIn,
  onWriteInValueChange,
  onSubmitWriteIn,
  onRemoveTopPathItem,
  onRemoveBottomPathItem,
}: Props) {
  const baseFont = 22;
  const minFont = 12;
  const topFontSize = Math.max(minFont, baseFont - topPath.length * 2);
  const bottomFontSize = Math.max(minFont, baseFont - bottomPath.length * 2);
  const isBoardLocked = topPath.length + bottomPath.length >= MAX_PATH_LENGTH;
  const cappedSide = isBoardLocked ? lockedSide : null;
  const shouldShowHiddenPanelFooter = !completedPath && !isSuggestionPanelVisible;
  const shouldShowTopWarning = shouldShowHiddenPanelFooter && Boolean(hiddenPanelMessage) && selectedSide === "top";
  const shouldShowBottomWarning = shouldShowHiddenPanelFooter && Boolean(hiddenPanelMessage) && selectedSide === "bottom";

  const topBoardState = buildBoardTokens({
    path: topPath,
    side: "top",
    isActivePath: selectedSide === "top",
    isBoardLocked,
    cappedSide,
    fontSize: topFontSize,
    onSelectSide,
    onInspectNode,
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
    onInspectNode,
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
    <section className={`game-left-panel${shouldShowHiddenPanelFooter ? " game-left-panel--suggestions-hidden" : ""}`}>
      <div className="game-left-panel__status-row">
        <div className="game-left-panel__status-slot game-left-panel__status-slot--left">
          <span className="game-left-panel__status-pill">Current hops: {currentHops}</span>
        </div>
        <button
          type="button"
          className={`game-left-panel__panel-toggle${isSuggestionPanelVisible ? " game-left-panel__panel-toggle--active" : ""}`}
          onClick={onToggleSuggestionPanel}
          aria-label={isSuggestionPanelVisible ? "Hide suggestion panel" : "Show suggestion panel"}
          title={isSuggestionPanelVisible ? "Hide suggestion panel" : "Show suggestion panel"}
        >
          <span className="game-left-panel__panel-toggle-emoji" aria-hidden="true">
            {suggestionTargetType === "movie" ? "🎬" : "🎭"}
          </span>
        </button>
        <div className="game-left-panel__status-slot game-left-panel__status-slot--right">
          {showOptimalTracking ? (
            <span className="game-left-panel__status-pill game-left-panel__status-pill--muted">
              Optimal hops: {optimalHops ?? "--"}
            </span>
          ) : null}
        </div>
      </div>

      {completedPath ? (
        <>
          {renderEndpoint(actorA, "top", false, onInspectNode)}
          <div className="game-left-panel__completion-heading">Completed path</div>
          {renderCompletedBoard(completedPath, onInspectNode)}
          {renderEndpoint(actorB, "bottom", false, onInspectNode)}
        </>
      ) : (
        <>
          {renderEndpoint(actorA, "top", selectedSide === "top", onInspectNode)}

          {shouldShowTopWarning ? <div className="game-left-panel__hidden-message game-left-panel__hidden-message--top">{hiddenPanelMessage}</div> : null}

          <div className="game-left-panel__path-area">
            <div className="game-left-panel__board">
              {boardCells.map(({ coord, topToken, bottomToken, topEllipsis, bottomEllipsis }) => (
                <div
                  key={`cell-${coord.row}-${coord.col}`}
                  className="game-left-panel__board-cell"
                  style={{ gridColumn: coord.col + 1, gridRow: coord.row + 1 }}
                >
                  {topToken ? renderBoardToken(topToken) : topEllipsis ? renderBoardEllipsis(topEllipsis, {
                    activeWriteInSide,
                    writeInValue,
                    writeInPlaceholder,
                    writeInSuggestions,
                    writeInAutoSuggestEnabled,
                    isSubmittingWriteIn,
                    isInteractionDisabled,
                    onOpenWriteIn,
                    onCloseWriteIn,
                    onWriteInValueChange,
                    onSubmitWriteIn,
                  }) : null}
                  {bottomToken
                    ? renderBoardToken(bottomToken)
                    : bottomEllipsis
                      ? renderBoardEllipsis(bottomEllipsis, {
                        activeWriteInSide,
                        writeInValue,
                        writeInPlaceholder,
                        writeInSuggestions,
                        writeInAutoSuggestEnabled,
                        isSubmittingWriteIn,
                        isInteractionDisabled,
                        onOpenWriteIn,
                        onCloseWriteIn,
                        onWriteInValueChange,
                        onSubmitWriteIn,
                      })
                      : null}
                </div>
              ))}
            </div>
          </div>

          {shouldShowBottomWarning ? <div className="game-left-panel__hidden-message game-left-panel__hidden-message--bottom">{hiddenPanelMessage}</div> : null}

          {renderEndpoint(actorB, "bottom", selectedSide === "bottom", onInspectNode)}

          {shouldShowHiddenPanelFooter ? (
            <div className="game-left-panel__footer">
              <div className="game-left-panel__score-panel">
                {renderHiddenPanelStat("Turns:", turns)}
                {renderHiddenPanelStat("Rewinds:", rewindAddsPenalty ? rewinds : "N/A")}
                {renderHiddenPanelStat("Shuffles:", shuffleAddsPenalty ? shuffles : "N/A")}
                {renderHiddenPanelStat("Dead-ends:", deadEndAddsPenalty ? deadEndPenalties : "N/A", deadEndAddsPenalty && deadEndPenalties > 0)}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default GameLeftPanel;
