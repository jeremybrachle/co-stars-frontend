import { useCallback, useEffect, useRef, useState } from "react";
import "./GameLeftPanel.css";
import EntityArtwork from "../EntityArtwork";
import WriteInAutosuggestField from "./WriteInAutosuggestField";
import { useIsCompactPhoneViewport } from "../../hooks/useIsCompactPhoneViewport";
import type { GameNode } from "../../types";
import { MAX_PATH_LENGTH } from "../../gameplay";
import type { NodeType } from "../../types";
import { formatGameNodeMeta } from "../../data/presentation";

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
  showWriteInSuggestions: boolean;
  isSubmittingWriteIn: boolean;
  isSuggestionPanelVisible: boolean;
  showSuggestionToggle: boolean;
  showSideSwapButton: boolean;
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
  onSwapSides: () => void;
  onOpenWriteIn: (side: SelectedSide) => void;
  onCloseWriteIn: () => void;
  onWriteInValueChange: (value: string) => void;
  onSubmitWriteIn: () => void;
  onSelectWriteInSuggestion: (suggestion: GameNode) => void;
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
  showSuggestionList,
  isSubmitting,
  isDisabled,
  onChange,
  onClose,
  onSubmit,
  onSuggestionSelect,
  autoFocusInput = false,
  variant = "inline",
}: {
  side: Side;
  value: string;
  placeholder: string;
  suggestions: GameNode[];
  autoSuggestEnabled: boolean;
  showSuggestionList: boolean;
  isSubmitting: boolean;
  isDisabled: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onSuggestionSelect: (suggestion: GameNode) => void;
  autoFocusInput?: boolean;
  variant?: "inline" | "dialog";
}) {
  const showEmptyState = suggestions.length === 0;

  return (
    <div className={`game-left-panel__write-in-panel game-left-panel__write-in-panel--${side}${variant === "dialog" ? " game-left-panel__write-in-panel--dialog" : ""}`}>
      {variant === "dialog" ? (
        <div className="game-left-panel__write-in-title">
          {side === "top" ? "Add top path entry" : "Add bottom path entry"}
        </div>
      ) : null}
      {showSuggestionList ? (
        <div className="game-left-panel__write-in-suggestion-shell">
          <div className="game-left-panel__write-in-suggestion-list" role="listbox" aria-label={`${side} board write in suggestions`}>
            {showEmptyState ? (
              <div className="game-left-panel__write-in-suggestion-empty">No filtered options are available right now.</div>
            ) : (
              suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.type}-${suggestion.id ?? suggestion.label}`}
                  type="button"
                  className="write-in-autosuggest__option"
                  onClick={() => onSuggestionSelect(suggestion)}
                  disabled={isDisabled || isSubmitting}
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
                    <span className="write-in-autosuggest__option-meta">{formatGameNodeMeta(suggestion)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
      <WriteInAutosuggestField
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
        suggestions={suggestions}
        autoSuggestEnabled={autoSuggestEnabled}
        disabled={isDisabled || isSubmitting}
        autoFocus={autoFocusInput}
        inputClassName="game-left-panel__write-in-input"
        dropdownLabel={`${side} board write in suggestions`}
        emptyMessage="No matching write-ins."
        onSuggestionSelect={onSuggestionSelect}
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

function MobileWriteInSheet({
  side,
  value,
  placeholder,
  suggestions,
  autoSuggestEnabled,
  showSuggestionList,
  isSubmitting,
  isDisabled,
  isInputMode,
  onChange,
  onClose,
  onSubmit,
  onSuggestionSelect,
  onOpenInput,
}: {
  side: Side;
  value: string;
  placeholder: string;
  suggestions: GameNode[];
  autoSuggestEnabled: boolean;
  showSuggestionList: boolean;
  isSubmitting: boolean;
  isDisabled: boolean;
  isInputMode: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onSuggestionSelect: (suggestion: GameNode) => void;
  onOpenInput: () => void;
}) {
  if (isInputMode) {
    return (
      <BoardWriteInBox
        side={side}
        value={value}
        placeholder={placeholder}
        suggestions={suggestions}
        autoSuggestEnabled={autoSuggestEnabled}
        showSuggestionList={showSuggestionList}
        isSubmitting={isSubmitting}
        isDisabled={isDisabled}
        onChange={onChange}
        onClose={onClose}
        onSubmit={onSubmit}
        onSuggestionSelect={onSuggestionSelect}
        autoFocusInput
        variant="dialog"
      />
    );
  }

  const showEmptyState = suggestions.length === 0;
  const emptyMessage = autoSuggestEnabled
    ? "No filtered options are available right now."
    : "Suggestion list is off. Use the pen button to search manually.";

  return (
    <div className="game-left-panel__mobile-picker-sheet">
      <div className="game-left-panel__mobile-picker-header">
        <div className="game-left-panel__write-in-title">
          {side === "top" ? "Top path options" : "Bottom path options"}
        </div>
        <div className="game-left-panel__mobile-picker-subtitle">
          {autoSuggestEnabled ? "Choose a filtered option or switch to write-in." : "Write-in is available below."}
        </div>
      </div>

      <div className="game-left-panel__mobile-picker-list" role="listbox" aria-label={`${side} board write in suggestions`}>
        {showEmptyState ? (
          <div className="game-left-panel__mobile-picker-empty">{emptyMessage}</div>
        ) : (
          suggestions.map((suggestion) => (
            <button
              key={`${suggestion.type}-${suggestion.id ?? suggestion.label}`}
              type="button"
              className="write-in-autosuggest__option"
              onClick={() => onSuggestionSelect(suggestion)}
              disabled={isDisabled || isSubmitting}
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
                <span className="write-in-autosuggest__option-meta">{formatGameNodeMeta(suggestion)}</span>
              </span>
            </button>
          ))
        )}
      </div>

      <div className="game-left-panel__mobile-picker-actions">
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
          className={`game-left-panel__write-in-button game-left-panel__mobile-picker-pen${showEmptyState ? " game-left-panel__mobile-picker-pen--emphasized" : ""}`}
          onClick={onOpenInput}
          disabled={isDisabled || isSubmitting}
          aria-label="Write in manually"
          title="Write in manually"
        >
          ✎
        </button>
      </div>
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
        className={`game-left-panel__actor-box game-left-panel__board-box${isCurrent ? " game-left-panel__actor-box--path-current-primary game-left-panel__board-box--current" : " game-left-panel__actor-box--placed game-left-panel__board-box--past"}`}
        style={{ fontSize: `${fontSize}px` }}
        onClick={onInspect}
      >
        <div className={`game-left-panel__node-identity${isCurrent ? " game-left-panel__node-identity--current" : " game-left-panel__node-identity--past"}`}>
          <EntityArtwork
            type={node.type}
            label={node.label}
            imageUrl={node.imageUrl}
            className="game-left-panel__node-artwork"
            imageClassName="game-left-panel__node-artwork-image"
            placeholderClassName="game-left-panel__node-artwork-emoji"
          />
          <span className={`game-left-panel__node-label${isCurrent ? " game-left-panel__node-label--current" : " game-left-panel__node-label--past"}`}>{node.label}</span>
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
    isCompactPhoneViewport: boolean;
    activeWriteInSide: SelectedSide | null;
    writeInValue: string;
    writeInPlaceholder: string;
    writeInSuggestions: GameNode[];
    writeInAutoSuggestEnabled: boolean;
    showWriteInSuggestions: boolean;
    isSubmittingWriteIn: boolean;
    isInteractionDisabled: boolean;
    onOpenWriteIn: (side: SelectedSide) => void;
    onCloseWriteIn: () => void;
    onWriteInValueChange: (value: string) => void;
    onSubmitWriteIn: () => void;
    onSelectWriteInSuggestion: (suggestion: GameNode) => void;
  },
) {
  const arrowClassName = `game-left-panel__arrow game-left-panel__board-arrow ${ellipsis.side === "top" ? "game-left-panel__board-arrow--up-origin" : "game-left-panel__board-arrow--down-origin"}${ellipsis.isDimmed ? " game-left-panel__board-arrow--inactive" : ""}`;
  const isWriteInOpen = options.activeWriteInSide === ellipsis.side;
  const shouldRenderInlineWriteIn = isWriteInOpen && !options.isCompactPhoneViewport;

  return (
    <div className={`game-left-panel__board-slot${ellipsis.isDimmed ? " game-left-panel__board-slot--inactive" : ""}`}>
      {ellipsis.startArrow ? <span className={arrowClassName}>{ellipsis.startArrow}</span> : null}
      {shouldRenderInlineWriteIn ? (
        <BoardWriteInBox
          side={ellipsis.side}
          value={options.writeInValue}
          placeholder={options.writeInPlaceholder}
          suggestions={options.writeInSuggestions}
          autoSuggestEnabled={options.writeInAutoSuggestEnabled}
          showSuggestionList={options.showWriteInSuggestions}
          isSubmitting={options.isSubmittingWriteIn}
          isDisabled={options.isInteractionDisabled}
          onChange={options.onWriteInValueChange}
          onClose={options.onCloseWriteIn}
          onSubmit={options.onSubmitWriteIn}
          onSuggestionSelect={options.onSelectWriteInSuggestion}
        />
      ) : (
        <PlusWriteInTrigger
          onClick={() => options.onOpenWriteIn(ellipsis.side)}
          highlight={!ellipsis.isDimmed || isWriteInOpen}
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
                  <div className="game-left-panel__node-identity game-left-panel__completed-node-identity">
                    <EntityArtwork
                      type={node.type}
                      label={node.label}
                      imageUrl={node.imageUrl}
                      className="game-left-panel__node-artwork"
                      imageClassName="game-left-panel__node-artwork-image"
                      placeholderClassName="game-left-panel__node-artwork-emoji"
                    />
                    <span className="game-left-panel__node-label game-left-panel__completed-node-label">{node.label}</span>
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
  showWriteInSuggestions,
  isSubmittingWriteIn,
  isSuggestionPanelVisible,
  showSuggestionToggle,
  showSideSwapButton,
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
  onSwapSides,
  onOpenWriteIn,
  onCloseWriteIn,
  onWriteInValueChange,
  onSubmitWriteIn,
  onSelectWriteInSuggestion,
  onRemoveTopPathItem,
  onRemoveBottomPathItem,
}: Props) {
  const isCompactPhoneViewport = useIsCompactPhoneViewport();
  const [isMobileWriteInInputMode, setIsMobileWriteInInputMode] = useState(false);
  const leftPanelRef = useRef<HTMLElement | null>(null);
  const baseFont = 22;
  const minFont = 12;
  const topFontSize = Math.max(minFont, baseFont - topPath.length * 2);
  const bottomFontSize = Math.max(minFont, baseFont - bottomPath.length * 2);
  const isBoardLocked = topPath.length + bottomPath.length >= MAX_PATH_LENGTH;
  const cappedSide = isBoardLocked ? lockedSide : null;
  const shouldShowHiddenPanelFooter = !completedPath && !isSuggestionPanelVisible;
  const shouldShowTopWarning = shouldShowHiddenPanelFooter && Boolean(hiddenPanelMessage) && selectedSide === "top";
  const shouldShowBottomWarning = shouldShowHiddenPanelFooter && Boolean(hiddenPanelMessage) && selectedSide === "bottom";
  const mobileWriteInSide = isCompactPhoneViewport ? activeWriteInSide : null;

  const handleOpenWriteIn = useCallback((side: SelectedSide) => {
    setIsMobileWriteInInputMode(false);
    onOpenWriteIn(side);
  }, [onOpenWriteIn]);

  const handleCloseWriteIn = useCallback(() => {
    setIsMobileWriteInInputMode(false);
    onCloseWriteIn();
  }, [onCloseWriteIn]);

  useEffect(() => {
    if (!activeWriteInSide || isCompactPhoneViewport) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!leftPanelRef.current) {
        return;
      }

      const writeInPanel = leftPanelRef.current.querySelector(".game-left-panel__write-in-panel");
      const ellipsisButton = leftPanelRef.current.querySelector(".game-left-panel__ellipsis");

      if ((writeInPanel instanceof Element && writeInPanel.contains(target)) || (ellipsisButton instanceof Element && ellipsisButton.contains(target))) {
        return;
      }

      handleCloseWriteIn();
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [activeWriteInSide, handleCloseWriteIn, isCompactPhoneViewport]);

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
    <section ref={leftPanelRef} className={`game-left-panel${shouldShowHiddenPanelFooter ? " game-left-panel--suggestions-hidden" : ""}`}>
      <div className="game-left-panel__status-row">
        <div className="game-left-panel__status-slot game-left-panel__status-slot--left">
          <span className="game-left-panel__status-pill">Current hops: {currentHops}</span>
        </div>
        {showSuggestionToggle ? (
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
        ) : showSideSwapButton ? (
          <button
            type="button"
            className="game-left-panel__panel-toggle game-left-panel__panel-toggle--swap"
            onClick={onSwapSides}
            aria-label="Swap the current top and bottom selections"
            title="Swap the current top and bottom selections"
          >
            <span className="game-left-panel__panel-toggle-emoji" aria-hidden="true">⇅</span>
          </button>
        ) : <span className="game-left-panel__panel-toggle-spacer" aria-hidden="true" />}
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
                    isCompactPhoneViewport,
                    activeWriteInSide,
                    writeInValue,
                    writeInPlaceholder,
                    writeInSuggestions,
                    writeInAutoSuggestEnabled,
                    showWriteInSuggestions,
                    isSubmittingWriteIn,
                    isInteractionDisabled,
                    onOpenWriteIn: handleOpenWriteIn,
                    onCloseWriteIn: handleCloseWriteIn,
                    onWriteInValueChange,
                    onSubmitWriteIn,
                    onSelectWriteInSuggestion,
                  }) : null}
                  {bottomToken
                    ? renderBoardToken(bottomToken)
                    : bottomEllipsis
                      ? renderBoardEllipsis(bottomEllipsis, {
                        isCompactPhoneViewport,
                        activeWriteInSide,
                        writeInValue,
                        writeInPlaceholder,
                        writeInSuggestions,
                        writeInAutoSuggestEnabled,
                        showWriteInSuggestions,
                        isSubmittingWriteIn,
                        isInteractionDisabled,
                        onOpenWriteIn: handleOpenWriteIn,
                        onCloseWriteIn: handleCloseWriteIn,
                        onWriteInValueChange,
                        onSubmitWriteIn,
                        onSelectWriteInSuggestion,
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

      {mobileWriteInSide ? (
        <div className="game-left-panel__write-in-overlay" onClick={handleCloseWriteIn}>
          <div className="game-left-panel__write-in-dialog" onClick={(event) => event.stopPropagation()}>
            <MobileWriteInSheet
              side={mobileWriteInSide}
              value={writeInValue}
              placeholder={writeInPlaceholder}
              suggestions={writeInSuggestions}
              autoSuggestEnabled={writeInAutoSuggestEnabled}
              showSuggestionList={showWriteInSuggestions}
              isSubmitting={isSubmittingWriteIn}
              isDisabled={isInteractionDisabled}
              isInputMode={isMobileWriteInInputMode}
              onChange={onWriteInValueChange}
              onClose={handleCloseWriteIn}
              onSubmit={onSubmitWriteIn}
              onSuggestionSelect={onSelectWriteInSuggestion}
              onOpenInput={() => setIsMobileWriteInInputMode(true)}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default GameLeftPanel;
