import axios from 'axios';
import fs from 'fs';
import chalk from 'chalk';
import { faker } from '@faker-js/faker';
import { execSync } from 'child_process';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import readline from 'readline';

// ─────────────────────────────────────────────────────────────────────────────
// Global Configuration & Banners
// ─────────────────────────────────────────────────────────────────────────────
const agents = {
  "deployment_p5J9lz1Zxe7CYEoo0TZpRVay": "Professor",
  //"deployment_7sZJSiCqCNDy9bBHTEh7dwd9": "Crypto Buddy",
  //"deployment_SoFftlsf9z4fyA3QCHYkaANq": "Sherlock"
};

let apiKey = 'your_groq_apikeys';
const headersFilePath = 'headers.json';
const proxyIndexFilePath = 'proxy_index.txt';
let rateLimitExceeded = false;

const ASCII_ART = `███████  █████  ██    ██  █████  ███    ██    ██      ██   ██ ██    ██ ██   ██ ████   ██    ███████ ███████ ██    ██ ███████ ██ ██  ██    ██ ██   ██  ██  ██  ██   ██ ██  ██ ██    ███████ ██   ██   ████   ██   ██ ██   ████`;
const BANNER = `███████  █████  ██    ██  █████  ███    ██    ██      ██   ██ ██    ██ ██   ██ ████   ██    ███████ ███████ ██    ██ ███████ ██ ██  ██    ██ ██   ██  ██  ██  ██   ██ ██  ██ ██    ███████ ██   ██   ████   ██   ██ ██   ████`;

// Create readline interface for menu input.
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

function rainbowBanner() {
  const colors = [chalk.red, chalk.yellow, chalk.green, chalk.cyan, chalk.blue, chalk.magenta];
  // Clear the console
  execSync(process.platform === 'win32' ? 'cls' : 'clear');
  // Build output string with each character in a cycling color.
  let output = '';
  for (let i = 0; i < ASCII_ART.length; i++) {
    const colorFn = colors[i % colors.length];
    output += colorFn(ASCII_ART[i]);
  }
  console.log(output + '\n');
}

