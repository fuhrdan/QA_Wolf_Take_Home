const express = require('express');
const { chromium } = require('playwright');
const app = express();
const port = 3000;

// Serve static files from the 'public' folder
app.use(express.static('public'));

// Route to trigger the Playwright script
app.get('/start-script', async (req, res) => {
  let scriptResponse = '';  // Variable to hold the script's output

  try {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto('https://news.ycombinator.com/newest');

    // Scrape articles and their time
    const articles = await page.$$eval('tr.athing', articles => {
      return articles.map(article => {
        const title = article.querySelector('.storylink')?.textContent;
        const time = article.querySelector('span.age a')?.textContent.trim();
        return { title, time };
      });
    });

    // If no articles are found, handle it gracefully
    if (articles.length === 0) {
      scriptResponse = 'No articles found.';
      await browser.close();
      return res.send(`<pre>${scriptResponse}</pre>`);
    }

    // Convert the relative time to minutes and check if sorted
    const times = articles.map(article => article.time || '0 minutes');
    const convertedTimes = times.map(convertToMinutes);

    let sorted = true;
    for (let i = 0; i < convertedTimes.length - 1; i++) {
      if (convertedTimes[i] > convertedTimes[i + 1]) {
        sorted = false;
        break;
      }
    }

    // Add sorting check to response
    scriptResponse += 'Successfully fetched articles:\n\n';
    articles.forEach((article, index) => {
      scriptResponse += `${index + 1}. ${article.title} - ${article.time || 'No time available'}\n`;
    });

    scriptResponse += '\nSorting check:\n';
    if (sorted) {
      scriptResponse += 'The articles are sorted from newest to oldest, which is correct.\n';
    } else {
      scriptResponse += 'NOT SORTED NEWEST TO OLDEST!\n';
    }

    // Call a function to check if articles are in order based on their times
    const sortedArticles = checkArticleOrder(articles, convertedTimes);
    scriptResponse += `\nArticles sorted correctly: ${sortedArticles}\n`;

    // Close the browser after fetching data
    await browser.close();
    
  } catch (err) {
    console.error('Error during Playwright script execution:', err);
    scriptResponse = 'Error running the Playwright script: ' + err.message;
  }
  
  // Send the result back to the client (web interface)
  res.send(`<pre>${scriptResponse}</pre>`);
});

// Function to convert relative time to minutes
function convertToMinutes(timeText) {
  if (!timeText) return 0;  // Handle empty or missing time
  const [value, unit] = timeText.split(' ');
  const numValue = parseInt(value, 10);
  switch(unit) {
    case 'minute':
    case 'minutes':
      return numValue;
    case 'hour':
    case 'hours':
      return numValue * 60;
    case 'day':
    case 'days':
      return numValue * 24 * 60;
    case 'month':
    case 'months':
      return numValue * 30 * 24 * 60; // Not every month is 30 days, but it works for this test
    case 'year':
    case 'years':
      return numValue * 365 * 24 * 60; // This does not take into account leap year, but again, for this test
    default:
      return 0;
  }
}

// Function to check if articles are in order based on their timestamps
function checkArticleOrder(articles, convertedTimes) {
  let sortedCorrectly = true;
  for (let i = 0; i < convertedTimes.length - 1; i++) {
    if (convertedTimes[i] > convertedTimes[i + 1]) {
      sortedCorrectly = false;
      break;
    }
  }
  return sortedCorrectly ? 'Yes' : 'No';
}

// Start the Express server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
