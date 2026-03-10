import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import HomeButton from "../components/HomeButton";
import "./GamePage.css";

// Unicode icons
const DownArrow = () => <span style={{ fontSize: "1.5em", display: "block", textAlign: "center" }}>↓</span>;
const UpArrow = () => <span style={{ fontSize: "1.5em", display: "block", textAlign: "center" }}>↑</span>;

const VerticalEllipsisBox = ({ onClick, highlight }: { onClick?: () => void; highlight?: boolean }) => (
  <div
    className={`actorBox ellipsisBox${highlight ? " current" : ""}`}
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: 36,
      height: 36,
      margin: "10px auto",
      cursor: onClick ? "pointer" : "default",
      borderColor: highlight ? "#facc15" : undefined,
    }}
    onClick={onClick}
  >
    <span style={{ fontSize: "1.2em" }}>⋮</span>
  </div>
);

function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();

  const actorA = location.state?.actorA || "George Clooney";
  const actorB = location.state?.actorB || "Tobey Maguire";

  const [selectedSide, setSelectedSide] = useState<"top" | "bottom">("top");

  const [topPath, setTopPath] = useState<string[]>([]);
  const [bottomPath, setBottomPath] = useState<string[]>([]);

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

  const handleSuggestion = (choice: string) => {
    if (selectedSide === "top") setTopPath([...topPath, choice]);
    else setBottomPath([...bottomPath, choice]);
  };

  const currentSelection =
    selectedSide === "top"
      ? topPath.length > 0
        ? topPath[topPath.length - 1]
        : actorA
      : bottomPath.length > 0
      ? bottomPath[bottomPath.length - 1]
      : actorB;

  const baseFont = 22;
  const minFont = 12;

  const renderTopPath = (pathArr: string[], onSelect: (idx: number) => void) => {
    const fontSize = Math.max(minFont, baseFont - pathArr.length * 2);
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <DownArrow />
        {pathArr.map((step, idx) => {
          const isLast = idx === pathArr.length - 1;
          return (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                className={`actorBox completed${isLast ? " current" : ""}`}
                style={{ cursor: isLast ? "pointer" : "default", fontSize }}
                onClick={isLast ? () => onSelect(idx) : undefined}
              >
                {step}
              </div>
              <DownArrow />
            </div>
          );
        })}
        <VerticalEllipsisBox onClick={() => onSelect(pathArr.length)} highlight={selectedSide === "top"} />
      </div>
    );
  };

  const renderBottomPath = (pathArr: string[], onSelect: (idx: number) => void) => {
    const fontSize = Math.max(minFont, baseFont - pathArr.length * 2);
    const reversed = pathArr.slice().reverse();

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 8, flex: 1, minHeight: 0 }}>
        {/* <UpArrow /> */}
        <VerticalEllipsisBox onClick={() => onSelect(pathArr.length)} highlight={selectedSide === "bottom"} />
        {reversed.map((step, revIdx) => {
          const idx = pathArr.length - 1 - revIdx;
          const isFirst = revIdx === reversed.length - 1;
          return (
            <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              {/* Render upward arrow connecting to bottom actor only for first box */}
            {isFirst && <UpArrow />}
            {/* Render upward arrow for all subsequent boxes */}
            {!isFirst && <UpArrow />}
              <div
                className={`actorBox completed${idx === pathArr.length - 1 ? " current" : ""}`}
                style={{ cursor: idx === pathArr.length - 1 ? "pointer" : "default", fontSize }}
                onClick={idx === pathArr.length - 1 ? () => onSelect(idx) : undefined}
              >
                {step}
              </div>
            </div>
          );
        })}
        {/* Up arrow under actorB */}
        <UpArrow />
      </div>
    );
  };

  return (
    <div className="gamePage">
      <div className="topBar">
        <button className="backButton" style={{ fontSize: "1.3em", padding: "0.5em 1.2em" }} onClick={() => navigate("/adventure")}>
          ← Back
        </button>
        <div className="homeWrapper">
          <HomeButton />
        </div>
      </div>

      <div className="gameContainer" style={{ gap: 32 }}>
        {/* Left Panel (wider) */}
        <div
          className="leftPanel"
          style={{
            flex: 2.1,
            height: "75vh",
            minHeight: 500,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div className={`actorBox ${selectedSide === "top" ? "active current" : ""}`} onClick={() => setSelectedSide("top")}>{actorA}</div>

          <div
            className="pathAreaCombined"
            style={{
              flex: 1,
              margin: "20px 0",
              borderRadius: 10,
              border: "2px dashed rgba(255,255,255,0.25)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 0,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
              {renderTopPath(topPath, () => setSelectedSide("top"))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
              {renderBottomPath(bottomPath, () => setSelectedSide("bottom"))}
            </div>
          </div>

          <div className={`actorBox ${selectedSide === "bottom" ? "active current" : ""}`} onClick={() => setSelectedSide("bottom")}>
            {actorB}
          </div>
        </div>

        {/* Right Panel (narrower, centered content) */}
        <div
          className="rightPanel"
          style={{
            flex: 1,
            minWidth: 320,
            maxWidth: 400,
            height: "8vh",
            minHeight: 540,
            maxHeight: 620,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            padding: 0,
            marginTop: 92,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              margin: 0,
              padding: 0,
            }}
          >
            {/* Main label */}
            <div
              style={{
                marginTop: 0,
                marginBottom: 30,
                fontWeight: 700,
                fontSize: "1.35em",
                color: "white",
                textShadow: "0 1px 8px #2228",
                textAlign: "center",
              }}
            >
              {`Movies for ${currentSelection}`}
            </div>

            {/* Suggestions grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px 10px",
                justifyItems: "center",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              {suggestions.slice(0, 6).map((s, i) => (
                <button
                  key={i}
                  className="suggestionButton"
                  style={{
                    width: 140,
                    height: 48,
                    margin: 0,
                    fontWeight: 500,
                    fontSize: "1.05em",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                  onClick={() => handleSuggestion(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Plus Button */}
            <button
              className="suggestionButton"
              style={{ width: 290, height: 40, marginTop: 6, fontSize: "1.1em", fontWeight: 500 }}
            >
              +
            </button>

            {/* Shuffle Button */}
            <button
              style={{
                width: 290,
                height: 50,
                marginTop: 8,
                fontSize: "1.1em",
                fontWeight: 500,
                backgroundColor: "#ff5252",
                border: "none",
                borderRadius: 8,
                color: "white",
                cursor: "pointer",
              }}
              onClick={() => setShuffles(shuffles + 1)}
            >
              Shuffle
            </button>
          </div>

          {/* Fixed Score Panel at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "8px 16px",
              border: "2px solid rgba(255,255,255,0.3)",
              borderRadius: 8,
              background: "rgba(0,0,0,0.25)",
              color: "white",
              fontWeight: 500,
              display: "flex",
              gap: 12,
            }}
          >
            <span>Turns: {turns}</span>
            <span>|</span>
            <span>Shuffles: {shuffles}</span>
            <span>|</span>
            <span>Rewinds: {rewinds}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GamePage;