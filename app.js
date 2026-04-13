const GRID_SIZE = 20;
let playerX = 0;
let playerY = 0;
let rocks = [{x: 4, y: 4}];
let targets = [];
let moveCounter = 0;
let gameWon = false;
let grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(' '));

const PLAYER_CHAR = '☺';
const WALL_CHAR = 'Δ';
const ROCK_CHAR = '0';
const TARGET_CHAR = 'X';


function seedFromDate(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return ((year * 10000) + (month * 100) + day) >>> 0;
}

function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seed = seedFromDate(new Date());
const random = mulberry32(seed);
function randomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

// Random inner walls
const innerMin = 2;
const innerMax = GRID_SIZE - 3;
const numWalls = 15;
for (let i = 0; i < numWalls; i++) {
  let x, y;
  do {
    x = randomInt(innerMin, innerMax);
    y = randomInt(innerMin, innerMax);
  } while (grid[y][x] !== ' ' || (x === playerX && y === playerY));
  grid[y][x] = WALL_CHAR;
}

// Place rocks randomly
rocks = [];
const numRocks = 3;
for (let i = 0; i < numRocks; i++) {
  let x, y;
  let attempts = 0;
  do {
    x = randomInt(innerMin, innerMax);
    y = randomInt(innerMin, innerMax);
    attempts++;
    if (attempts > 100) break;
  } while (
    grid[y][x] !== ' ' ||
    (x === playerX && y === playerY) ||
    rocks.some(r => r.x === x && r.y === y) ||
    !hasAdjacentEmpty(x, y)
  );
  if (attempts <= 100) {
    rocks.push({x, y});
  }
}

// Place targets randomly
const numTargets = numRocks;
for (let i = 0; i < numTargets; i++) {
  let x, y;
  let attempts = 0;
  do {
    x = randomInt(innerMin, innerMax);
    y = randomInt(innerMin, innerMax);
    attempts++;
    if (attempts > 100) break;
  } while (
    grid[y][x] !== ' ' ||
    (x === playerX && y === playerY) ||
    rocks.some(r => r.x === x && r.y === y) ||
    targets.some(t => t.x === x && t.y === y)
  );
  if (attempts <= 100) {
    targets.push({x, y});
    grid[y][x] = TARGET_CHAR;
  }
}

// Save the static grid with walls and targets
let staticGrid = grid.map(row => row.slice()); 

function hasAdjacentEmpty(x, y) {
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  return dirs.some(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    return (
			nx >= 0
			&& nx < GRID_SIZE
			&& ny >= 0
			&& ny < GRID_SIZE
			&& grid[ny][nx] === ' '
		);
  });
}

function renderGrid() {
  // Reset grid to static state
  grid = staticGrid.map(row => row.slice());
  
  // Place rocks on the grid
  rocks.forEach(rock => {
    grid[rock.y][rock.x] = ROCK_CHAR;
  });
  
  // Place player on the grid
  grid[playerY][playerX] = PLAYER_CHAR;
  
  const gridElement = document.getElementById('grid');
  gridElement.innerHTML = '';
  
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const cell = document.createElement('span');
      cell.className = 'cell';
      cell.textContent = grid[y][x];
      
      // Add specific class based on cell content
      if (grid[y][x] === WALL_CHAR) {
        cell.classList.add('cell-wall');
      } else if (grid[y][x] === PLAYER_CHAR) {
        cell.classList.add('cell-player');
      } else if (grid[y][x] === ROCK_CHAR) {
        if (targets.some(t => t.x === x && t.y === y)) {
          cell.classList.add('cell-rock-on-target');
        } else {
          cell.classList.add('cell-rock');
        }
      } else if (grid[y][x] === TARGET_CHAR) {
        cell.classList.add('cell-target');
      } else {
        cell.classList.add('cell-empty');
      }
      
      gridElement.appendChild(cell);
    }
  }
}

function displayMoves() {
  document.getElementById('moveCounter').textContent = moveCounter;
}

const hasTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
let touchStartX = 0;
let touchStartY = 0;
const SWIPE_THRESHOLD = 30;
let gameStarted = false;

function handleTouchStart(event) {
  const touch = event.changedTouches ? event.changedTouches[0] : event;
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchEnd(event) {
  if (!gameStarted) return;
  event.preventDefault();
  const touch = event.changedTouches ? event.changedTouches[0] : event;
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;

  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) movePlayer(1, 0);
    else movePlayer(-1, 0);
  } else {
    if (dy > 0) movePlayer(0, 1);
    else movePlayer(0, -1);
  }
}

