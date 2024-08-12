import puppeteer from "puppeteer";
import fetch from "node-fetch";

import dotenv from "dotenv";

// Load environment variables
dotenv.config();
// Replace with your Telegram Bot Token and Chat ID
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Replace with your Telegram bot token
const CHAT_ID = process.env.CHAT_ID; // Replace with your Telegram chat ID

// URL and selector for the website and the specific section
const URL = "https://www.dhakapost.com/latest-news"; // Replace with the URL of the website to monitor
// const SECTION_SELECTOR = ".stKlc > a"; // Replace with the selector of the section to monitor
const SECTION_SELECTOR = "div.mb-6.last\\:mb-0.relative:first-of-type > a";

// Function to send a message via Telegram
const sendTelegramMessage = async (message, retries = 3) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: CHAT_ID,
    text: message,
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.ok) {
        console.log("Message sent successfully:", message);
        return; // Exit function after successful send
      } else {
        console.error(`Failed to send message (Attempt ${attempt}):`, data);
      }
    } catch (error) {
      console.error(`Error sending message (Attempt ${attempt}):`, error);

      if (error.code === 'ETIMEDOUT' && attempt < retries) {
        console.log("Retrying...");
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retrying
      } else {
        console.error("Failed to send message after multiple attempts.");
        return;
      }
    }
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
  let initialContent = await page.$eval(SECTION_SELECTOR, (el) => {
    const link = el.href;
    const title = el.querySelector("h2").innerText;
    const time = el.querySelector("p:last-of-type").innerText;
    
    return { link, title, time };
  });
  console.log("Monitoring website...");


  setInterval(async () => {
    try {
      // Reload the page with minimal wait
      await page.reload({ waitUntil: "domcontentloaded" });

      // Wait for the section to be available again
      await page.waitForSelector(SECTION_SELECTOR, { timeout: 10000 });
      const currentContent = await page.$eval(SECTION_SELECTOR, (el) => {
        const link = el.href;
        const title = el.querySelector("h2").innerText;
        const time = el.querySelector("p:last-of-type").innerText;
        console.log(link, title, time);
        return { link, title, time };
      });

      if (JSON.stringify(currentContent) !== JSON.stringify(initialContent)) {
        const message = `${currentContent.link}\n${currentContent.title}\n${currentContent.time}`;
        await sendTelegramMessage(message);
        console.log("Content updated.",currentContent);
        initialContent = currentContent; // Update the initial content
      } else {
        console.log("Content not updated.");
      }
    } catch (error) {
      console.error("Failed to check content:", error);
    }
  }, 20000); // Check every 60 seconds

  // Uncomment the following line if you want to close the browser after monitoring
  // await browser.close();
};

monitorWebsite();
