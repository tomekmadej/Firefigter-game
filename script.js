const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('gameContainer');
const startMenu = document.getElementById('startMenu');
const levelUpMessage = document.getElementById('levelUpMessage');

const fireTruck = {
    x: 400,
    y: 300,
    width: 40,
    height: 20,
    speedForward: 3,
    speedBackward: 1.5,
    speedBoost: 1.1,
    angle: 0,
    water: 100,
    waterActive: false
};

let fires = [];
let trees = [];
let buildings = [
    { x: 725, y: 535, width: 62, height: 42 },
    { x: 530, y: 220, width: 58, height: 38 },
    { x: 115, y: 390, width: 60, height: 40 },
    { x: 685, y: 125, width: 63, height: 43 },
    { x: 220, y: 430, width: 57, height: 37 },
    { x: 327.5, y: 172.5, width: 61, height: 41 },
    { x: 632.5, y: 477.5, width: 59, height: 39 }
];
let score = 0;
let level = 1;
let pointsToNextLevel = 40;
let lastFireSpawn = Date.now();
let gameStarted = false;
let signalBlink = false;

const obstacles = [
    { x: 80, y: 70, width: 60, height: 40 } // Remiza
].concat(buildings);

const mainRoads = [
    { x: 400, y: 300, width: 800, height: 80 },
    { x: 400, y: 300, width: 80, height: 600 }
];

// Generowanie drzew z unikaniem kolizji i paska stanu
for (let i = 0; i < 8; i++) {
    let top, left, collision;
    do {
        top = Math.random() * (560 - 40);
        left = Math.random() * 760;
        collision = obstacles.some(ob => {
            const dx = left + 15 - ob.x;
            const dy = top + 20 - ob.y;
            return Math.sqrt(dx * dx + dy * dy) < (ob.width / 2 + 15);
        }) || (Math.abs(left + 15 - fireTruck.x) < 40 && Math.abs(top + 20 - fireTruck.y) < 40) ||
            mainRoads.some(road => {
                return left + 15 > road.x - road.width / 2 && left + 15 < road.x + road.width / 2 &&
                    top + 20 > road.y - road.height / 2 && top + 20 < road.y + road.height / 2;
            }) || (top + 40 > 570);
    } while (collision);

    const tree = document.createElement('div');
    tree.className = 'tree';
    tree.style.top = `${top}px`;
    tree.style.left = `${left}px`;
    container.appendChild(tree);
    trees.push({ x: left + 15, y: top + 20, width: 30, height: 40 });
}

const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.key === 'Enter' && !gameStarted) {
        startMenu.style.display = 'none';
        gameStarted = true;
    }
    if (e.key === ' ' && gameStarted && !fireTruck.waterActive) {
        fireTruck.waterActive = true;
    }
});
document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (e.key === ' ' && gameStarted) {
        fireTruck.waterActive = false;
    }
});

function spawnFire() {
    if (!gameStarted) return;
    if (Date.now() - lastFireSpawn > 10000) {
        const flammable = trees.concat(buildings);
        const target = flammable[Math.floor(Math.random() * flammable.length)];
        const fire = { x: target.x, y: target.y, active: true, spread: true };
        fires.push(fire);
        lastFireSpawn = Date.now();
    }

    fires.forEach(f => {
        if (f.active && f.spread) {
            f.spread = false;
            const flammable = trees.concat(buildings);
            const nearby = flammable.filter(ob => {
                const dx = ob.x - f.x;
                const dy = ob.y - f.y;
                return Math.sqrt(dx * dx + dy * dy) < 50 && !fires.some(existing => existing.x === ob.x && existing.y === ob.y);
            });
            if (nearby.length > 0) {
                const next = nearby[Math.floor(Math.random() * nearby.length)];
                fires.push({ x: next.x, y: next.y, active: true, spread: true });
            }
        }
    });
}

