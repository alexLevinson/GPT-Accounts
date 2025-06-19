require('dotenv').config();

const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");
const Browserbase = require('@browserbasehq/sdk').default;

const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY;
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const MAX_RETRIES = 3;

// Human-like timing function
function sleep(min, max) {
  const timeout = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, timeout));
}

(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let retries = 0;
  let success = false;
  let browser = null;
  let session = null;
  let email = null;
  let password = null;

  while (retries < MAX_RETRIES && !success) {
    try {
      console.info(`Attempt ${retries + 1}/${MAX_RETRIES}: Launching browser...`);

      // Initialize Browserbase SDK
      const bb = new Browserbase({ apiKey: BROWSERBASE_API_KEY });

      // Create a new browser session with proxies
      session = await bb.sessions.create({
        projectId: BROWSERBASE_PROJECT_ID,
        proxies: false
      });

      // Connect to the browser session
      browser = await chromium.connectOverCDP(session.connectUrl);
      console.info('Connected to Browserbase with proxy!');

      await sleep(800, 2000);

      const context = browser.contexts()[0];
      const page = context.pages()[0];

      await page.goto("https://www.chatgpt.com");
      console.log("Navigated to ChatGPT");

      await sleep(1500, 3000);

      // Move mouse to login button first, then click
      const loginButton = await page.locator('button[data-testid="login-button"]').first();
      const loginButtonBox = await loginButton.boundingBox();
      await page.mouse.move(
        loginButtonBox.x + loginButtonBox.width / 2,
        loginButtonBox.y + loginButtonBox.height / 2,
        { steps: 10 }
      );
      await sleep(300, 800);
      await loginButton.click();
      console.log("Initiated Auth Flow");

      await sleep(800, 2000);

      // Move mouse to and click the "Sign up" link on the auth page
      const signupLink = await page.locator('a[href="/create-account"]');
      const signupLinkBox = await signupLink.boundingBox();
      await page.mouse.move(
        signupLinkBox.x + signupLinkBox.width / 2,
        signupLinkBox.y + signupLinkBox.height / 2,
        { steps: 6 }
      );
      await sleep(300, 700);
      await signupLink.click();
      console.log("Clicked Sign up link on auth page");

      await sleep(800, 2000);

      // Open a new tab for 10minutemail.com
      const emailPage = await context.newPage();
      await emailPage.goto("https://10minutemail.com");
      console.log("Opened 10minutemail.com in a new tab");

      // Wait for the email address to be available and get it
      await emailPage.waitForSelector('#mail_address');
      email = await emailPage.evaluate(() => document.getElementById('mail_address').value);
      console.log("Got email address:", email);

      // Enter 10minutemail.com email address with human-like typing
      await page.waitForSelector('input[name="email"]');
      const emailInput = await page.locator('input[name="email"]');
      const emailInputBox = await emailInput.boundingBox();
      await page.mouse.move(
        emailInputBox.x + emailInputBox.width / 2,
        emailInputBox.y + emailInputBox.height / 2,
        { steps: 8 }
      );
      await sleep(300, 700);
      await emailInput.click();
      await sleep(500, 1000);
      // Type email character by character with variable timing
      for (let i = 0; i < email.length; i++) {
        await page.keyboard.type(email[i]);
        await sleep(50, 150);
      }

      // Move mouse to and click continue button
      const continueButton = await page.locator('button._root_625o4_51._primary_625o4_86');
      const continueButtonBox = await continueButton.boundingBox();
      await page.mouse.move(
        continueButtonBox.x + continueButtonBox.width / 2,
        continueButtonBox.y + continueButtonBox.height / 2,
        { steps: 7 }
      );
      await sleep(300, 700);
      await continueButton.click();

      // Generate and enter randomly generated password
      function generatePassword(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const array = new Uint8Array(length);
        crypto.getRandomValues(array); // Web Crypto API
        return Array.from(array, byte => chars[byte % chars.length]).join('');
      }

      password = generatePassword(12);
      console.log("Generated password:", password);
      await page.waitForSelector('input[id=":ru:-password"]');

      // Move mouse to password field and click
      const passwordInput = await page.locator('input[id=":ru:-password"]');
      const passwordInputBox = await passwordInput.boundingBox();
      await page.mouse.move(
        passwordInputBox.x + passwordInputBox.width / 2,
        passwordInputBox.y + passwordInputBox.height / 2,
        { steps: 5 }
      );
      await sleep(300, 700);
      await passwordInput.click();
      await sleep(500, 1000);

      // Type password character by character with variable timing
      for (let i = 0; i < password.length; i++) {
        await page.keyboard.type(password[i]);
        await sleep(40, 120);
      }

      // Move mouse to and click continue button
      const passwordContinueButton = await page.locator('button._root_625o4_51._primary_625o4_86');
      const passwordContinueBox = await passwordContinueButton.boundingBox();
      await page.mouse.move(
        passwordContinueBox.x + passwordContinueBox.width / 2,
        passwordContinueBox.y + passwordContinueBox.height / 2,
        { steps: 6 }
      );
      await sleep(300, 700);
      await passwordContinueButton.click();

      // Wait for email to arrive
      await emailPage.waitForSelector('.mail_message', { timeout: 60000 });

      // Extract the verification code from the email
      const emailCode = await emailPage.evaluate(() => {
        // Look for the code in the email content
        const messageText = document.querySelector('.message_bottom').textContent;

        // Extract the 6-digit code
        const codeMatch = messageText.match(/Your ChatGPT code is (\d{6})/);
        if (codeMatch && codeMatch[1]) {
          return codeMatch[1];
        }

        // Alternative extraction method if the above fails
        const paragraphs = document.querySelectorAll('.message_bottom p');
        for (const p of paragraphs) {
          if (p.textContent.trim().match(/^\d{6}$/)) {
            return p.textContent.trim();
          }
        }

        return null;
      });

      console.log("Extracted verification code:", emailCode);

      // Enter the verification code with human-like behavior
      await page.waitForSelector('input[id=":r4:-code"]');
      const codeInput = await page.locator('input[id=":r4:-code"]');
      const codeInputBox = await codeInput.boundingBox();
      await page.mouse.move(
        codeInputBox.x + codeInputBox.width / 2,
        codeInputBox.y + codeInputBox.height / 2,
        { steps: 7 }
      );
      await sleep(300, 700);
      await codeInput.click();
      await sleep(500, 1000);

      // Type verification code with variable timing
      for (let i = 0; i < emailCode.length; i++) {
        await page.keyboard.type(emailCode[i]);
        await sleep(80, 200);
      }

      // Move mouse to and click continue button
      const codeContinueButton = await page.locator('button._root_625o4_51._primary_625o4_86');
      const codeContinueBox = await codeContinueButton.boundingBox();
      await page.mouse.move(
        codeContinueBox.x + codeContinueBox.width / 2,
        codeContinueBox.y + codeContinueBox.height / 2,
        { steps: 5 }
      );
      await sleep(300, 700);
      await codeContinueButton.click();

      // Generate a random name
      function generateRandomName() {
        const firstNames = ['Joseph', 'Sarah', 'Michael', 'Emma', 'David', 'Lisa', 'James', 'Jennifer', 'Robert', 'Emily', 'William', 'Olivia', 'Thomas', 'Sophia', 'Daniel'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris'];

        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

        return `${firstName} ${lastName}`;
      }

      const fullName = generateRandomName();
      await page.waitForSelector('input[data-focused="true"]');

      // Move mouse to and click name input field
      const nameInput = await page.locator('input[data-focused="true"]');
      const nameInputBox = await nameInput.boundingBox();
      await page.mouse.move(
        nameInputBox.x + nameInputBox.width / 2,
        nameInputBox.y + nameInputBox.height / 2,
        { steps: 8 }
      );
      await sleep(300, 700);
      await nameInput.click();
      await sleep(500, 1000);

      // Type name character by character with variable timing
      for (let i = 0; i < fullName.length; i++) {
        await page.keyboard.type(fullName[i]);
        await sleep(60, 180);
      }

      console.log(`Entered name ${fullName}`);

      // Generate random birthday (18-65 years old)
      async function fillRandomBirthday() {
        const today = new Date();
        const minAge = 18;
        const maxAge = 65;

        // Calculate year range
        const minYear = today.getFullYear() - maxAge;
        const maxYear = today.getFullYear() - minAge;
        const year = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;

        // Random month (1-12)
        const month = Math.floor(Math.random() * 12) + 1;

        // Random day (1-28/30/31 depending on month)
        let maxDays = 31;
        if (month === 2) {
          maxDays = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28;
        } else if ([4, 6, 9, 11].includes(month)) {
          maxDays = 30;
        }
        const day = Math.floor(Math.random() * maxDays) + 1;

        // Use a different approach - move mouse to the date field first
        const dateField = await page.locator('.react-aria-DateField');
        const dateFieldBox = await dateField.boundingBox();
        await page.mouse.move(
          dateFieldBox.x + dateFieldBox.width / 2,
          dateFieldBox.y + dateFieldBox.height / 2,
          { steps: 7 }
        );
        await sleep(300, 700);
        await dateField.click({ force: true });
        await sleep(500, 1000);

        // Type the date using keyboard input with variable timing
        const formattedMonth = month.toString().padStart(2, '0');
        const formattedDay = day.toString().padStart(2, '0');
        const dateString = `${formattedMonth}${formattedDay}${year}`;

        for (let i = 0; i < dateString.length; i++) {
          await page.keyboard.type(dateString[i]);
          await sleep(70, 150);
        }

        console.log(`Set birthday to: ${month}/${day}/${year}`);
        await sleep(800, 1500);
      }

      // Fill birthday fields
      await fillRandomBirthday();

      // Move mouse to and click the continue button
      const birthdayContinueButton = await page.locator('button._root_625o4_51._primary_625o4_86');
      const birthdayContinueBox = await birthdayContinueButton.boundingBox();
      await page.mouse.move(
        birthdayContinueBox.x + birthdayContinueBox.width / 2,
        birthdayContinueBox.y + birthdayContinueBox.height / 2,
        { steps: 8 }
      );
      await sleep(300, 700);
      await birthdayContinueButton.click();
      console.log("Clicked continue button");

      try {
        await page.waitForSelector('button[data-testid="getting-started-button"]', { timeout: 10000 });
        console.log("Found 'Okay, let's go' button");
        // If the button is still there, try clicking it again with mouse movement
        const okayLetsGoButton = await page.locator('button[data-testid="getting-started-button"]', { timeout: 10000 });
        const okayLetsGoBox = await okayLetsGoButton.boundingBox();
        await page.mouse.move(
          okayLetsGoBox.x + okayLetsGoBox.width / 2,
          okayLetsGoBox.y + okayLetsGoBox.height / 2,
          { steps: 7 }
        );
        await sleep(300, 700);
        await okayLetsGoButton.click();
        console.log("Clicked 'Okay, let's go' button");
      } catch (error) {
        console.log("Error finding or clicking the 'Okay, let's go' button:", error.message);
      }

      await sleep(2000, 3000);
      console.log("Account created successfully!");
      success = true;

      // Close browser
      await browser.close();
      console.log("Browser closed");

    } catch (error) {
      console.error(`Attempt ${retries + 1} failed:`, error.message);

      // Close browser if it was initialized
      try {
        if (browser) {
          await browser.close();
          console.log("Browser connection closed");
        }
      } catch (closeError) {
        console.error("Error closing browser:", closeError.message);
      }

      retries++;

      if (retries < MAX_RETRIES) {
        console.log(`Waiting to retry... (${retries}/${MAX_RETRIES})`);
        await sleep(5000, 8000);
      }
    }
  }

  if (!success) {
    console.error(`Failed after ${MAX_RETRIES} attempts. Exiting.`);
    process.exit(1);
  }

  // Save the successfully created account to Supabase
  const { data, error } = await supabase
    .from('chatgpt_accounts')
    .insert({
      email: email,
      password: password
    })
    .select();

  if (error) {
    console.error("Error saving to Supabase:", error);
    process.exit(1);
  } else {
    console.log("Successfully saved to Supabase:", data);
  }
  process.exit(0);
})()
