import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import HomeButton from "../components/HomeButton";
import GameLogo from "../components/GameLogo";
import { GameLeftPanel, GameRightPanel } from "../components/game";
import type { GameNode, NodeType } from "../types";
import "./GamePage.css";

const MAX_PATH_LENGTH = 19;

type RouteGameNode = {
  label?: string;
  name?: string;
  title?: string;
  type?: NodeType;
};

type GamePageRouteState = {
  startA?: RouteGameNode | string;
  startB?: RouteGameNode | string;
  actorA?: string;
  actorB?: string;
  movieA?: string;
  movieB?: string;
};

const TEST_MOVIE_SUGGESTIONS: GameNode[] = [
  { label: "Ocean's Eleven", type: "movie" },
  { label: "Burn After Reading", type: "movie" },
  { label: "The Perfect Storm", type: "movie" },
  { label: "Gravity", type: "movie" },
  { label: "Michael Clayton", type: "movie" },
  { label: "Batman & Robin", type: "movie" },
];

const TEST_ACTOR_SUGGESTIONS: GameNode[] = [
  { label: "Matt Damon", type: "actor" },
  { label: "Julia Roberts", type: "actor" },
  { label: "Brad Pitt", type: "actor" },
  { label: "Sandra Bullock", type: "actor" },
  { label: "Cate Blanchett", type: "actor" },
  { label: "Don Cheadle", type: "actor" },
];

function createNode(label: string, type: NodeType): GameNode {
  return { label, type };
}

function normalizeRouteNode(value: RouteGameNode | string | undefined, fallbackType: NodeType, fallbackLabel: string) {
  if (typeof value === "string") {
    return createNode(value, fallbackType);
  }

  if (value) {
    const label = value.label ?? value.name ?? value.title ?? fallbackLabel;
    return createNode(label, value.type ?? fallbackType);
  }

  return createNode(fallbackLabel, fallbackType);
}

function getSuggestionsForType(selectionType: NodeType) {
  return selectionType === "actor" ? TEST_MOVIE_SUGGESTIONS : TEST_ACTOR_SUGGESTIONS;
}

