const robot = require("robotjs");

// Test different key taps
const testKeys = () => {
  console.log("Testing key taps...");

  // Simulate pressing 'enter'
  console.log("Pressing Enter...");
  robot.keyTap("enter");
  robot.setKeyboardDelay(1000); // Wait a bit

  // Simulate pressing 'return'
  console.log("Pressing Return...");
  robot.keyTap("escape");
  robot.setKeyboardDelay(1000); // Wait a bit

  // Simulate pressing 'tab'
  console.log("Pressing Tab...");
  robot.keyTap("tab");
  robot.setKeyboardDelay(1000); // Wait a bit

  console.log("Key taps test completed.");
};

testKeys();