function loadHeaders() {
  if (fs.existsSync(headersFilePath)) {
    const headersData = fs.readFileSync(headersFilePath, 'utf-8');
    try {
      return JSON.parse(headersData);
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveHeaders(headers) {
  fs.writeFileSync(headersFilePath, JSON.stringify(headers, null, 2));
}

function generateRandomDesktopHeader() {
  return faker.internet.userAgent({ deviceCategory: 'desktop' });
}

function getRandomTheme() {
  const themes = [
    "Proof of Attributed Intelligence (PoAI)",
    "Decentralized AI Governance",
    "Democratization of AI Economy",
    "AI-powered Smart Contracts",
    "Blockchain-based AI Marketplaces",
    "Autonomous AI Agents on Blockchain",
    "Scalability Challenges in AI & Blockchain",
    "Zero-Knowledge Proofs for AI Privacy",
    "AI and Blockchain Synergy for Cybersecurity",
    "Energy Efficiency in AI Blockchain Networks"
  ];
  return themes[Math.floor(Math.random() * themes.length)];
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function generateRandomWords() {
  const words = {
    subjects: [
      "AI", "blockchain", "smart contracts", "scalability", "security",
      "privacy", "decentralization", "automation", "trust", "efficiency"
    ],
    verbs: [
      "improve", "affect", "contribute", "enhance", "drive",
      "change", "transform", "reduce", "optimize", "strengthen"
    ],
    objects: [
      "technology", "systems", "applications", "networks", "protocols",
      "platforms", "transactions", "processes", "infrastructure", "economy"
    ],
    questions: [
      "How", "What", "Can", "Why", "Does", "What is the impact of",
      "How does", "What effect does", "Can", "How can"
    ],
    modifiers: [
      "the future of", "the efficiency of", "the security of", "the scalability of",
      "the integration of", "the development of", "the adoption of"
    ]
  };

  const subject = words.subjects[Math.floor(Math.random() * words.subjects.length)];
  const verb = words.verbs[Math.floor(Math.random() * words.verbs.length)];
  const object = words.objects[Math.floor(Math.random() * words.objects.length)];
  const question = words.questions[Math.floor(Math.random() * words.questions.length)];
  const modifier = words.modifiers[Math.floor(Math.random() * words.modifiers.length)];

  return { subject, verb, object, question, modifier };
}

function generateHardcodedQuestion(theme) {
  const { subject, verb, object, question, modifier } = generateRandomWords();
  // Construct a structured question
  const questionString = `${question} ${subject} ${verb} ${modifier} ${object}?`;
  return questionString;
}

async function generateRandomQuestion() {
  const theme = getRandomTheme();
  // If rate limit has been exceeded, fall back to a hardcoded question.
  if (rateLimitExceeded) {
    return generateHardcodedQuestion(theme);
  }

  try {
    // Request a concise, diverse question from the external API.
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: `Generate a short, diverse, and random question related to '${theme}' in the context of AI and blockchain. Avoid repetitive phrasing such as 'What impact'. Use different structures like 'What is', 'Can', 'How does', 'Why does', 'Does', and others. Keep it concise and avoid long sentences.`
          }
        ],
        temperature: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    if (error.response && error.response.data && error.response.data.code === 'rate_limit_exceeded') {
      rateLimitExceeded = true;
      console.error(chalk.red('Rate limit exceeded. Switching to hardcoded questions.'));
    } else {
      console.error(chalk.red('Error generating question:'), error.response ? error.response.data : error.message);
    }
    return generateHardcodedQuestion(theme);
  }
}

function getCurrentTime() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').split('.')[0];
}

function loadProxies() {
  if (fs.existsSync('proxy.txt')) {
    const proxyData = fs.readFileSync('proxy.txt', 'utf-8');
    return proxyData.split('\n').filter(Boolean);
  }
  return [];
}

function saveProxyIndex(index) {
  fs.writeFileSync(proxyIndexFilePath, index.toString());
}

function loadProxyIndex() {
  if (fs.existsSync(proxyIndexFilePath)) {
    const indexData = fs.readFileSync(proxyIndexFilePath, 'utf-8');
    return parseInt(indexData, 10);
  }
  return 0;
}

function createProxyAgent(proxy) {
  // Expecting proxy in the format "protocol://host:port"
  const [protocol, hostWithPort] = proxy.split('://');
  if (!hostWithPort) {
    throw new Error(`Invalid proxy format: ${proxy}`);
  }
  const [host, port] = hostWithPort.split(':');
  switch (protocol) {
    case 'http':
      return new HttpProxyAgent(`http://${host}:${port}`);
    case 'https':
      return new HttpsProxyAgent(`http://${host}:${port}`);
    case 'socks4':
      return new SocksProxyAgent(`socks4://${host}:${port}`);
    case 'socks5':
      return new SocksProxyAgent(`socks5://${host}:${port}`);
    default:
      throw new Error(`Unsupported proxy protocol: ${protocol}`);
  }
}

async function sendRandomQuestion(agent, headers, proxy) {
  const randomQuestion = await generateRandomQuestion();
  if (rateLimitExceeded) {
    return { question: randomQuestion, response: { content: '' } };
  }

  const proxyTimeout = 5000; // Timeout in milliseconds
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      'access-control-allow-origin': '*',
      'cache-control': 'no-cache',
      'connection': 'keep-alive'
    },
    timeout: proxyTimeout
  };

  if (proxy) {
    config.httpAgent = createProxyAgent(proxy);
    config.httpsAgent = createProxyAgent(proxy);
    console.log(chalk.cyan(`Using proxy: ${proxy}`));
  } else {
    config.httpAgent = null;
    config.httpsAgent = null;
    console.log(chalk.cyan('Using direct connection'));
  }

  try {
    const payload = { message: randomQuestion, stream: false };
    const url = `https://${agent.toLowerCase().replace('_', '-')}.stag-vxzy.zettablock.com/main`;
    const response = await axios.post(url, payload, config);
    return { question: randomQuestion, response: response.data.choices[0].message };
  } catch (error) {
    console.error(chalk.red(`Error sending question: ${error.message}`));
    return null;
  }
}

