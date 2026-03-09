

import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import HomeButton from "../components/HomeButton";
import "./GamePage.css";

function GamePage() {

  const location = useLocation();
  const navigate = useNavigate();

  const actorA = location.state?.actorA || "George Clooney";
  const actorB = location.state?.actorB || "Tobey Maguire";

  const [selectedSide, setSelectedSide] = useState<"top" | "bottom">("top");

  const [path, setPath] = useState<string[]>([]);

  

  const suggestions = [
    "Ocean's Eleven",
    "Burn After Reading",
    "The Perfect Storm",
    "Gravity",
    "Michael Clayton",
    "Batman & Robin"
  ];

  function handleSuggestion(choice: string) {
    setPath([...path, choice]);
  }

  return (

    <div className="gamePage">

               <div className="topBar">

         <button
           className="backButton"
           onClick={() => navigate("/adventure")}
         >
           ← Back
       </button>

       <div className="homeWrapper">
       <HomeButton />
      </div>

      </div>
        

      <div className="gameContainer">

        {/* LEFT PANEL */}

        <div className="leftPanel">

          <div
            className={`actorBox ${
              selectedSide === "top" ? "active current" : ""
            }`}
            onClick={() => setSelectedSide("top")}
          >
            {actorA}
          </div>

          <div className="pathArea">

            {path.map((step, index) => (
              <div key={index} className="actorBox completed">
                {step}
              </div>
            ))}

          </div>

          <div
            className={`actorBox ${
              selectedSide === "bottom" ? "active current" : ""
            }`}
            onClick={() => setSelectedSide("bottom")}
          >
            {actorB}
          </div>

        </div>

        {/* RIGHT PANEL */}

        <div className="rightPanel">

          <div className="suggestionGrid">

            {suggestions.map((s, i) => (
              <button
                key={i}
                className="suggestionButton"
                onClick={() => handleSuggestion(s)}
              >
                {s}
              </button>
            ))}

          </div>

          <div className="controlRow">

            <button className="controlButton">
              Shuffle ▲
            </button>

            <button className="controlButton">
              +
            </button>

            <button className="controlButton">
              Shuffle ▼
            </button>

          </div>

          <div className="controlRow">

            <button className="controlButton">
              Undo
            </button>

          </div>

          <div className="scorePanel">

            <div>Turns: 0</div>
            <div>Rewinds: 3</div>
            <div>Shuffles: 2</div>

          </div>

        </div>

      </div>

    </div>

  );
}

export default GamePage;