function showInstructionsOverlay() {
  const overlay = document.getElementById('instructionsOverlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
}

function hideInstructionsOverlay() {
  const overlay = document.getElementById('instructionsOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  gameStarted = true;
}

function checkWin() {
  return targets.every(
		target => rocks.some(rock => rock.x === target.x && rock.y === target.y)
	);
}

function showWin() {
  const winElement = document.createElement('div');
  winElement.id = 'win-message';
  winElement.style.position = 'absolute';
  winElement.style.top = '50%';
  winElement.style.left = '50%';
  winElement.style.transform = 'translate(-50%, -50%)';
  winElement.style.fontSize = '48px';
  winElement.style.color = 'white';
	winElement.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
	winElement.style.padding = '20px';
	winElement.style.borderRadius = '10px';
  winElement.style.zIndex = '1000';

  // Save best score
  const dateKey = new Date().toISOString().split('T')[0];
  const currentBest = localStorage.getItem(dateKey);
  let isNewRecord = false;
  if(!currentBest || moveCounter < parseInt(currentBest)) {
    localStorage.setItem(dateKey, moveCounter);
    document.getElementById('bestMoves').textContent = moveCounter;
    isNewRecord = true;
  }

  winElement.textContent = isNewRecord ? 'WINNER! NEW RECORD!' : 'WINNER!';
  document.body.appendChild(winElement);
}

function movePlayer(dx, dy) {
  if (gameWon) return false;
  const newX = playerX + dx;
  const newY = playerY + dy;
  if (
		newX >= 0
		&& newX < GRID_SIZE
		&& newY >= 0
		&& newY < GRID_SIZE
		&& !grid[newY][newX].includes(WALL_CHAR)
	) {
    // Check if there's a rock at the new position
    const rockIndex = rocks.findIndex(
			rock => rock.x === newX && rock.y === newY
		);
    if (rockIndex !== -1) {
      // Try to push the rock
      const rock = rocks[rockIndex];
      const rockNewX = rock.x + dx;
      const rockNewY = rock.y + dy;
      if (
				rockNewX >= 0
				&& rockNewX < GRID_SIZE
				&& rockNewY >= 0
				&& rockNewY < GRID_SIZE
				&& (
					grid[rockNewY][rockNewX] === ' '
					|| grid[rockNewY][rockNewX] === TARGET_CHAR
				)
			) {
        rock.x = rockNewX;
        rock.y = rockNewY;
        playerX = newX;
        playerY = newY;
        moveCounter++;
        renderGrid();
        displayMoves();
        if (checkWin()) {
          gameWon = true;
          showWin();
        }
        return true;
      }
      // If can't push, don't move
      return false;
    } else if (grid[newY][newX] === ' ' || grid[newY][newX] === TARGET_CHAR) {
      playerX = newX;
      playerY = newY;
      moveCounter++;
      renderGrid();
      displayMoves();
      if (checkWin()) {
        gameWon = true;
        showWin();
      }
      return true;
    }
  }
  return false;
}

document.addEventListener('DOMContentLoaded', () => {
	document.getElementById('gameDate').textContent = seed;
  const dateKey = new Date().toISOString().split('T')[0];
  const best = localStorage.getItem(dateKey);
  if(best) document.getElementById('bestMoves').textContent = best;

  const instructionsText = document.getElementById('instructionsText');
  if (instructionsText) {
    const controlHint = hasTouchDevice
      ? 'Swipe on the grid to move the player.'
      : 'Use arrow keys to move the player.';
    instructionsText.innerHTML = `
      <p>Push each rock onto a target marked with ${TARGET_CHAR}.</p>
      <p>Each valid move increases the move counter.</p>
      <p>${controlHint}</p>
      <p>Complete the level with the fewest moves possible.</p>
    `;
  }

  const startButton = document.getElementById('startButton');
  if (startButton) {
    startButton.addEventListener('click', hideInstructionsOverlay);
  }

  const overlay = document.getElementById('instructionsOverlay');
  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) hideInstructionsOverlay();
    });
  }

  renderGrid();
  showInstructionsOverlay();

  if (hasTouchDevice) {
    const gridElement = document.getElementById('grid');
    gridElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    gridElement.addEventListener('touchend', handleTouchEnd, { passive: false });
  }

  document.addEventListener('keydown', (event) => {
    if (gameWon || !gameStarted) return;
    switch (event.key) {
      case 'ArrowUp':
        movePlayer(0, -1);
        break;
      case 'ArrowDown':
        movePlayer(0, 1);
        break;
      case 'ArrowLeft':
        movePlayer(-1, 0);
        break;
      case 'ArrowRight':
        movePlayer(1, 0);
        break;
    }
  });
});
