uint8_t btn = 2;
uint8_t count = 0;
char state[] = {'P', 'R', 'N', 'D'};
uint32_t last = 0;
uint32_t last1 = 0;
uint32_t timer = 0;


void setup() {
  pinMode(btn, INPUT_PULLUP);
  pinMode(13, OUTPUT);
  digitalWrite(13, HIGH);
  
  Serial.begin(115200);
//  Serial.println("BEGIN");
}
bool flag = false;

void loop() {
  // Send a 'Z' every 500ms
  if (flag && millis() - timer > 500) { 
    Serial.write("Z");
    timer = millis();
  }

//  // Send the current state every 1000ms
//  if (millis() - last > 1000) {
//    last = millis();
//    Serial1.write(state[count]);
////    Serial1.write('H');
//    Serial.print(state[count]);
//  }

  // change state on button press
  if (digitalRead(btn) == LOW && millis() - last1 > 1000) {
    last1 = millis();
    Serial.write(state[count]);
    
    count++;
    if (count > 3)
      count = 0;  
  }

  receiveSerial();

  delay(10);
}


void receiveSerial(void) {
  uint8_t incomingByte;
  static uint8_t last = 0;
//  static bool state = true;

  if (Serial.available() > 0) {
    incomingByte = Serial.read();
    
    if (incomingByte == 90) {
      digitalWrite(13, LOW);
      flag = false;
    }

    // If 'Z' is received, the gui is pinging us
    if (incomingByte == 'Z') 
        Serial.write("Z");

    // If 'H' is received, the gui wants to know our state
    else if (incomingByte == 'H')
      Serial.write(state[count]);
      
//
//    else if (incomingByte == 'U') 
//        Serial1.write("U");
//
//    else if (incomingByte == 'L') 
//        Serial1.write("L");
        
//    Serial.print("DATA:\t");
//    Serial.println(incomingByte, DEC);
  }
}



void determineIndication(void)
{
  Serial1.write("N");
  delay(100);
}
