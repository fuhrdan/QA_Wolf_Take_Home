const { chromium } = require("playwright");

async function fetchAndSortHackerNewsArticles() {
  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to Hacker News
  await page.goto("https://news.ycombinator.com/newest");

  // Selector for articles and their timestamp
  const articleSelector = 'tr.athing';
  const timeSelector = 'span.age a';

  // Get all the articles
  const articles = await page.$$(articleSelector);
  const articleCount = Math.min(articles.length, 30); // Limit to 30 articles

  let articleDetails = [];

  // Get article titles and timestamps
  for (let i = 0; i < articleCount; i++) {
    const article = articles[i];

    try {
      // Extract the title
      const titleElement = await article.$('a.storylink');
      const title = await titleElement ? titleElement.textContent() : 'No title available';

      // Extract the time
      const timeElement = await article.$(timeSelector);
      const timeText = await timeElement ? timeElement.textContent() : 'No time available';

      // Save the article details
      articleDetails.push({
        title,
        time: timeText.trim() || 'No time available',
      });
    } catch (err) {
      console.error(`Error extracting data for article ${i + 1}:`, err);
    }
  }

  // Function to convert relative time to minutes
  function convertToMinutes(timeText) {
    const [value, unit] = timeText.split(' ');
    const numValue = parseInt(value, 10);
    switch (unit) {
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
        return numValue * 30 * 24 * 60; // Approximation
      case 'year':
      case 'years':
        return numValue * 365 * 24 * 60; // Approximation
      default:
        return 0;
    }
  }

  // Convert times to minutes
  let convertedTimes = articleDetails.map(article => ({
    title: article.title,
    time: article.time,
    timeInMinutes: convertToMinutes(article.time),
  }));

  // Sort the articles by time
  let sorted = true;
  for (let i = 0; i < convertedTimes.length - 1; i++) {
    if (convertedTimes[i].timeInMinutes < convertedTimes[i + 1].timeInMinutes) {
      sorted = false;
      break;
    }
  }

  // Display article details
  console.log("Successfully fetched articles:\n");
  convertedTimes.forEach((article, index) => {
    const status = sorted ? 'In order' : 'Out of order';
    const color = status === 'In order' ? '\x1b[32m' : '\x1b[31m'; // Green for "In order", Red for "Out of order"
    console.log(`${index + 1}. ${article.title} - ${article.time} - ${color}${status}\x1b[0m`);
  });

  // Display sorting result
  const sortingStatus = sorted ? "The articles are sorted from newest to oldest." : "The articles are NOT sorted correctly.";
  console.log("\nSorting check:\n", sortingStatus);

  // Close the browser
  await browser.close();
}

(async () => {
  await fetchAndSortHackerNewsArticles();
})();
