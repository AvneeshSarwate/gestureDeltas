let gesture = null;
let gestures = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let meter = new FPSMeter();
let selectedSlot = "none";
let fontSize = 24;
let keysDown = new Set();

let gestureShareWorker = new SharedWorker(document.location.origin+"/gestureDeltas/gesture_share_worker.js");

// gestureShareWorker.port.onmessage = (e) => {
//     console.log("gesture points", e.data);
// }

gestureShareWorker.port.start();

/*
todo: 
- create a simple algorithmic scheme that coordinates the different gesture objects to run on the same deltaLists at various times
- allow for simple mouse-based querying to select/modify a single gesture, or a highlighted range to select multiple (and add pause/play to facilitate ease of selection)
*/
let deltaLists = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];



/*
BASIC CONTROLS:
- press and draw with the mouse to draw a looping gesture
- press keys 1-9 to select a slot. any gesture you draw while a slot
  is selected will be drawn to that slot
- if you draw a gesture while selecte slot is 'none', it will just start loopingd
- if you hit p while a selected slot is active, all points will start moving similarly to the gesture in that slot
- press 0 to return all points to their previous gesture (like an undo stack)
- press c to return all gestures to their starting index
- press d to duplicate the selected slot gesture at the mouse position - if none is selected it will duplicate the last drawn gesture
- press q/w/e/r to toggle different transforms on the gestures
- press t to remove transforms on the gestures
*/

mod = function(t, n) {
  return ((t % n) + n) % n;
};

class Gesture {
  constructor(pos) {
    this.deltas = [];
    this.deltaHistory = [];
    this.ind = 0;
    this.pos = pos;
    this.transform = a => a;
  }
  
  update(deltaTransform) {
    this.ind %= this.deltas.length;
    
    if(!deltaTransform) deltaTransform = a => a;
    let newDelta = deltaTransform(this.deltas[this.ind]);
    this.pos.add(newDelta);
    
    this.pos.x = mod(this.pos.x, width);
    this.pos.y = mod(this.pos.y, height);
    this.ind++;
  }
  
  draw() {
    push();
    fill(0);
    ellipse(this.pos.x, this.pos.y, 20)
    pop();
  }
  
  step(transform) { 
    let deltaTransform = transform ?? this.transform;
    this.update(deltaTransform);
    this.draw();
  }
}

function gesturePositions() {
  return gestures.filter(g => g).map(g => ({x: g.pos.x/width, y: g.pos.y/height}));
}

function setup() {
  drawPos = createVector(0, 0);
  createCanvas(800, 800);
}

function rotateDelta(delta) {
  return createVector(delta.x, delta.y).rotate(Date.now() / 1000);
}

//bug - why doesn't this spin backwards from rotateDelta()?
function rotateNegDelta(delta) {
  return createVector(delta.x, delta.y).rotate(-Date.now() / 1000);
}

function slideDown(delta) {
  let cv = createVector;
  return cv(delta.x, delta.y).add(cv(0, -1));
}

function slideUp(delta) {
  let cv = createVector;
  return cv(delta.x, delta.y).add(cv(0, 1));
}

let keyToTransform = {
  'q' : rotateDelta,
  'w' : rotateNegDelta,
  'e' : slideDown,
  'r' : slideUp,
  't' : a => a
}

let activeTransform = keyToTransform['t'];

function drawLabel() {
  let textStr = "selected slot: " + selectedSlot;
  fill(255);
  rect(width/2-2, 0, textWidth(textStr)+4, fontSize+2);
  textSize(fontSize);
  fill(0);
  text(textStr, width/2, fontSize);
}

function draw() {
  meter.tick();
  fill(255, 255, 255, 100);
  rect(0, 0, width, height);
  drawLabel();
  if (mouseIsPressed) {
    gesture.deltas.push(createVector(movedX, movedY));
  }
  
  gestures.forEach(g => {
    if(g) g.step(activeTransform);
  });
  gestureShareWorker.port.postMessage([gesturePositions()]);
}

function mousePressed() {
  gesture = new Gesture(createVector(mouseX, mouseY));
}

function mouseReleased(){
  if(selectedSlot == "none"){
    gestures.push(gesture);
    deltaLists.push(gesture.deltas.map(d => d));
  } else {
    gestures[selectedSlot] = gesture;
    deltaLists[selectedSlot] = gesture.deltas.map(d => d);
  }
}

function keyTyped(){
  keysDown.add(key);
  if('123456789'.includes(key)){
    selectedSlot = parseInt(key);
  }
  if(key === 'p') {
    if(deltaLists[selectedSlot]) {
      gestures.forEach(g => {
        if(!g) return;
        g.deltaHistory.push(g.deltas);
        g.deltas = deltaLists[selectedSlot];
      });
    }
  }
  if(key === '0'){ 
    selectedSlot = "none";
     gestures.forEach(g => { 
       if(!g) return;
       if(g.deltaHistory.length > 0) g.deltas = g.deltaHistory.pop();
     })
  }
  if(key === 'c'){
    gestures.forEach(g => {g.ind = 0})
  }
  if(key === 'd' && gesture){
    let g = new Gesture(createVector(mouseX, mouseY));
    let deltaList = selectedSlot === 'none' || !deltaLists[selectedSlot]
      ? gesture.deltas 
      : deltaLists[selectedSlot];
    console.log(selectedSlot, gesture);
    g.deltas = deltaList.map(a => a);
    gestures.push(g);
  }
  if('quert'.includes(key)){
    activeTransform = keyToTransform[key];
  }
}

function keyReleased() {
  keysDown.delete(key);
}
