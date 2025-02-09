import axios from 'axios';
import fs from 'fs';
import chalk from 'chalk';
import { faker } from '@faker-js/faker';
import readline from 'readline';
import { main } from './main.js';

const agents = {
  "deployment_p5J9lz1Zxe7CYEoo0TZpRVay": "Professor",
  "deployment_7sZJSiCqCNDy9bBHTEh7dwd9": "Crypto Buddy"
};

const apiKey = 'your_groq_apikeys';
const headersFilePath = 'headers.json';
let rateLimitExceeded = false;

const ASCII_ART = `

`;

async function displayAppTitle() {
  const gradient = await import('gradient-string');
  console.log(gradient.default.rainbow(ASCII_ART));
  console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
}

function loadHeaders() {
  if (fs.existsSync(headersFilePath)) {
    const headersData = fs.readFileSync(headersFilePath, 'utf-8');
    return JSON.parse(headersData);
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
      "AI", "blockchain", "smart contracts", "scalability", "security", "privacy", "decentralization", "automation", "trust", "efficiency"
    ],
    verbs: [
      "improve", "affect", "contribute", "enhance", "drive", "change", "transform", "reduce", "optimize", "strengthen"
    ],
    objects: [
      "technology", "systems", "applications", "networks", "protocols", "platforms", "transactions", "processes", "infrastructure", "economy"
    ],
    questions: [
      "How", "What", "Can", "Why", "Does", "What is the impact of", "How does", "What effect does", "Can", "How can"
    ],
    modifiers: [
      "the future of", "the efficiency of", "the security of", "the scalability of", "the integration of", "the development of", "the adoption of"
    ]
  };

  const subject = words.subjects[Math.floor(Math.random() * words.subjects.length)];
  const verb = words.verbs[Math.floor(Math.random() * words.verbs.length)];
  const object = words.objects[Math.floor(Math.random() * words.objects.length)];
  const question = words.questions[Math.floor(Math.random() * words.questions.length)];
  const modifier = words.modifiers[Math.floor(Math.random() * words.modifiers.length)];

  return {
    subject,
    verb,
    object,
    question,
    modifier
  };
}

function generateHardcodedQuestion(theme) {
  const { subject, verb, object, question, modifier } = generateRandomWords();

  // Construct a random yet structured question
  const questionString = `${question} ${subject} ${verb} ${modifier} ${object}?`;
  return questionString;
}

async function generateRandomQuestion() {
  const theme = getRandomTheme();
  
  // Jika rate limit terlewati, fallback ke pertanyaan hardcoded
  if (rateLimitExceeded) {
    return generateHardcodedQuestion(theme);
  }
  
  try {
    // Perbarui prompt untuk mendapatkan variasi pertanyaan yang lebih banyak dan lebih singkat
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { 
          role: 'user', 
          content: `Generate a short, diverse, and random question related to '${theme}' in the context of AI and blockchain. Avoid repetitive phrasing such as 'What impact'. Use different structures like 'What is', 'Can', 'How does', 'Why does', 'Does', and others. Keep it concise and avoid long sentences.`
        }
      ],
      temperature: 0.9
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Kembalikan pertanyaan yang dihasilkan
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    // Menangani error jika terjadi rate limit atau lainnya
    if (error.response && error.response.data && error.response.data.code === 'rate_limit_exceeded') {
      rateLimitExceeded = true;
      console.error(chalk.red('Rate limit exceeded. Switching to hardcoded questions.'));
      return generateHardcodedQuestion(theme);
    } else {
      console.error(chalk.red('Error generating question:'), error.response ? error.response.data : error.message);
      return generateHardcodedQuestion(theme);
    }
  }
}

