import puppeteer from "puppeteer";
import fetch from "node-fetch";

// Replace with your Telegram Bot Token and Chat ID
const TELEGRAM_BOT_TOKEN = "7027110651:AAH-BiOhuxnyqFcvvoZaOPdTU8r_mAmWutU"; // Replace with your Telegram bot token
const CHAT_ID = "5971736824"; // Replace with your Telegram chat ID

// URL and selector for the website and the specific section
const URL = "https://www.prothomalo.com/collection/latest"; // Replace with the URL of the website to monitor
const SECTION_SELECTOR = ".stKlc > a"; // Replace with the selector of the section to monitor

// Function to send a message via Telegram
const sendTelegramMessage = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: CHAT_ID,
    text: message,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (data.ok) {
      console.log("Message sent successfully:", message);
    } else {
      console.error("Failed to send message:", data);
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

// Function to monitor the website
const monitorWebsite = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Optimize navigation
    await page.goto(URL, {
      waitUntil: "domcontentloaded", // Only wait for DOM to be loaded, not all resources
      timeout: 30000, // Reduced timeout for quicker failure
    });
    console.log("Page loaded successfully.");
  } catch (error) {
    console.error("Failed to load page:", error);
    await browser.close();
    return;
  }

  // Wait for the section to be available
  try {
    await page.waitForSelector(SECTION_SELECTOR, { timeout: 10000 }); // Wait up to 10 seconds
  } catch (error) {
    console.error(
      `Error: failed to find element matching selector "${SECTION_SELECTOR}"`
    );
    await browser.close();
    return;
  }

  // Get the initial content of the section
  let initialContent = await page.$eval(SECTION_SELECTOR, (el) => el.innerHTML);
  console.log("Monitoring website...");

  setInterval(async () => {
    try {
      // Reload the page with minimal wait
      await page.reload({ waitUntil: "domcontentloaded" });

      // Wait for the section to be available again
      await page.waitForSelector(SECTION_SELECTOR, { timeout: 10000 });
      const currentContent = await page.$eval(
        SECTION_SELECTOR,
        (el) => el.innerHTML
      );

      console.log(
        currentContent.replace(/<[^>]*>?/gm, ""),
        initialContent.replace(/<[^>]*>?/gm, "")
      );
      if (currentContent !== initialContent) {
        await sendTelegramMessage(
          // make it to just text
          currentContent.replace(/<[^>]*>?/gm, "")
        );
        console.log("Content updated.");
        initialContent = currentContent; // Update the initial content
      } else {
        console.log("Content not updated.");
      }
    } catch (error) {
      console.error("Failed to check content:", error);
    }
  }, 6000); // Check every 6 seconds

  // Uncomment the following line if you want to close the browser after monitoring
  // await browser.close();
};

monitorWebsite();



