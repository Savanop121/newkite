import axios from 'axios';
import fs from 'fs';
import chalk from 'chalk';
import { faker } from '@faker-js/faker';

const agents = {
  "deployment_p5J9lz1Zxe7CYEoo0TZpRVay": "Professor",
  "deployment_7sZJSiCqCNDy9bBHTEh7dwd9": "Crypto Buddy",
  "deployment_SoFftlsf9z4fyA3QCHYkaANq": "Sherlock"
};

const apiKey = 'your_groq_apikeys';
const headersFilePath = 'headers.json';

const ASCII_ART = `
 _______                          
|     __|.--.--.---.-.-----.---.-.
|__     ||  |  |  _  |-- __|  _  |
|_______||___  |___._|_____|___._|
         |_____|
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

async function generateRandomQuestion() {
  const theme = getRandomTheme();
  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'user', content: `Generate a unique and natural-sounding question that is related to AI in blockchain and incorporates '${theme}' at the beginning, middle, or end naturally.` }
      ],
      temperature: 0.9
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error(chalk.red('Error generating question:'), error.response ? error.response.data : error.message);
    return `What is the impact of ${theme} on blockchain technology?`;
  }
}

async function sendRandomQuestion(agent, headers) {
  try {
    const randomQuestion = await generateRandomQuestion();
    const payload = { message: randomQuestion, stream: false };
    const response = await axios.post(`https://${agent.toLowerCase().replace('_','-')}.stag-vxzy.zettablock.com/main`, payload, {
      headers: { 
        'Content-Type': 'application/json',
        ...headers
      }
    });
    return { question: randomQuestion, response: response.data.choices[0].message };
  } catch (error) {
    console.error(chalk.red('Error:'), error.response ? error.response.data : error.message);
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
      
      if (nanya && nanya.response && nanya.response.content) {
        const truncatedResponse = nanya.response.content.split(' ').slice(0, 7).join(' ') + '...';
        console.log(chalk.cyan('Question:'), chalk.bold(nanya.question));
        console.log(chalk.green('Answer:'), chalk.italic(truncatedResponse));

        await reportUsage(wallet.toLowerCase(), {
          agent_id: agentId,
          question: nanya.question,
          response: nanya.response.content
        });
      } else {
        console.log(chalk.red('Unable to send question, error occurred.'));
      }
      
      await sleep(1000);
    }

    console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  }
}

async function main() {
  await displayAppTitle();

  const wallets = fs.readFileSync('wallet.txt', 'utf-8').split('\n').filter(Boolean);
  const headers = loadHeaders();
  const iterationsPerAgent = 10;

  for (const wallet of wallets) {
    if (!headers[wallet]) {
      headers[wallet] = { 'User-Agent': generateRandomDesktopHeader() };
      saveHeaders(headers);
    }

    await processWallet(wallet, headers, iterationsPerAgent);
  }

  const randomTime = Math.floor(Math.random() * (7 * 3600 - 3 * 3600 + 1)) + 3 * 3600;
  await countdown(randomTime);
}

main();