async function sendRandomQuestion(agent, headers) {
  const randomQuestion = await generateRandomQuestion();
  if (rateLimitExceeded) {
    return { question: randomQuestion, response: { content: '' } };
  }
  try {
    const payload = { message: randomQuestion, stream: false };
    const response = await axios.post(`https://${agent.toLowerCase().replace('_','-')}.stag-vxzy.zettablock.com/main`, payload, {
      headers: { 
        'Content-Type': 'application/json',
        ...headers
      }
    });
    return { question: randomQuestion, response: response.data.choices[0].message };
  } catch (error) {
    console.error(chalk.red('Error sending question:'), error.response ? error.response.data : error.message);
    return { question: randomQuestion, response: { content: '' } };
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

    await axios.post(`https://quests-usage-dev.prod.zettablock.com/api/report_usage`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(chalk.green('Usage data reported successfully!\n'));
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error && error.response.data.error.includes('Rate limit exceeded')) {
      console.error(chalk.red('Rate limit exceeded. Skipping this usage report.'));
    } else {
      console.error(chalk.red('Failed to report usage:'), error.response ? error.response.data : error.message);
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

async function processWallet(wallet, headers, iterationsPerAgent) {
  console.log(chalk.blue(`\nWallet: ${wallet}`));
  for (const [agentId, agentName] of Object.entries(agents)) {
    console.log(chalk.magenta(`\nAgent: ${agentName}`));
    console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    for (let i = 0; i < iterationsPerAgent; i++) {
      console.log(chalk.yellow(`Literacy-${i + 1}`));
      const nanya = await sendRandomQuestion(agentId, headers[wallet]);
      if (!nanya || !nanya.response || !nanya.response.content) {
        if (!rateLimitExceeded) {
          rateLimitExceeded = true;
        }
        console.log(chalk.red('Unable to send question, error occurred.'));
        continue; // Skip the rest of the loop and move to the next iteration
      }

      const truncatedResponse = nanya.response.content.split(' ').slice(0, 7).join(' ') + '...';
      console.log(chalk.cyan('Question:'), chalk.bold(nanya.question));
      console.log(chalk.green('Answer:'), chalk.italic(truncatedResponse));

      await reportUsage(wallet.toLowerCase(), {
        agent_id: agentId,
        question: nanya.question,
        response: nanya.response.content
      });

      await sleep(1000);
    }

    console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  }
}

async function main() {
  await displayAppTitle();

  const wallets = fs.readFileSync('wallet.txt', 'utf-8').split('\n').filter(Boolean);
  const headers = loadHeaders();
  const iterationsPerAgent = 7; // Update to only one iteration per agent

  for (const wallet of wallets) {
    if (!headers[wallet]) {
      headers[wallet] = { 'User-Agent': generateRandomDesktopHeader() };
      saveHeaders(headers);
    }

    try {
      await processWallet(wallet, headers, iterationsPerAgent);
    } catch (error) {
      console.error(chalk.red(`Failed to process wallet ${wallet}:`), error.message);
    }
  }

  const randomTime = Math.floor(Math.random() * (7 * 3600 - 3 * 3600 + 1)) + 3 * 3600;
  await countdown(randomTime);

  // Reset rateLimitExceeded for the next iteration
  rateLimitExceeded = false;
  await main(); // Start the process again
}

const BANNER = `
███████  █████  ██    ██  █████  ███    ██ 
██      ██   ██ ██    ██ ██   ██ ████   ██ 
███████ ███████ ██    ██ ███████ ██ ██  ██ 
     ██ ██   ██  ██  ██  ██   ██ ██  ██ ██ 
███████ ██   ██   ████   ██   ██ ██   ████
`;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function showMenu() {
    console.clear();
    console.log(chalk.cyan(BANNER));
    console.log(chalk.yellow('\nMenu Options:'));
    console.log('1. TYPE TO ADD WALLET');
    console.log('2. APP API KEY');
    console.log('3. RESET WALLETS');
    console.log('4. DELETE API KEY');
    console.log('5. START INTERACTION');
    console.log('6. EXIT');
}

async function handleMenuChoice() {
    while (true) {
        await showMenu();
        const choice = await new Promise(resolve => rl.question('\nEnter your choice (1-6): ', resolve));

        switch (choice) {
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
                return;
            default:
                console.log(chalk.red('Invalid choice. Press Enter to continue...'));
                await new Promise(resolve => rl.question('', resolve));
        }
    }
}

async function addWallet() {
    const wallet = await new Promise(resolve => rl.question('Enter wallet address: ', resolve));
    fs.appendFileSync('wallet.txt', wallet + '\n');
    console.log(chalk.green('Wallet added successfully!'));
    await new Promise(resolve => rl.question('Press Enter to continue...', resolve));
}

async function setApiKey() {
    const apiKey = await new Promise(resolve => rl.question('Enter API Key: ', resolve));
    let content = fs.readFileSync('main.js', 'utf8');
    content = content.replace(/const apiKey = .*?;/, `const apiKey = '${apiKey}';`);
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
    await main();
}

// Start the menu
handleMenuChoice();

export { main };
