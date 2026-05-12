let state = null;
let lastSettings = { mode: "pva", human: "black", difficulty: "medium" };
let aiBusy = false;
let pendingCellAnimations = null;

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const hudCardEl = document.querySelector(".hud-card");
const boardEl = document.getElementById("board");
const boardFrameEl = document.querySelector(".board-frame");
const statusEl = document.getElementById("status");
const turnHintEl = document.getElementById("turnHint");
const scoreBlackEl = document.getElementById("scoreBlack");
const scoreWhiteEl = document.getElementById("scoreWhite");
const moveTimelineEl = document.getElementById("moveTimeline");
const winOverlayEl = document.getElementById("winOverlay");
const winTitleEl = document.getElementById("winTitle");
const winSubtitleEl = document.getElementById("winSubtitle");
const winIconEl = document.getElementById("winIcon");
const replayBannerEl = document.getElementById("replayBanner");
const replayStatusEl = document.getElementById("replayStatus");
const undoToggleRowEl = document.getElementById("undoToggleRow");
const enableUndoEl = document.getElementById("enableUndo");
const undoReplayControlsEl = document.getElementById("undoReplayControls");
const replayControlsEl = document.getElementById("replayControls");
const undoBtnEl = document.getElementById("undoBtn");
const enterReplayBtnEl = document.getElementById("enterReplayBtn");
const replayBackBtnEl = document.getElementById("replayBackBtn");
const replayForwardBtnEl = document.getElementById("replayForwardBtn");
const replayExitBtnEl = document.getElementById("replayExitBtn");
const modeGroupEl = document.getElementById("mode");
const humanColorGroupEl = document.getElementById("humanColor");
const difficultyGroupEl = document.getElementById("difficulty");
let lastRenderedHistoryLength = 0;
let winOverlayShownForGame = false;

function showHome() {
  homeScreen.classList.remove("hidden");
  gameScreen.classList.add("hidden");
  hideWinOverlay();
}

function showGame() {
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
}

function hideWinOverlay() {
  if (!winOverlayEl) return;
  winOverlayEl.classList.add("hidden");
  winOverlayEl.setAttribute("aria-hidden", "true");
  winOverlayEl.classList.remove("show");
}

function showWinOverlay() {
  if (!winOverlayEl || !state || !state.game_over) return;
  const black = state.score.black;
  const white = state.score.white;
  let title = "Game Over";
  let icon = "✦";
  let theme = "draw";
  if (state.winner === 1) {
    title = "Black Wins!";
    icon = "♛";
    theme = "black";
  } else if (state.winner === -1) {
    title = "White Wins!";
    icon = "♔";
    theme = "white";
  } else if (state.winner === 0) {
    title = "Draw Game!";
    icon = "◎";
    theme = "draw";
  }

  winTitleEl.textContent = title;
  winSubtitleEl.textContent = `Final score: Black ${black} - White ${white}`;
  winIconEl.textContent = icon;
  winOverlayEl.dataset.theme = theme;
  winOverlayEl.classList.remove("hidden");
  winOverlayEl.setAttribute("aria-hidden", "false");
  winOverlayEl.classList.add("show");
}

function getChoiceValue(groupEl) {
  const active = groupEl.querySelector(".choice.active");
  return active ? active.dataset.value : null;
}

function setChoiceValue(groupEl, value) {
  groupEl.querySelectorAll(".choice").forEach((btn) => {
    const active = btn.dataset.value === value;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function wireChoiceGroup(groupEl, onChange) {
  groupEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".choice");
    if (!btn || !groupEl.contains(btn)) return;
    if (btn.classList.contains("active")) return;
    setChoiceValue(groupEl, btn.dataset.value);
    if (onChange) onChange(btn.dataset.value);
  });
}

function computeCellAnimations(prevState, nextState) {
  if (!prevState || !nextState) return null;
  const changes = new Map();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const before = prevState.grid[r][c];
      const after = nextState.grid[r][c];
      if (before === after) continue;
      if (before === 0 && after !== 0) {
        changes.set(`${r},${c}`, { type: "placed", from: before, to: after });
      } else if (before !== 0 && after !== 0) {
        changes.set(`${r},${c}`, { type: "flipped", from: before, to: after });
      }
    }
  }
  return changes.size ? changes : null;
}