function checkCollision(truckX, truckY, truckWidth, truckHeight, obstacles) {
    const truckLeft = truckX - truckWidth / 2;
    const truckRight = truckX + truckWidth / 2;
    const truckTop = truckY - truckHeight / 2;
    const truckBottom = truckY + truckHeight / 2;

    for (let obstacle of obstacles) {
        const obLeft = obstacle.x - obstacle.width / 2;
        const obRight = obstacle.x + obstacle.width / 2;
        const obTop = obstacle.y - obstacle.height / 2;
        const obBottom = obstacle.y + obstacle.height / 2;

        if (truckRight > obLeft && truckLeft < obRight && truckBottom > obTop && truckTop < obBottom) {
            return true;
        }
    }
    return false;
}

function isOnRoad(x, y) {
    return mainRoads.some(road => {
        const roadLeft = road.x - road.width / 2;
        const roadRight = road.x + road.width / 2;
        const roadTop = road.y - road.height / 2;
        const roadBottom = road.y + road.height / 2;
        return x > roadLeft && x < roadRight && y > roadTop && y < roadBottom;
    });
}

function updateLevel() {
    if (score >= pointsToNextLevel) {
        level++;
        pointsToNextLevel = Math.floor(pointsToNextLevel * 1.5);
        levelTemper();
        levelUpMessage.textContent = `Poziom ${level}`;
        levelUpMessage.style.display = 'block';
        setTimeout(() => {
            levelUpMessage.style.display = 'none';
        }, 2000);
    }
}

function levelTemper() {
    if (level % 2 === 0) {
        const flammable = trees.concat(buildings);
        const target = flammable[Math.floor(Math.random() * flammable.length)];
        const fire = { x: target.x, y: target.y, active: true, spread: true };
        fires.push(fire);
    }
}

