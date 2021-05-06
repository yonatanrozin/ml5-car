

let modeSlider; //an HTML slider
let sliderVal = 0; //starting value of slider

let canvasRatio; //ratio of width:height

let pinches = []; //array to hold pinch data
let coords = []; //array to hold sent line coordinates

let pinchX, pinchY; //coordinates of pinch location
let lastX, lastY; //last pinch sent to Arduino

let framesWithHand = 0; //consecutive frames with a hand on screen
let stableThreshold = 15; //stable frames needed to send coords

let serial;
let portName = "/dev/tty.usbmodem14301";

function preload() {
  myVid = createCapture(VIDEO);
  myVid.hide();
}

/*
Sets framerate + angleMode,
creates canvas + loads handpose model 
*/
function setup() {
  serial = new p5.SerialPort();
  serial.open(portName);
  
  frameRate(30);
  angleMode(DEGREES)
  
  modeSlider = createSlider(0,1,0,1);
  modeSlider.position(150,50);
  modeSlider.style('width', '80px'); 
  
  createCanvas(600, 450);
  canvasRatio = width/height;
  
  handposeSetup(); //load handpose model
}

function draw() {
  image(myVid,0,0)
}

/*  (triggered when a hand is detected on screen)
    Gets location of thumb tip and index finger tip,
    Calculates distance between fingertips,
    If distance is small enough, gets the coords of pinch location
*/
function parseResults(data) {
  let landmarks = data[0].landmarks;
  // drawRects(myVid.width, myVid.height);
  let x1 = landmarks[4][0]; //x+y coords of index finger base
  let y1 = landmarks[4][1];
  let x2 = landmarks[8][0]; //x+y coords of pinky finger base
  let y2 = landmarks[8][1];


  let pinchDist = dist(x1,y1,x2,y2);
  // console.log(pinchDist)
  
  if (pinchDist <= 30) {
    pinched((x1+x2)/2,((y1+y2)/2)); //get avg position between fingertips
    if (sliderVal == 0) {
      serial.write("m0");
    }
  } 
  // showNums(data);
}

/* (activates when hand is detected in a pinching motion, receives pinch coords)
    Adds pinch location to array of past 10 pinch locations,
    Calculates the distance traveled over those 10 frames,
    Draws a circle at the current pinch location + a line from the past location,
    If pinch location is stabilized over 30 frames:
      Sends pinch location through serialport,
      Updates past pinch location 
*/
function pinched(x,y) {
  pinchX = x;
  pinchY = y;
  palmX = x;
  palmY = y;
  let pinchDist;
  
  let onSliderX = (pinchX > 120 && pinchX < 250); //determine if pinching slider
  let onSliderY = (pinchY > 30 && pinchY < 70);
  let onSlider = onSliderX && onSliderY;
  if (onSlider) {
    modeSlider.value(Math.round(map(pinchX, 150,230, 0,1))); //move slider to pinch
    if (sliderVal != modeSlider.value()) { //when sliderVal changes:
      sliderVal = modeSlider.value(); //update variable
      if (sliderVal == 0) { //if 0, send PEN UP to arduino
        serial.write("d" + -0.5 + "," + 0);
      } else if (sliderVal == 1) { //if 1, send PEN DOWN
        serial.write("d" + 0 + "," + -0.5);
      }
    }
  } 

  
  //draw circle at current pinch location + line segment
  strokeWeight(5);
  noFill();
  if (lastX != undefined && !onSlider && sliderVal == 1) {
    line(pinchX, pinchY, lastX, lastY);
  }
  
  /* ********DRAW MODE********
  If slider is on the right, sends pinch location data to Arduino for drawing.
  Pinch must be stabilized: 
    Model must detect a hand for 15 consecutive frames,
    Pinch location must be still enough in the last 10 frames
  */
  if (!onSlider && sliderVal == 1) { //if slider is on the right:
    
    pinches.push([pinchX, pinchY]); //add pinch location to array of locations
    let last10Pinches = pinches.slice(-10); //get 10 most recent entries
    if (last10Pinches.length >= 10) { //if there are at least 30 entries:
      //calculate pinch distance traveled over those 10 frames
      pinchDist = dist(last10Pinches[0][0], last10Pinches[0][1], 
                         last10Pinches[9][0], last10Pinches[9][1]); 
      if (pinchDist < 20) {
        strokeWeight(5)
        arc(x, y, 30, 30, 0, 360/stableThreshold*framesWithHand);
      } else framesWithHand = 0;
    }
    //if hand has been on camera for over 29 frames:
    if (framesWithHand%stableThreshold == stableThreshold-1) { 
      if (lastX == undefined) { //if this is the first pinch location:
        lastX = pinchX; //adds value to past pinch location variables
        lastY = pinchY;
      }
      if (pinchDist < 20) { //if pinch location is stabilized:
        let mapX = map(pinchX, 0, width, 0, 1000*canvasRatio);
        let mapY = map(pinchY, 0, height, 0, 1000);
        coords.push([mapX, mapY]);
        let toSend = "d" + int(mapX) + "," + int(mapY);
        serial.write(toSend + " sent.");
        console.log(toSend)
        lastX = pinchX;
        lastY = pinchY;
      }
    }
    
    /* *****DRIVE MODE*****
    If slider is on the left, creates a "quasi-joystick" to drive car:
    Sends value through serialport to car according to pinch location
    */
  } else if (sliderVal == 0 && !onSlider) {
    showRects();
    if (pinchX > width/3 && pinchX < width*2/3 && pinchY > 0 && pinchY < height/3) {
      if (framesWithHand > 10) serial.write("m1");
    } else if (pinchX > width/3 && pinchX < width*2/3 && pinchY > height*2/3 && pinchY < height) {
      if (framesWithHand > 10) serial.write("m2");
    } else if (pinchX > 0 && pinchX < width/3 && pinchY > height/3 && pinchY < height*2/3) {
      if (framesWithHand > 10) serial.write("m3")
    } else if (pinchX > width*2/3 && pinchX < width && pinchY > height/3 && pinchY < height) {
      if (framesWithHand > 10) serial.write("m4");
    } else {
      serial.write("m0");
    }
  }
}

function showRects() {
  rect(width/3, 0, width/3, height/3);
  rect(0, height/3, width/3, height/3);
  rect(width/3, height*2/3, width/3, height/3);
  rect(width*2/3, height/3, width/3, height/3);
  

}
function handposeSetup() {
  handpose = ml5.handpose(myVid, function() {
    console.log("Model loaded!");
  });
  
  //callback function when model detects a hand
  handpose.on('predict', results => {
    if (results.length == 1) {
      parseResults(results); //calculate+show hand angle 
      framesWithHand++;
      // showNums(results); //show numbers on landmarks
    } else {
      framesWithHand = 0;
    }
  });
}

function showNums(data) {
  textSize(20);
  strokeWeight(2)
  stroke(0,0,0,255)
  for (let i = 0; i < data[0].landmarks.length; i++) { //for each landmark 
    let x = data[0].landmarks[i][0]; //get x position from first number
    let y = data[0].landmarks[i][1]; //get y position from second number
    text(i, x, y); //display the text at the position
  }
}

function mousePressed() {
  console.log(mouseX, mouseY)
}