function setState(nextState, { animate = false } = {}) {
  pendingCellAnimations = animate ? computeCellAnimations(state, nextState) : null;
  state = nextState;
}

async function postJson(path, payload = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return { res, data };
}

function currentModeIsPva() {
  if (state && state.mode) return state.mode === "pva";
  return lastSettings.mode === "pva";
}

function currentHumanColorValue() {
  if (state && typeof state.human_color === "number") return state.human_color;
  return lastSettings.human === "black" ? 1 : -1;
}

function isLegal(r, c) {
  if (!state) return false;
  return state.legal_moves.some(m => m.r === r && m.c === c);
}

function winnerText() {
  if (!state || !state.game_over) return "";
  if (state.winner === 1) return "Game Over - Black wins";
  if (state.winner === -1) return "Game Over - White wins";
  return "Game Over - Draw";
}

function playerName(player) {
  return player === 1 ? "Black" : "White";
}

function renderTimeline() {
  if (!moveTimelineEl || !state) return;
  const history = Array.isArray(state.history) ? state.history : [];
  const shouldAutoScroll = history.length > lastRenderedHistoryLength;
  moveTimelineEl.innerHTML = "";

  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "timeline-empty";
    empty.textContent = "No moves yet.";
    moveTimelineEl.appendChild(empty);
    lastRenderedHistoryLength = 0;
    return;
  }

  for (const move of history) {
    const row = document.createElement("div");
    row.className = "timeline-row";
    if (state.last_move && move.move_index === state.last_move.move_index) {
      row.classList.add("is-latest");
    }

    row.innerHTML = `
      <div class="timeline-index">${move.move_index}.</div>
      <div class="timeline-main">
        <div class="timeline-top">
          <span class="timeline-player">
            <span class="timeline-dot ${move.player === 1 ? "dot-black" : "dot-white"}"></span>
            ${playerName(move.player)}
          </span>
          <span class="timeline-notation">${move.notation}</span>
        </div>
        <div class="timeline-meta">Flipped: ${move.flipped}</div>
      </div>
    `;
    moveTimelineEl.appendChild(row);
  }

  if (shouldAutoScroll) {
    moveTimelineEl.scrollTop = moveTimelineEl.scrollHeight;
  }
  lastRenderedHistoryLength = history.length;
}

function canHumanClickCell(r, c) {
  if (!state || state.game_over) return false;
  if (state.replay_mode) return false;
  if (!isLegal(r, c)) return false;
  if (aiBusy) return false;
  if (!currentModeIsPva()) return true;
  return state.current === currentHumanColorValue();
}

function renderUndoReplayControls() {
  if (!state) return;

  const show = state.mode === "pvp" && !!state.enable_undo;
  undoReplayControlsEl.classList.toggle("hidden", !show);
  replayBannerEl.classList.toggle("hidden", !state.replay_mode);
  replayStatusEl.classList.toggle("hidden", !state.replay_mode);
  if (boardFrameEl) boardFrameEl.classList.toggle("replay-active", !!state.replay_mode);
  if (hudCardEl) hudCardEl.classList.toggle("replay-compact", !!state.replay_mode);

  if (!show) return;

  undoBtnEl.disabled = !state.can_undo || !!state.replay_mode;
  enterReplayBtnEl.disabled = !!state.replay_mode || (state.replay_total || 0) <= 1;
  replayControlsEl.classList.toggle("hidden", !state.replay_mode);

  if (state.replay_mode) {
    replayStatusEl.textContent = `Replay: ${state.replay_index + 1} / ${state.replay_total}`;
    replayBackBtnEl.disabled = state.replay_index <= 0;
    replayForwardBtnEl.disabled = state.replay_index >= (state.replay_total - 1);
  }
}