function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = (location.state as GamePageRouteState | null) ?? null;

  const initialActorA = normalizeRouteNode(
    routeState?.startA ?? routeState?.movieA ?? routeState?.actorA,
    routeState?.movieA ? "movie" : "actor",
    "George Clooney",
  );
  const initialActorB = normalizeRouteNode(
    routeState?.startB ?? routeState?.movieB ?? routeState?.actorB,
    routeState?.movieB ? "movie" : "actor",
    "Tobey Maguire",
  );

  const [actorA, setActorA] = useState(initialActorA);
  const [actorB, setActorB] = useState(initialActorB);

  const [selectedSide, setSelectedSide] = useState<"top" | "bottom">("top");

  const [topPath, setTopPath] = useState<GameNode[]>([]);
  const [bottomPath, setBottomPath] = useState<GameNode[]>([]);
  const [lockedSide, setLockedSide] = useState<"top" | "bottom" | null>(null);

  const [turns, setTurns] = useState(0);
  const [rewinds, setRewinds] = useState(0);
  const [shuffles, setShuffles] = useState(0);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  const totalSelections = topPath.length + bottomPath.length;
  const isPathLimitReached = totalSelections >= MAX_PATH_LENGTH;

  const currentSelection =
    selectedSide === "top"
      ? topPath.length > 0
        ? topPath[topPath.length - 1]
        : actorA
      : bottomPath.length > 0
        ? bottomPath[bottomPath.length - 1]
        : actorB;

  const suggestions = getSuggestionsForType(currentSelection.type);

  const handleSuggestion = (choice: GameNode) => {
    if (isPathLimitReached) {
      return;
    }

    if (totalSelections + 1 >= MAX_PATH_LENGTH) {
      setLockedSide(selectedSide);
    }

    if (selectedSide === "top") {
      setTopPath((currentPath) => [...currentPath, choice]);
    } else {
      setBottomPath((currentPath) => [...currentPath, choice]);
    }

    setTurns((currentTurns) => currentTurns + 1);
  };

  const handleRemoveTopPathItem = () => {
    if (topPath.length === 0) {
      return;
    }

    setTopPath((currentPath) => currentPath.slice(0, -1));
    setLockedSide(null);
    setRewinds((currentRewinds) => currentRewinds + 1);
  };

  const handleRemoveBottomPathItem = () => {
    if (bottomPath.length === 0) {
      return;
    }

    setBottomPath((currentPath) => currentPath.slice(0, -1));
    setLockedSide(null);
    setRewinds((currentRewinds) => currentRewinds + 1);
  };

  const handleBackCurrentPathItem = () => {
    if (selectedSide === "top") {
      handleRemoveTopPathItem();
      return;
    }

    handleRemoveBottomPathItem();
  };

  const handleReverseSides = () => {
    setActorA(actorB);
    setActorB(actorA);
    setTopPath(bottomPath);
    setBottomPath(topPath);
    setLockedSide((currentLockedSide) => {
      if (currentLockedSide === "top") {
        return "bottom";
      }

      if (currentLockedSide === "bottom") {
        return "top";
      }

      return null;
    });
  };

  const handleResetBoard = () => {
    setSelectedSide("top");
    setTopPath([]);
    setBottomPath([]);
    setLockedSide(null);
    setTurns(0);
    setRewinds(0);
    setShuffles(0);
  };

  return (
    <div className="gamePage">
      <div className="topBar">
        <div className="topBarSide topBarSideLeft">
          <button className="backButton" style={{ fontSize: "1.3em", padding: "0.5em 1.2em" }} onClick={() => navigate("/adventure")}>
            ← Back
          </button>
        </div>
        <div className="topBarCenter">
          <button type="button" className="gameLogoButton" onClick={handleResetBoard} aria-label="Reset board" title="Reset board">
            <GameLogo className="gameLogo" />
            <span className="gameLogoResetHint" aria-hidden="true">Reset board</span>
          </button>
        </div>
        <div className="topBarSide topBarSideRight homeWrapper">
          <HomeButton />
        </div>
      </div>

      <div className="gameContainer">
        <GameLeftPanel
          actorA={actorA}
          actorB={actorB}
          selectedSide={selectedSide}
          topPath={topPath}
          bottomPath={bottomPath}
          lockedSide={lockedSide}
          onSelectSide={setSelectedSide}
          onRemoveTopPathItem={handleRemoveTopPathItem}
          onRemoveBottomPathItem={handleRemoveBottomPathItem}
        />
        <div className="gameSidebar">
          <div className={`gameSidebarWarning${isPathLimitReached ? " gameSidebarWarning--visible" : ""}`}>
            Max path length reached. Try again and keep it under 19 total selections, or clear some selections to continue.
          </div>

          <GameRightPanel
            actorA={actorA}
            actorB={actorB}
            selectedSide={selectedSide}
            currentSelection={currentSelection}
            suggestions={suggestions}
            turns={turns}
            rewinds={rewinds}
            shuffles={shuffles}
            isDisabled={isPathLimitReached}
            onBack={handleBackCurrentPathItem}
            onSuggestion={handleSuggestion}
            onSelectSide={setSelectedSide}
            onReverse={handleReverseSides}
            onShuffle={() => setShuffles((count) => count + 1)}
          />
        </div>
      </div>

      <button type="button" className="gameInfoButton" onClick={() => setIsRulesOpen(true)} aria-label="Open game rules">
        i
      </button>

      {isRulesOpen ? (
        <div className="gameRulesOverlay" onClick={() => setIsRulesOpen(false)}>
          <div className="gameRulesDialog" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="gameRulesCloseButton" onClick={() => setIsRulesOpen(false)} aria-label="Close rules">
              ×
            </button>
            <h2 className="gameRulesTitle">How To Play</h2>
            <p className="gameRulesText">
              Connect the two starting nodes by alternating between actors and movies until both paths meet on a matching node.
            </p>
            <p className="gameRulesText">
              If your current selection is an actor, choose a movie they appear in. If your current selection is a movie, choose a costar from that movie.
            </p>
            <p className="gameRulesText">
              Use the toolbar controls to step back, reverse the starting sides, or shuffle future suggestions once that feature is implemented.
            </p>
          </div>
        </div>
      ) : null}

    </div>
  );
}

export default GamePage;