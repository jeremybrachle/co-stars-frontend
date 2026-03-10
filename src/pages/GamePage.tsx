import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import HomeButton from "../components/HomeButton";
import "./GamePage.css";

// Unicode icons
const DownArrow = () => (
  <span style={{ fontSize: "1.5em", display: "block", textAlign: "center" }}>↓</span>
);
const UpArrow = () => (
  <span style={{ fontSize: "1.5em", display: "block", textAlign: "center" }}>↑</span>
);

const VerticalEllipsisBox = ({
  onClick,
  highlight,
}: {
  onClick?: () => void;
  highlight?: boolean;
}) => (
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

  // Dummy suggestions
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

  /**
   * Render top path (downward growth)
   */
  const renderTopPath = (pathArr: string[], onSelect: (idx: number) => void) => {
    const fontSize = Math.max(minFont, baseFont - pathArr.length * 2);

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {/* Down arrow under actorA */}
        <DownArrow />

        {pathArr.map((step, idx) => {
          const isLast = idx === pathArr.length - 1;
          return (
            <div
              key={idx}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
            >
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

        {/* Ellipsis for next possible selection */}
        <VerticalEllipsisBox onClick={() => onSelect(pathArr.length)} highlight={selectedSide === "top"} />
      </div>
    );
  };

  /**
   * Render bottom path (upward growth)
   */
//   const renderBottomPath = (pathArr: string[], onSelect: (idx: number) => void) => {
//     const fontSize = Math.max(minFont, baseFont - pathArr.length * 2);

//     return (
//       <div
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           justifyContent: "flex-end", // anchor to bottom actor
//           gap: 8,
//           flex: 1,
//           minHeight: 0,
//         }}
//       >
//         {/* Initial vertical ellipsis and arrow above the bottom actor */}
//         <VerticalEllipsisBox
//           onClick={() => onSelect(pathArr.length)}
//           highlight={selectedSide === "bottom"}
//         />
//         <UpArrow />

//         {pathArr
//           .slice()
//           .reverse()
//           .map((step, revIdx) => {
//             const idx = pathArr.length - 1 - revIdx;
//             const isLast = idx === pathArr.length - 1;

//             return (
//               <div
//                 key={idx}
//                 style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
//               >
//                 <UpArrow />
//                 <div
//                   className={`actorBox completed${isLast ? " current" : ""}`}
//                   style={{ cursor: isLast ? "pointer" : "default", fontSize }}
//                   onClick={isLast ? () => onSelect(idx) : undefined}
//                 >
//                   {step}
//                 </div>
//               </div>
//             );
//           })}
//       </div>
//     );
//   };

// const renderBottomPath = (pathArr: string[], onSelect: (idx: number) => void) => {
//   const fontSize = Math.max(minFont, baseFont - pathArr.length * 2);

//   return (
//     <div
//       style={{
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         justifyContent: "flex-end",
//         gap: 8,
//         flex: 1,
//         minHeight: 0,
//       }}
//     >
//       {/* Ellipsis at top for next selection */}
//       <VerticalEllipsisBox
//         onClick={() => onSelect(pathArr.length)}
//         highlight={selectedSide === "bottom"}
//       />

//       {/* Render path boxes in reverse order */}
//       {pathArr.slice().reverse().map((step, revIdx) => {
//         const idx = pathArr.length - 1 - revIdx;
//         const isLast = idx === pathArr.length - 1;

//         return (
//           <div
//             key={idx}
//             style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
//           >
//             {/* Single upward arrow above every box */}
//             <UpArrow />
//             <div
//               className={`actorBox completed${isLast ? " current" : ""}`}
//               style={{ cursor: isLast ? "pointer" : "default", fontSize }}
//               onClick={isLast ? () => onSelect(idx) : undefined}
//             >
//               {step}
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// };

const renderBottomPath = (pathArr: string[], onSelect: (idx: number) => void) => {
  const fontSize = Math.max(minFont, baseFont - pathArr.length * 2);

  // Reverse copy so we render from top (ellipsis) down to actorB
  const reversed = pathArr.slice().reverse();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Ellipsis at top */}
      <VerticalEllipsisBox
        onClick={() => onSelect(pathArr.length)}
        highlight={selectedSide === "bottom"}
      />

      {reversed.map((step, revIdx) => {
        const idx = pathArr.length - 1 - revIdx;
        const isFirst = revIdx === reversed.length - 1; // first box from bottom actor
        return (
          <div
            key={idx}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
          >
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

  const currentSuggestions = suggestions; // placeholder

  return (
    <div className="gamePage">
      <div className="topBar">
        <button
          className="backButton"
          style={{ fontSize: "1.3em", padding: "0.5em 1.2em" }}
          onClick={() => navigate("/adventure")}
        >
          ← Back
        </button>
        <div className="homeWrapper">
          <HomeButton />
        </div>
      </div>

      <div className="gameContainer">
        <div
          className="leftPanel"
          style={{
            height: "75vh",
            minHeight: 500,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Top actor */}
          <div
            className={`actorBox ${selectedSide === "top" ? "active current" : ""}`}
            onClick={() => setSelectedSide("top")}
          >
            {actorA}
          </div>

          {/* Path area */}
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
            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}
            >
              {renderTopPath(topPath, () => setSelectedSide("top"))}
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}
            >
              {renderBottomPath(bottomPath, () => setSelectedSide("bottom"))}
            </div>
          </div>

          {/* Bottom actor */}
          <div
            className={`actorBox ${selectedSide === "bottom" ? "active current" : ""}`}
            onClick={() => setSelectedSide("bottom")}
          >
            {actorB}
          </div>
        </div>

        {/* Right panel */}
        <div
          className="rightPanel"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "75vh",
            minHeight: 500,
          }}
        >
          <div
            style={{
              marginBottom: 16,
              fontWeight: 700,
              fontSize: "1.7em",
              letterSpacing: "0.01em",
              color: "white",
              textShadow: "0 1px 8px #2228",
            }}
          >
            {`Movies for ${currentSelection}`}
          </div>

          <div
            className="suggestionGrid"
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "repeat(3, 1fr) 1fr",
              gap: "4px 12px",
              justifyItems: "center",
              alignItems: "center",
              width: "100%",
              maxWidth: 420,
              marginBottom: 0,
            }}
          >
            {currentSuggestions.slice(0, 6).map((s, i) => (
              <button
                key={i}
                className="suggestionButton"
                style={{
                  width: 180,
                  height: 72,
                  margin: 0,
                  fontWeight: 500,
                  fontSize: "1.15em",
                  letterSpacing: "0.02em",
                  whiteSpace: "normal",
                  overflow: "visible",
                  textOverflow: "clip",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  lineHeight: "1.15",
                }}
                onClick={() => handleSuggestion(s)}
              >
                {s}
              </button>
            ))}
            <button
              className="suggestionButton"
              style={{ gridColumn: "1 / span 2", width: 372, height: 60, margin: 0, fontSize: "1.3em", fontWeight: 500 }}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GamePage;