function render() {
  if (!state) return;

  scoreBlackEl.textContent = String(state.score.black);
  scoreWhiteEl.textContent = String(state.score.white);

  if (state.game_over) {
    statusEl.textContent = winnerText();
  } else {
    const turn = state.current === 1 ? "Black" : "White";
    statusEl.textContent = `Turn: ${turn}`;
  }

  boardEl.innerHTML = "";

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.setAttribute("aria-label", `Row ${r + 1}, Column ${c + 1}`);

      if (isLegal(r, c) && !state.game_over) cell.classList.add("legal");

      const v = state.grid[r][c];
      if (v !== 0) {
        const disc = document.createElement("span");
        disc.className = "disc " + (v === 1 ? "black" : "white");
        cell.appendChild(disc);
      } else if (isLegal(r, c) && !state.game_over) {
        const dot = document.createElement("span");
        dot.className = "legal-dot";
        cell.appendChild(dot);
      }

      const anim = pendingCellAnimations && pendingCellAnimations.get(`${r},${c}`);
      if (anim) {
        cell.classList.add("cell-anim", `cell-${anim.type}`);
        if (anim.type === "flipped") {
          if (anim.from === 1 && anim.to === -1) cell.classList.add("flip-bw");
          if (anim.from === -1 && anim.to === 1) cell.classList.add("flip-wb");
        }
      }

      if (!canHumanClickCell(r, c)) {
        cell.disabled = true;
      }

      if (state.last_move && state.last_move.r === r && state.last_move.c === c) {
        cell.classList.add("last-move");
      }

      cell.addEventListener("click", () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }

  pendingCellAnimations = null;
  renderTimeline();
  renderUndoReplayControls();

  if (state.game_over) {
    if (!winOverlayShownForGame) {
      winOverlayShownForGame = true;
      setTimeout(() => {
        if (state && state.game_over) showWinOverlay();
      }, 260);
    }
  } else {
    winOverlayShownForGame = false;
    hideWinOverlay();
  }
}

async function startNewGame(settings) {
  lastSettings = settings;
  aiBusy = false;
  winOverlayShownForGame = false;
  turnHintEl.textContent = "";
  hideWinOverlay();

  const { res, data } = await postJson("/api/new", settings);
  if (!res.ok || !data.ok) {
    turnHintEl.textContent = data.error || "Failed to start game.";
    return;
  }
  setState(data.state, { animate: false });
  showGame();
  render();

  if (currentModeIsPva() && !state.game_over && state.current !== currentHumanColorValue()) {
    turnHintEl.textContent = "Computer starts...";
    await runAiTurnWithDelay(900);
  }
}

async function onCellClick(r, c) {
  if (!state || state.game_over) return;
  if (!canHumanClickCell(r, c)) return;

  const { res, data } = await postJson("/api/move", { r, c });
  if (!res.ok) {
    setState(data.state, { animate: false });
    turnHintEl.textContent = data.error || "Illegal move.";
    render();
    return;
  }

  setState(data.state, { animate: true });
  turnHintEl.textContent = "";
  render();

  if (currentModeIsPva() && !state.game_over && state.current !== currentHumanColorValue()) {
    turnHintEl.textContent = "Computer is thinking...";
    await runAiTurnWithDelay(1100);
  }
}

async function runAiTurnWithDelay(delayMs) {
  if (!state || state.game_over || !currentModeIsPva()) return;
  if (state.current === currentHumanColorValue()) return;

  aiBusy = true;
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  const { res, data } = await postJson("/api/ai", {});
  aiBusy = false;

  if (!res.ok || !data.ok) {
    if (data && data.state) {
      setState(data.state, { animate: false });
      render();
    }
    turnHintEl.textContent = (data && data.error) || "AI move failed.";
    return;
  }

  setState(data.state, { animate: true });
  turnHintEl.textContent = "";
  render();

  if (!state.game_over && state.current !== currentHumanColorValue()) {
    turnHintEl.textContent = "Computer continues...";
    await runAiTurnWithDelay(850);
  }
}