async function reportUsage(wallet, options) {
  try {
    const payload = {
      wallet_address: wallet,
      agent_id: options.agent_id,
      request_text: options.question,
      response_text: options.response,
      request_metadata: {}
    };

    await axios.post(
      'https://quests-usage-dev.prod.zettablock.com/api/report_usage',
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log(chalk.green('Usage data reported successfully!\n'));
  } catch (error) {
    if (
      error.response &&
      error.response.data &&
      error.response.data.error &&
      error.response.data.error.includes('Rate limit exceeded')
    ) {
      console.error(chalk.red('Rate limit exceeded. Skipping this usage report.'));
    } else {
      console.error(chalk.red('Failed to report usage.'));
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function countdown(randomTime) {
  for (let i = randomTime; i > 0; i--) {
    const hours = Math.floor(i / 3600);
    const minutes = Math.floor((i % 3600) / 60);
    const seconds = i % 60;
    process.stdout.write(`Waiting time: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}\r`);
    await sleep(1000);
  }
  console.log();
}

async function processWallet(wallet, headers, iterationsPerAgent, proxies, usedProxies) {
  console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.greenBright(`${getCurrentTime()} - Wallet: ${wallet}`));
  let proxyIndex = loadProxyIndex();
  let currentProxy = null;

  // Find a unique proxy for the wallet if proxies exist.
  while (!currentProxy && proxyIndex < proxies.length) {
    const potentialProxy = proxies[proxyIndex % proxies.length];
    if (!usedProxies.has(potentialProxy)) {
      currentProxy = potentialProxy;
      usedProxies.add(currentProxy);
    }
    proxyIndex++;
  }

  if (!currentProxy && proxies.length === 0) {
    console.log(chalk.yellow('No proxies available. Using direct connection.'));
  } else if (!currentProxy) {
    console.error(chalk.red('No available proxies left to use.'));
    return;
  }

  saveProxyIndex(proxyIndex);

  for (const [agentId, agentName] of Object.entries(agents)) {
    console.log(chalk.greenBright(`${getCurrentTime()} - Agent: ${agentName}`));
    console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    for (let i = 0; i < iterationsPerAgent; i++) {
      console.log(chalk.yellow(`${getCurrentTime()} - Iteration-${i + 1}`));

      let nanya = null;
      let attempt = 0;

      while (!nanya && attempt < (currentProxy ? proxies.length : 1)) {
        nanya = await sendRandomQuestion(agentId, headers[wallet], currentProxy);
        if (!nanya || !nanya.response || !nanya.response.content) {
          if (currentProxy) {
            console.log(chalk.red('Unable to send question, switching proxy...'));
            usedProxies.delete(currentProxy);
            currentProxy = null;

            // Try to pick a new proxy.
            while (!currentProxy && proxyIndex < proxies.length) {
              const potentialProxy = proxies[proxyIndex % proxies.length];
              if (!usedProxies.has(potentialProxy)) {
                currentProxy = potentialProxy;
                usedProxies.add(currentProxy);
              }
              proxyIndex++;
            }

            if (!currentProxy) {
              console.log(chalk.yellow('No proxies available. Using direct connection.'));
              break;
            }
            attempt++;
            await sleep(1000);
          } else {
            break;
          }
        }
      }

      if (nanya && nanya.response && nanya.response.content) {
        const truncatedResponse = nanya.response.content.split(' ').slice(0, 7).join(' ') + '...';
        console.log(chalk.cyan('Question:'), chalk.bold(nanya.question));
        console.log(chalk.green('Answer:'), chalk.italic(truncatedResponse));

        await reportUsage(wallet.toLowerCase(), {
          agent_id: agentId,
          question: nanya.question,
          response: nanya.response.content
        });
        await sleep(1000);
      } else {
        console.log(chalk.red('Max retries reached. Unable to send question.'));
      }
    }
    console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Automated Process (Recursive)
// ─────────────────────────────────────────────────────────────────────────────

async function automatedProcess() {
  console.clear();
  rainbowBanner();

  const wallets = fs.existsSync('wallet.txt')
    ? fs.readFileSync('wallet.txt', 'utf-8').split('\n').filter(Boolean)
    : [];
  if (wallets.length === 0) {
    console.log(chalk.red("No wallets found. Please add wallets using the menu."));
    return;
  }
  const proxies = loadProxies();
  const headers = loadHeaders();
  const iterationsPerAgent = 7;
  let usedProxies = new Set();

  for (const wallet of wallets) {
    if (!headers[wallet]) {
      headers[wallet] = { 'User-Agent': generateRandomDesktopHeader() };
      saveHeaders(headers);
    }
    try {
      await processWallet(wallet, headers, iterationsPerAgent, proxies, usedProxies);
    } catch (error) {
      console.error(chalk.red(`Failed to process wallet ${wallet}: ${error.message}`));
    }
  }

  // Wait for a random period between 3 to 7 hours before restarting.
  const randomTime = Math.floor(Math.random() * (7 * 3600 - 3 * 3600 + 1)) + 3 * 3600;
  await countdown(randomTime);

  // Reset rate limit flag and restart.
  rateLimitExceeded = false;
  await automatedProcess();
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu & Interaction Functions
// ─────────────────────────────────────────────────────────────────────────────

async function showMenu() {
  console.clear();
  console.log(chalk.cyan(BANNER));
  console.log(chalk.yellow('\nMenu Options:'));
  console.log('1. ADD WALLET');
  console.log('2. SET API KEY');
  console.log('3. RESET WALLETS');
  console.log('4. DELETE API KEY');
  console.log('5. START INTERACTION');
  console.log('6. EXIT');
}

async function addWallet() {
  const wallet = await new Promise(resolve => rl.question('Enter wallet address: ', resolve));
  fs.appendFileSync('wallet.txt', wallet + '\n');
  console.log(chalk.green('Wallet added successfully!'));
  await new Promise(resolve => rl.question('Press Enter to continue...', resolve));
}

async function setApiKey() {
  const newApiKey = await new Promise(resolve => rl.question('Enter API Key: ', resolve));
  let content = fs.readFileSync('main.js', 'utf8');
  content = content.replace(/const apiKey = .*?;/, `const apiKey = '${newApiKey}';`);
  fs.writeFileSync('main.js', content);
  console.log(chalk.green('API Key set successfully!'));
  await new Promise(resolve => rl.question('Press Enter to continue...', resolve));
}

async function resetWallets() {
  fs.writeFileSync('wallet.txt', '');
  console.log(chalk.green('Wallets reset successfully!'));
  await new Promise(resolve => rl.question('Press Enter to continue...', resolve));
}

async function deleteApiKey() {
  let content = fs.readFileSync('main.js', 'utf8');
  content = content.replace(/const apiKey = .*?;/, `const apiKey = 'your_groq_apikeys';`);
  fs.writeFileSync('main.js', content);
  console.log(chalk.green('API Key deleted successfully!'));
  await new Promise(resolve => rl.question('Press Enter to continue...', resolve));
}

async function startInteraction() {
  console.clear();
  await automatedProcess();
}

async function handleMenuChoice() {
  while (true) {
    await showMenu();
    const choice = await new Promise(resolve => rl.question('\nEnter your choice (1-6): ', resolve));
    switch (choice.trim()) {
      case '1':
        await addWallet();
        break;
      case '2':
        await setApiKey();
        break;
      case '3':
        await resetWallets();
        break;
      case '4':
        await deleteApiKey();
        break;
      case '5':
        await startInteraction();
        break;
      case '6':
        rl.close();
        process.exit(0);
      default:
        console.log(chalk.red('Invalid choice. Press Enter to continue...'));
        await new Promise(resolve => rl.question('', resolve));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Start the Application via the Menu
// ─────────────────────────────────────────────────────────────────────────────

handleMenuChoice();

export { automatedProcess };
