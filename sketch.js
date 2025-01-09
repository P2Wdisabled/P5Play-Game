// =====================
// Variables globales
// =====================

// Tableau qui va contenir la position des drapeaux (si besoin)
var flaglocs = [];

// Couleurs de base
var sky_col_string = "#bed69a";
var ground_col_string = "#839e3f";
var water_col_string = "#5c9dd0";

var sky_col, ground_col, water_col;

// Paramètres pour le ciel
var bright_sky = 84;
var sat_sky = 40;

// Paramètres pour le sol
var bright_ground = 84;
var sat_ground = 60;

// Terrain simplifié
var worldPoints = [];

// Sprites divers
let basketTrigger; // ancien "holeTrigger"
let ball;
let ground;

// Police de caractères
let font;

// Score, timer
var score = 0;
var lastShotTime = 0;
var shotInProgress = false; 

// Timer de reset après un tir (en millisecondes)
var RESET_TIME = 5000; 

// Variables pour la balle
var ballResetPos = 30;

// Taille du "panier"
var basketSize = 50;

// Pour le drag
var mouseHeld = false;
var strokeStart = [];
var maxArrowLength = 200;

// Couleur dynamique
var hue;

// Autres variables
var holenum = 1;
var strokecount = 0;
var skips = 0;

// ---- NOUVELLE VARIABLE POUR LA POSITION Y DE LA BALLE AU FRAME PRÉCÉDENT ----
var prevBallY = 0;

// Variables for the play button and timer
let playButton;
let retryButton;
let timerDiv;
let gameStarted = false;
let startTime = 0;
const TOTAL_TIME = 10 * 1000; // 2 minutes in milliseconds

// =====================
// PRELOAD
// =====================
function preload(){
  font = loadFont("font.ttf");
}

// =====================
// SETUP
// =====================
function setup() {
  createCanvas(960, 540);
  textFont(font);
  
  // Initialize play button, retry button, and timer
  playButton = select('#playButton');
  retryButton = select('#retryButton');
  timerDiv = select('#timer');
  playButton.mousePressed(startGame);
  retryButton.mousePressed(retryGame);

  // Position buttons at the bottom center of the canvas
  playButton.position(width / 2 - playButton.width / 2, height - 50);
  retryButton.position(width / 2 - retryButton.width / 2, height - 50);

  sky_col = color(sky_col_string);
  ground_col = color(ground_col_string);
  water_col = color(water_col_string);

  // Création de la balle
  ball = new Sprite();
  ball.x = ballResetPos;
  ball.y = (2 * height) / 3 - 4;
  ball.diameter = 8;
  ball.collider = 'dynamic';
  ball.color = "#ffffff";
  ball.bounciness = 0.5;

  // Gravité
  world.gravity.y = 8;
  
  // Sol plat (rectangle)
  worldPoints.push([0, (2 * height) / 3]);
  worldPoints.push([width, (2 * height) / 3]);
  worldPoints.push([width, height]);
  worldPoints.push([0, height]);
  
  ground = new Sprite(worldPoints);
  ground.collider = 'kinematic';

  // Le panier, centré
  basketTrigger = new Sprite(width / 2, (2 * height) / 3 - 30);
  basketTrigger.width = basketSize;
  basketTrigger.height = basketSize;
  basketTrigger.collider = 'static';
  basketTrigger.color = color("#ff000055");
  
  // Couleur dynamique (HSB)
  colorMode(HSB, 360, 100, 100);
  hue = random() * 360;

  // On initialise prevBallY
  prevBallY = ball.y;
}

// Function to start the game
function startGame() {
  gameStarted = true;
  startTime = millis();
  playButton.hide();
  retryButton.hide();
}

// Function to retry the game
function retryGame() {
  gameStarted = true;
  startTime = millis();
  score = 0;
  playButton.hide();
  retryButton.hide();
}