function refreshModeVisibility(modeValue) {
  const isPvA = modeValue === "pva";
  document.getElementById("humanRow").classList.toggle("hidden", !isPvA);
  document.getElementById("difficultyRow").classList.toggle("hidden", !isPvA);
  undoToggleRowEl.classList.toggle("hidden", isPvA);
  if (isPvA) enableUndoEl.checked = false;
}

document.getElementById("startBtn").addEventListener("click", () => {
  const mode = getChoiceValue(modeGroupEl);
  const human = getChoiceValue(humanColorGroupEl);
  const difficulty = getChoiceValue(difficultyGroupEl);

  const payload = mode === "pvp"
    ? { mode: "pvp", enable_undo: !!enableUndoEl.checked }
    : { mode: "pva", human, difficulty };

  startNewGame(payload).catch(() => {
    aiBusy = false;
    turnHintEl.textContent = "Failed to start game.";
  });
});

document.getElementById("quitBtn").addEventListener("click", () => {
  showHome();
  turnHintEl.textContent = "";
});

document.getElementById("restartBtn").addEventListener("click", () => {
  startNewGame(lastSettings).catch(() => {
    aiBusy = false;
    turnHintEl.textContent = "Failed to restart game.";
  });
});

document.getElementById("winPlayAgainBtn").addEventListener("click", () => {
  startNewGame(lastSettings).catch(() => {
    aiBusy = false;
    turnHintEl.textContent = "Failed to restart game.";
  });
});

document.getElementById("winMenuBtn").addEventListener("click", () => {
  showHome();
});

undoBtnEl.addEventListener("click", async () => {
  if (!state || !state.enable_undo || state.replay_mode) return;
  const { res, data } = await postJson("/api/undo", {});
  if (!res.ok || !data.ok) {
    if (data && data.state) setState(data.state, { animate: false });
    turnHintEl.textContent = (data && data.error) || "Undo failed.";
    render();
    return;
  }
  setState(data.state, { animate: false });
  turnHintEl.textContent = "";
  render();
});

enterReplayBtnEl.addEventListener("click", async () => {
  if (!state || !state.enable_undo) return;
  const { res, data } = await postJson("/api/replay/enter", {});
  if (!res.ok || !data.ok) {
    if (data && data.state) setState(data.state, { animate: false });
    turnHintEl.textContent = (data && data.error) || "Replay failed.";
    render();
    return;
  }
  setState(data.state, { animate: false });
  turnHintEl.textContent = "";
  render();
});

replayExitBtnEl.addEventListener("click", async () => {
  if (!state || !state.enable_undo) return;
  const { res, data } = await postJson("/api/replay/exit", {});
  if (!res.ok || !data.ok) {
    if (data && data.state) setState(data.state, { animate: false });
    turnHintEl.textContent = (data && data.error) || "Exit replay failed.";
    render();
    return;
  }
  setState(data.state, { animate: false });
  turnHintEl.textContent = "";
  render();
});

replayBackBtnEl.addEventListener("click", async () => {
  if (!state || !state.replay_mode) return;
  const { res, data } = await postJson("/api/replay/step", { dir: "back" });
  if (!res.ok || !data.ok) {
    if (data && data.state) setState(data.state, { animate: false });
    turnHintEl.textContent = (data && data.error) || "Replay step failed.";
    render();
    return;
  }
  setState(data.state, { animate: false });
  turnHintEl.textContent = "";
  render();
});

replayForwardBtnEl.addEventListener("click", async () => {
  if (!state || !state.replay_mode) return;
  const { res, data } = await postJson("/api/replay/step", { dir: "forward" });
  if (!res.ok || !data.ok) {
    if (data && data.state) setState(data.state, { animate: false });
    turnHintEl.textContent = (data && data.error) || "Replay step failed.";
    render();
    return;
  }
  setState(data.state, { animate: false });
  turnHintEl.textContent = "";
  render();
});

// Start at home
showHome();

wireChoiceGroup(modeGroupEl, refreshModeVisibility);
wireChoiceGroup(humanColorGroupEl);
wireChoiceGroup(difficultyGroupEl);
refreshModeVisibility(getChoiceValue(modeGroupEl));