function gameLoop() {
    if (gameStarted) {
        update();
        signalBlink = (Date.now() % 1000 < 500);
    }
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    let newX = fireTruck.x;
    let newY = fireTruck.y;
    const speedMod = isOnRoad(fireTruck.x, fireTruck.y) ? fireTruck.speedBoost : 1;

    if (keys['ArrowUp']) {
        newX += Math.cos(fireTruck.angle) * fireTruck.speedForward * speedMod;
        newY += Math.sin(fireTruck.angle) * fireTruck.speedForward * speedMod;
    }
    if (keys['ArrowDown']) {
        newX -= Math.cos(fireTruck.angle) * fireTruck.speedBackward * speedMod;
        newY -= Math.sin(fireTruck.angle) * fireTruck.speedBackward * speedMod;
    }
    if (keys['ArrowLeft']) fireTruck.angle -= 0.1;
    if (keys['ArrowRight']) fireTruck.angle += 0.1;

    if (!checkCollision(newX, newY, fireTruck.width, fireTruck.height, trees) &&
        !checkCollision(newX, newY, fireTruck.width, fireTruck.height, buildings)) {
        fireTruck.x = newX;
        fireTruck.y = newY;
    }

    const inFireStation =
        fireTruck.x > 50 && fireTruck.x < 110 &&
        fireTruck.y > 50 && fireTruck.y < 90;
    if (inFireStation && fireTruck.water < 100) {
        fireTruck.water = Math.min(100, fireTruck.water + 0.5);
    }

    fireTruck.x = Math.max(fireTruck.width / 2, Math.min(canvas.width - fireTruck.width / 2, fireTruck.x));
    fireTruck.y = Math.max(fireTruck.height / 2, Math.min(canvas.height - fireTruck.height / 2, fireTruck.y));

    if (fireTruck.waterActive && fireTruck.water > 0) {
        fireTruck.water -= 0.2;
        const nozzleX = fireTruck.x + Math.cos(fireTruck.angle) * (fireTruck.width / 2 + 5);
        const nozzleY = fireTruck.y + Math.sin(fireTruck.angle) * (fireTruck.width / 2 + 5);
        const waterLength = 50;
        const waterBaseWidth = 40;
        const waterLeft = nozzleX + Math.cos(fireTruck.angle) * waterLength - Math.sin(fireTruck.angle) * (waterBaseWidth / 2);
        const waterRight = nozzleX + Math.cos(fireTruck.angle) * waterLength + Math.sin(fireTruck.angle) * (waterBaseWidth / 2);
        const waterTop = nozzleY + Math.sin(fireTruck.angle) * waterLength - Math.cos(fireTruck.angle) * (waterBaseWidth / 2);
        const waterBottom = nozzleY + Math.sin(fireTruck.angle) * waterLength + Math.cos(fireTruck.angle) * (waterBaseWidth / 2);

        fires.forEach(f => {
            if (f.active) {
                const fireLeft = f.x - 15;
                const fireRight = f.x + 15;
                const fireTop = f.y - 15;
                const fireBottom = f.y + 15;

                const waterHitsFire =
                    (waterRight > fireLeft && waterLeft < fireRight && waterBottom > fireTop && waterTop < fireBottom) ||
                    (fireRight > waterLeft && fireLeft < waterRight && fireBottom > waterTop && fireTop < waterBottom);

                if (waterHitsFire) {
                    f.active = false;
                    score += 10;
                }
            }
        });
    }

    spawnFire();
    updateLevel();

    document.getElementById('waterBar').style.width = `${fireTruck.water * 0.8}px`;
    document.getElementById('waterText').textContent = `Woda: ${Math.round(fireTruck.water)}%`;
    document.getElementById('scoreText').textContent = `Punkty: ${score} / ${pointsToNextLevel}`;
    document.getElementById('firesText').textContent = `Aktywne pożary: ${fires.filter(f => f.active).length}`;
    document.getElementById('levelText').textContent = `Poziom: ${level}`;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cień pod wozem strażackim
    ctx.save();
    ctx.translate(fireTruck.x + 5, fireTruck.y + 5);
    ctx.rotate(fireTruck.angle);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-fireTruck.width / 2, -fireTruck.height / 2, fireTruck.width, fireTruck.height);
    ctx.restore();

    // Rysowanie wozu strażackiego z obróconymi sygnałami
    ctx.save();
    ctx.translate(fireTruck.x, fireTruck.y);
    ctx.rotate(fireTruck.angle);
    ctx.fillStyle = 'red';
    ctx.fillRect(-fireTruck.width / 2, -fireTruck.height / 2, fireTruck.width, fireTruck.height);
    ctx.fillStyle = 'blue';
    ctx.fillRect(-fireTruck.width / 2, -fireTruck.height / 2, 10, fireTruck.height);
    ctx.save();
    ctx.rotate(Math.PI / 2); // Obrót sygnałów o 90 stopni w prawo
    ctx.fillStyle = signalBlink ? '#00B7EB' : '#005566';
    const signalOffset = fireTruck.width / 4;
    ctx.fillRect(-signalOffset - 2.5, -fireTruck.height / 2 - 3, 5, 3); // Lewy sygnał
    ctx.fillRect(signalOffset - 2.5, -fireTruck.height / 2 - 3, 5, 3);   // Prawy sygnał
    ctx.restore();
    ctx.fillStyle = 'gray';
    ctx.fillRect(fireTruck.width / 2 - 5, -2, 10, 4); // Sikawka
    ctx.restore();

    // Rysowanie strumienia wody
    if (fireTruck.waterActive && fireTruck.water > 0) {
        ctx.save();
        ctx.translate(fireTruck.x, fireTruck.y);
        ctx.rotate(fireTruck.angle);
        ctx.beginPath();
        const nozzleX = fireTruck.width / 2 + 5;
        const nozzleY = 0;
        const waterLength = 50;
        const waterBaseWidth = 40;
        ctx.moveTo(nozzleX, nozzleY);
        ctx.lineTo(nozzleX + waterLength, waterBaseWidth / 2);
        ctx.lineTo(nozzleX + waterLength, -waterBaseWidth / 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 183, 235, 0.7)';
        ctx.fill();
        ctx.restore();
    }

    // Rysowanie pożarów z animacją i cieniem
    fires.forEach(f => {
        if (f.active) {
            ctx.save();
            ctx.translate(f.x + 5, f.y + 5);
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fill();
            ctx.restore();

            const flicker = Math.sin(Date.now() / 100) * 2;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 15 + flicker, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(f.x, f.y, 10 + flicker / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#FF4500';
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(f.x, f.y - 15 - flicker);
            ctx.lineTo(f.x - 10, f.y + 5 + flicker / 2);
            ctx.lineTo(f.x + 10, f.y + 5 + flicker / 2);
            ctx.closePath();
            ctx.fillStyle = '#FF4500';
            ctx.fill();
        }
    });
}

gameLoop();