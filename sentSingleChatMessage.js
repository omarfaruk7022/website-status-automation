import puppeteer from "puppeteer";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Replace with your Telegram Bot Token
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // Use environment variable for security

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the file storing chat IDs
const CHAT_IDS_FILE = path.join(__dirname, "chat_ids.json");

// URL and selector for the website and the specific section
const URL = "https://www.prothomalo.com/collection/latest"; // Replace with the URL of the website to monitor
const SECTION_SELECTOR = ".stKlc > a"; // Replace with the selector of the section to monitor

// Function to read chat IDs from the file
const getChatIds = () => {
  if (!fs.existsSync(CHAT_IDS_FILE)) {
    return [];
  }
  const data = fs.readFileSync(CHAT_IDS_FILE);
  return JSON.parse(data);
};

// Function to save a chat ID to the file
const saveChatId = (chatId) => {
  const chatIds = getChatIds();
  if (!chatIds.includes(chatId)) {
    chatIds.push(chatId);
    fs.writeFileSync(CHAT_IDS_FILE, JSON.stringify(chatIds));
  }
};

// Function to send a message via Telegram
const sendTelegramMessage = async (message, chatId) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
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
      console.log(`Message sent successfully to chat ID: ${chatId}`);
    } else {
      console.error(`Failed to send message to chat ID: ${chatId}`, data);
    }
  } catch (error) {
    console.error(`Error sending message to chat ID: ${chatId}`, error);
  }
};

// Function to broadcast a message to all stored chat IDs
const broadcastMessage = async (message) => {
  const chatIds = getChatIds();
  for (const chatId of chatIds) {
    await sendTelegramMessage(message, chatId);
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
    const title = el.getAttribute("aria-label");

    return { link, title };
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
        const title = el.getAttribute("aria-label");

        return { link, title };
      });

      if (JSON.stringify(currentContent) !== JSON.stringify(initialContent)) {
        const message = `${currentContent.link}\n${currentContent.title}`;
        await broadcastMessage(message);
        console.log("Content updated.");
        initialContent = currentContent; // Update the initial content
      } else {
        console.log("Content not updated.");
      }
    } catch (error) {
      console.error("Failed to check content:", error);
    }
  }, 30000); // Check every 30 seconds
};

monitorWebsite();
