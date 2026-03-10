import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import HomeButton from "../components/HomeButton";
import GameLogo from "../components/GameLogo";
import { GameLeftPanel, GameRightPanel } from "../components/game";
import "./GamePage.css";

const MAX_PATH_LENGTH = 19;

function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const actorA = location.state?.actorA || "George Clooney";
  const actorB = location.state?.actorB || "Tobey Maguire";

  const [selectedSide, setSelectedSide] = useState<"top" | "bottom">("top");

  const [topPath, setTopPath] = useState<string[]>([]);
  const [bottomPath, setBottomPath] = useState<string[]>([]);
  const [lockedSide, setLockedSide] = useState<"top" | "bottom" | null>(null);

  const [turns, setTurns] = useState(0);
  const [rewinds, setRewinds] = useState(0);
  const [shuffles, setShuffles] = useState(0);

  const suggestions = [
    "Ocean's Eleven",
    "Burn After Reading",
    "The Perfect Storm",
    "Gravity",
    "Michael Clayton",
    "Batman & Robin",
  ];

  const totalSelections = topPath.length + bottomPath.length;
  const isPathLimitReached = totalSelections >= MAX_PATH_LENGTH;

  const handleSuggestion = (choice: string) => {
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

  const handleResetBoard = () => {
    setSelectedSide("top");
    setTopPath([]);
    setBottomPath([]);
    setLockedSide(null);
    setTurns(0);
    setRewinds(0);
    setShuffles(0);
  };

  const currentSelection =
    selectedSide === "top"
      ? topPath.length > 0
        ? topPath[topPath.length - 1]
        : actorA
      : bottomPath.length > 0
      ? bottomPath[bottomPath.length - 1]
      : actorB;

  return (
    <div className="gamePage">
      <div className="topBar">
        <div className="topBarSide topBarSideLeft">
          <button className="backButton" style={{ fontSize: "1.3em", padding: "0.5em 1.2em" }} onClick={() => navigate("/adventure")}>
            ← Back
          </button>
        </div>
        <div className="topBarCenter">
          <GameLogo className="gameLogo" />
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
            currentSelection={currentSelection}
            suggestions={suggestions}
            turns={turns}
            rewinds={rewinds}
            shuffles={shuffles}
            isDisabled={isPathLimitReached}
            onSuggestion={handleSuggestion}
            onShuffle={() => setShuffles((count) => count + 1)}
            onResetBoard={handleResetBoard}
          />
        </div>
      </div>
    </div>
  );
}

export default GamePage;