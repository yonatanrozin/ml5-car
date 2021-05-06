#include "letterCommands.h"
#include "config.h"

#include <Servo.h>


#define AI1 12 
#define AI2 11
#define BI1 10
#define BI2 9
#define pwmA A7
#define pwmB A6
#define stdby 4

#define servoXPin A2
#define servoYPin A3

Servo servoX;
Servo servoY;

bool testMode = false;

const int millisPerPoint = 1;
const int centerServoAngle = 100;

const int yAngleMax = 80;
const int yAngleMin = 120;

const int penDownAngle = 135;
const int penUpAngle = penDownAngle-10;


void setup() {
  
  servoX.attach(servoXPin);
  servoY.attach(servoYPin);
  
  servoX.write(centerServoAngle);
  servoY.write(penUpAngle);
  
  Serial.begin(9600);
  
  pinMode(AI1, OUTPUT);
  pinMode(AI2, OUTPUT);
  pinMode(BI1, OUTPUT);
  pinMode(BI2, OUTPUT);
  pinMode(stdby, OUTPUT);
  pinMode(pwmB, OUTPUT);
  pinMode(pwmA, OUTPUT);
  
  analogWrite(pwmA, 255);
  analogWrite(pwmB, 255);
  digitalWrite(stdby, HIGH);
  
  servoY.write(penUpAngle);

//  drawCommand(0,1000);
//  drawCommand(1000,1000);
//  drawCommand(1000,0);
//  drawCommand(0,0);
  delay(3000);

}

int xPos = 0; //current x-position of car
int numCommands; 


void drawCommand(float x, float y) {
  if (x != int(x) || y != int(y)) {
    if (x != int(x)) { //if x is a float:
      servoY.write(penUpAngle);
    } else if (y != int(y)) {
      servoY.write(penDownAngle);
    }
    return;
  }
  
  int xChange = x-xPos; //get change in horizontal position
  if (xChange > 0) { //if positive change:
    carBack();
  } else if (xChange < 0) { //if negative change:
    carForward();
  } 
  
  int yMap = map(y, 0, 1000, yAngleMax, yAngleMin); //calculate servo angle
  servoX.write(yMap); // move servo
  Serial.print(x);
  Serial.print(",");
  Serial.print(y);
 

  delay(abs(xChange*millisPerPoint)); //wait for horizontal motion according to degree of change
  carStop(); //stop the car when motion is completed
  
  Serial.println();
  
  xPos = x; //update current x-position
  delay(40);
  
  carStop();
}


void driveCar(int dirNum) {
  if (dirNum == 48 || dirNum == 0) {
    carStop();
  } else if (dirNum == 49 || dirNum == 1) {
    carForward();
  } else if (dirNum == 50 || dirNum == 2) {
    carBack();
  } else if (dirNum == 51 || dirNum == 3) {
    carLeft();
  } else if (dirNum == 52 || dirNum == 4) {
    carRight();
  } else carStop();
}

bool centralConnected = false;

void loop() {
  if (Serial.available() && testMode) {
    char servoChar = Serial.read();
    int num = Serial.parseInt();

    if ((String)servoChar == "x") {
      servoX.write(map(num,0,1000,yAngleMin,yAngleMax));
    } else if ((String)servoChar == "y") {
      servoY.write(num);
    } else if ((String)servoChar == "m") {
      int xChange = num-xPos;
      Serial.print("Moving by: ");
      Serial.println(xChange);
      xPos = num;
      if (xChange < 0) {
        carBack();
        delay(xChange*millisPerPoint*-1);
        carStop();
      } else if (xChange > 0) {
        carForward();
        delay(xChange*millisPerPoint);
        carStop();
      }
    }
    Serial.readString();
  }
  else if (Serial.available() && !testMode) {
    char commandType = Serial.read();
    if ((String)commandType == "d") {
      float x = Serial.parseFloat();
      float y = Serial.parseFloat();
      drawCommand(x,y);
    } else if ((String)commandType == "m") {
      int dir = Serial.parseInt();
      driveCar(dir);
    }
  }
}

void carBack() {
  digitalWrite(AI1, HIGH);
  digitalWrite(AI2, LOW);
  digitalWrite(BI1, HIGH);
  digitalWrite(BI2, LOW);
}

void carForward() {
  digitalWrite(AI1, LOW);
  digitalWrite(AI2, HIGH);
  digitalWrite(BI1, LOW);
  digitalWrite(BI2, HIGH);
}

void carRight() {
  digitalWrite(AI1, HIGH);
  digitalWrite(AI2, LOW);
  digitalWrite(BI1, LOW);
  digitalWrite(BI2, HIGH);
}

void carLeft() {
  digitalWrite(AI1, LOW);
  digitalWrite(AI2, HIGH);
  digitalWrite(BI1, HIGH);
  digitalWrite(BI2, LOW);
}

void carStop() {
  digitalWrite(AI1, LOW);
  digitalWrite(AI2, LOW);
  digitalWrite(BI1, LOW);
  digitalWrite(BI2, LOW);
}