// =====================
// DRAW
// =====================
function draw() {
  // Couleur du ciel
  sky_col = color(hue, sat_sky, bright_sky);
  background(sky_col);
  
  // On dessine l’eau en bas
  fill(water_col);
  rect(0, height - 20, width, 20);
  
  // On adapte la couleur du sol en fonction du ciel
  ground_col = color(
    hue, 
    lerp(40, 70, red(sky_col)/255), 
    lerp(50, 80, red(sky_col)/255)
  );
  
  // Dessin du sol
  fill(ground_col);
  beginShape();
    for(let i=0; i<worldPoints.length; i++){
      vertex(worldPoints[i][0], worldPoints[i][1]);
    }
  endShape();

  ground.draw();

  // Dessin balle
  fill(255);
  ball.draw();

  // Dessin panier
  basketTrigger.draw();

  // Score
  strokeWeight(0);
  fill(255);
  textSize(20);
  text("Score: " + score, 20, 30);

  if (!gameStarted) {
    textSize(32);
    textAlign(CENTER, CENTER);
    text('Click Play to Start', width / 2, height / 2);
    return;
  }

  // Update timer
  let currentTime = millis();
  let elapsedTime = currentTime - startTime;
  let remainingTime = TOTAL_TIME - elapsedTime;
  if (remainingTime <= 0) {
    remainingTime = 0;
    gameStarted = false;
    textSize(32);
    textAlign(CENTER, CENTER);
    text('Time\'s Up!', width / 2, height / 2);
    retryButton.show();
  }
  let seconds = int((remainingTime / 1000) % 60);
  let minutes = int((remainingTime / (1000 * 60)) % 60);
  let timeString = nf(minutes, 2) + ':' + nf(seconds, 2);
  textSize(32);
  textAlign(CENTER, TOP);
  fill(255);
  text(timeString, width / 2, 10);

  // ----- DRAG (lancer de balle) -----
  if (mouse.pressing() && !mouseHeld) {
    mouseHeld = true;
    strokeStart = [mouse.x, mouse.y];
  }
  if (mouseHeld) {
    drawArrow();
  }
  if (mouse.released()) {
    mouseHeld = false;
    // On calcule la vitesse uniquement si la balle est quasi immobile
    if (abs(ball.vel.x) < 0.1 && abs(ball.vel.y) < 0.1) {
      var vec = createVector(strokeStart[0] - mouse.x, strokeStart[1] - mouse.y, 0);
      vec.limit(maxArrowLength);
      if(vec.mag() > 1) {
        ball.vel.x = lerp(0, 10, vec.x / maxArrowLength);
        ball.vel.y = lerp(0, 10, vec.y / maxArrowLength);
        
        // Timer
        shotInProgress = true;
        lastShotTime = millis();
      }
    }
    strokeStart = [];
  }
  
  // RESET après X secondes
  if (shotInProgress && (millis() - lastShotTime >= RESET_TIME)) {
    shotInProgress = false;
    resetBall(); 
  }

  // Si le vecteur == 0, la balle ne bouge plus
  if (abs(ball.vel.x) < 0.0001 && abs(ball.vel.y) < 0.0001) {
    ball.vel.x = 0;
    ball.vel.y = 0;
  }

  // --- PANIER MARQUÉ SEULEMENT PAR LE HAUT ---
  if (ball.overlapping(basketTrigger)) {
    // Coordonnée Y du "haut" du panier
    let basketTop = basketTrigger.y - (basketTrigger.height / 2);
    // Condition : la balle doit être au-dessus du panier précédemment 
    // et doit descendre dedans
    // => (prevBallY < basketTop) et ball.vel.y > 0
    if (prevBallY < basketTop+5 && ball.vel.y > 0) {
      score += 3;
      resetBall();
      hue += 5;
    }
  }

  // Mise à jour de prevBallY à la fin
  prevBallY = ball.y;
}

// =====================
// resetBall()
// =====================
function resetBall() {
  // Réinitialise la position de la balle
  ball.x = ballResetPos;
  ball.y = (2 * height) / 3 - 4;

  // Annule complètement les vitesses
  ball.vel.x = 0;
  ball.vel.y = 0;

  // Empêche tout mouvement résiduel en X et Y
  ball.x = constrain(ball.x, ball.x, ball.x);
  ball.y = constrain(ball.y, ball.y, ball.y);

  // Réinitialise les interactions liées au tir
  strokeStart = [];
  shotInProgress = false;
  lastShotTime = 0;

  // Met à jour l'état précédent de la balle
  prevBallY = ball.y;

  // --- ICI on "entoure" la balle avec 4 murs pour 1 seconde ---
  addTemporaryWalls();
}

// =====================
// drawArrow()
// =====================
function drawArrow(){
  if (!strokeStart.length) return;
  var fx = strokeStart[0];
  var fy = strokeStart[1];
  var mouseVector = createVector(fx - mouse.x, fy - mouse.y, 0);
  mouseVector.limit(maxArrowLength);
  
  strokeWeight(3);
  stroke(255);
  line(fx, fy, fx + mouseVector.x, fy + mouseVector.y);
}

// =====================
// addTemporaryWalls()
// =====================
function addTemporaryWalls() {
  // Dimensions de la "boîte" autour de la balle
  // Ajuste si besoin
  let wallThickness = 2;
  let halfBox = 5; // "Rayon" horizontal/vertical autour de la balle

  // Coordonnées centrales
  let xC = ball.x;
  let yC = ball.y;

  // MUR GAUCHE
  let leftWall = new Sprite(
    xC - halfBox,  // x
    yC,            // y
    wallThickness, // width
    halfBox * 2    // height
  );
  leftWall.collider = 'static';
  leftWall.color = color(255, 0, 0, 0);

  // MUR DROITE
  let rightWall = new Sprite(
    xC + halfBox,
    yC,
    wallThickness,
    halfBox * 2
  );
  rightWall.collider = 'static';
  rightWall.color = color(255, 0, 0, 0);

  // MUR HAUT
  let topWall = new Sprite(
    xC,
    yC - halfBox,
    halfBox * 2,
    wallThickness
  );
  topWall.collider = 'static';
  topWall.color = color(255, 0, 0, 0);

  // MUR BAS
  let bottomWall = new Sprite(
    xC,
    yC + halfBox,
    halfBox * 2,
    wallThickness
  );
  bottomWall.collider = 'static';
  bottomWall.color = color(255, 0, 0, 0);

  // On les détruit après 1 seconde
  setTimeout(() => {
    leftWall.remove();
    rightWall.remove();
    topWall.remove();
    bottomWall.remove();
  }, 1000);
}

// Fonctions non utilisées
function clearOldStage() { /* plus besoin */ }
function collidesWith(ball, x1, y1, x2, y2) { /* vide */ }
function addNewStage() { /* plus besoin */ }
