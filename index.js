import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import ora from 'ora';
import chalk from 'chalk';
import moment from 'moment-timezone';
import figlet from 'figlet';
import { createInterface } from 'readline/promises';
import { promises as fs } from 'fs';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36 OPR/119.0.0.0 (Edition cdf)',
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:116.0) Gecko/20100101 Firefox/116.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 Edg/115.0.1901.203',
];

const API_KEY = 'AIzaSyBDdwO2O_Ose7LICa-A78qKJUCEE3nAwsM';
const DOMAIN = 'bitquant.io';
const URI = 'https://bitquant.io';
const VERSION = '1';
const CHAIN_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const DAILY_CHAT_LIMIT = 20;

function getTimestamp() {
  return moment().tz('Asia/Jakarta').format('D/M/YYYY, HH:mm:ss');
}

function displayBanner() {
  const width = process.stdout.columns || 80;
  const banner = figlet.textSync('NT EXHAUST', { font: 'ANSI Shadow' });
  banner.split('\n').forEach(line => {
    console.log(chalk.cyanBright(line.padStart(line.length + Math.floor((width - line.length) / 2))));
  });
  console.log(chalk.cyanBright(' '.repeat((width - 50) / 2) + '=== Telegram Channel 🚀 : NT Exhaust ( @NTExhaust ) ==='));
  console.log(chalk.magentaBright(' '.repeat((width - 30) / 2) + '✪  BITQUANT AUTO BOT  ✪\n'));
}

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function promptUser(question) {
  const answer = await rl.question(chalk.white(question));
  return answer.trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function typeText(text, color, noType = false) {
  if (isSpinnerActive) await sleep(500);
  const maxLength = 80;
  const displayText = text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  if (noType) {
    console.log(color(` ┊ │ ${displayText}`));
    return;
  }
  console.log(color(' ┊ ┌── Response Chat API ──'));
  process.stdout.write(color(' ┊ │ '));
  for (const char of displayText) {
    process.stdout.write(char);
    await sleep(200 / displayText.length);
  }
  process.stdout.write('\n');
  console.log(color(' ┊ └──'));
}

function createProgressBar(current, total) {
  const barLength = 30;
  const filled = Math.round((current / total) * barLength);
  return `[${'█'.repeat(filled)}${' '.repeat(barLength - filled)} ${current}/${total}]`;
}

async function clearConsoleLine() {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
}

let isSpinnerActive = false;

async function withRetry(fn, maxRetries = 5, actionText = 'Operasi') {
  const spinner = ora({ text: chalk.cyan(` ┊ → ${actionText}...`), prefixText: '', spinner: 'bouncingBar', interval: 120 }).start();
  isSpinnerActive = true;
  let lastError = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fn();
      spinner.succeed(chalk.green(` ┊ ✓ ${actionText} Successfully`));
      await sleep(500);
      return result;
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        const errorMessage = err.response?.status === 403 ? 'Error 403 Forbidden' : err.message;
        spinner.text = chalk.cyan(` ┊ → ${actionText} [Retry ke-${i + 1}/${maxRetries} | ${errorMessage}]...`);
        await sleep(5000);
        continue;
      }
      spinner.fail(chalk.red(` ┊ ✗ Failed ${actionText.toLowerCase()}: ${err.response?.status || err.message}`));
      console.error(chalk.red(` ┊ │ Error details: ${JSON.stringify(err.response?.data || err.message)}`));
      await sleep(500);
      throw err;
    } finally {
      isSpinnerActive = false;
      await clearConsoleLine();
    }
  }
}

function generateMessage(address) {
  const nonce = Date.now();
  const issuedAt = new Date().toISOString();
  return `${DOMAIN} wants you to sign in with your **blockchain** account:\n${address}\n\nURI: ${URI}\nVersion: ${VERSION}\nChain ID: ${CHAIN_ID}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
}

function signMessage(message, secretKey) {
  const messageBytes = Buffer.from(message, 'utf8');
  const signature = nacl.sign.detached(messageBytes, secretKey);
  return bs58.encode(signature);
}

function getBaseHeaders(userAgent) {
  return {
    'accept': '*/*',
    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'cache-control': 'no-cache',
    'origin': 'https://www.bitquant.io',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'referer': 'https://www.bitquant.io/',
    'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Opera";v="119"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'cross-site',
    'user-agent': userAgent,
  };
}

async function verifySignature(address, message, signature, proxy, baseHeaders) {
  try {
    const payload = { address, message, signature };
    const config = {
      headers: { ...baseHeaders, 'Content-Type': 'application/json' },
    };
    if (proxy) {
      config.httpAgent = new HttpsProxyAgent(proxy);
      config.httpsAgent = new HttpsProxyAgent(proxy);
    }
    const response = await axios.post('https://quant-api.opengradient.ai/api/verify/solana', payload, config);
    return response.data.token;
  } catch (err) {
    throw err;
  }
}

async function getIdToken(token, proxy, baseHeaders) {
  try {
    const payload = { token, returnSecureToken: true };
    const config = {
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json',
        'x-client-data': 'CJz7ygE=',
        'x-client-version': 'Opera/JsCore/11.6.0/FirebaseCore-web',
        'x-firebase-gmpid': '1:976084784386:web:bb57c2b7c2642ce85b1e1b',
      },
    };
    if (proxy) {
      config.httpAgent = new HttpsProxyAgent(proxy);
      config.httpsAgent = new HttpsProxyAgent(proxy);
    }
    const response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, payload, config);
    return { idToken: response.data.idToken, refreshToken: response.data.refreshToken };
  } catch (err) {
    throw err;
  }
}

async function refreshAccessToken(refreshToken, proxy, baseHeaders) {
  try {
    const payload = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;
    const config = {
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-client-data': 'CJz7ygE=',
        'x-client-version': 'Opera/JsCore/11.6.0/FirebaseCore-web',
        'x-firebase-gmpid': '1:976084784386:web:bb57c2b7c2642ce85b1e1b',
      },
    };
    if (proxy) {
      config.httpAgent = new HttpsProxyAgent(proxy);
      config.httpsAgent = new HttpsProxyAgent(proxy);
    }
    const response = await axios.post(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, payload, config);
    return { accessToken: response.data.access_token, refreshToken: response.data.refresh_token };
  } catch (err) {
    throw err;
  }
}

async function sendChat(accessToken, context, message, proxy, baseHeaders) {
  try {
    const payload = { context, message: { type: 'user', message } };
    const config = {
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    };
    if (proxy) {
      config.httpAgent = new HttpsProxyAgent(proxy);
      config.httpsAgent = new HttpsProxyAgent(proxy);
    }
    const response = await axios.post('https://quant-api.opengradient.ai/api/agent/run', payload, config);
    return response.data.message;
  } catch (err) {
    throw err;
  }
}

async function getStats(accessToken, address, proxy, baseHeaders) {
  try {
    const config = {
      headers: {
        ...baseHeaders,
        'Authorization': `Bearer ${accessToken}`,
      },
    };
    if (proxy) {
      config.httpAgent = new HttpsProxyAgent(proxy);
      config.httpsAgent = new HttpsProxyAgent(proxy);
    }
    const response = await axios.get(`https://quant-api.opengradient.ai/api/activity/stats?address=${address}`, config);
    return response.data;
  } catch (err) {
    throw err;
  }
}

async function authenticate(address, secretKey, proxy, userAgent) {
  const baseHeaders = getBaseHeaders(userAgent);
  return withRetry(async () => {
    const message = generateMessage(address);
    const signature = signMessage(message, secretKey);
    const token = await verifySignature(address, message, signature, proxy, baseHeaders);
    const { idToken, refreshToken } = await getIdToken(token, proxy, baseHeaders);
    return { idToken, refreshToken, baseHeaders };
  }, 5, 'Login');
}

async function processAccounts(privateKeys, messages, accountProxies, chatCount, noType) {
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < privateKeys.length; i++) {
    const privateKey = privateKeys[i];
    const proxy = accountProxies[i];
    let keypair;
    try {
      keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    } catch (err) {
      console.log(chalk.red(`✗ Private key tidak valid untuk akun ${i + 1}`));
      failCount++;
      continue;
    }
    const address = keypair.publicKey.toBase58();
    const shortAddress = `${address.slice(0, 8)}...${address.slice(-6)}`;

    console.log(chalk.blue(`═════[ Akun ${i + 1}/${privateKeys.length} | ${shortAddress} @ ${getTimestamp()} ]═════`));
    console.log(chalk.cyan(` ┊ ${proxy ? `Menggunakan proxy: ${proxy}` : 'Tidak menggunakan proxy'}`));

    let userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    let sessionState = {
      idToken: null,
      refreshToken: null,
      baseHeaders: null,
      history: [],
      retry403Count: 0,
    };
    const max403Retries = 3;

    async function resetSession() {
      userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const authResult = await authenticate(address, keypair.secretKey, proxy, userAgent);
      sessionState.idToken = authResult.idToken;
      sessionState.refreshToken = authResult.refreshToken;
      sessionState.baseHeaders = authResult.baseHeaders;
      sessionState.history = [];
      sessionState.retry403Count = 0;
    }

    try {
      await resetSession();
      console.log(chalk.magentaBright(' ┊ ┌── Proses Chat ──'));
      let consecutive403Failures = 0;
      const maxConsecutive403Failures = 3;

      for (let j = 0; j < chatCount; j++) {
        console.log(chalk.yellow(` ┊ ├─ Chat ${createProgressBar(j + 1, chatCount)} ──`));
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        console.log(chalk.white(` ┊ │ Message: ${chalk.yellow(randomMessage)}`));

        let accessToken;
        try {
          const refreshResult = await withRetry(
            () => refreshAccessToken(sessionState.refreshToken, proxy, sessionState.baseHeaders),
            5,
            'Token Refreshed'
          );
          accessToken = refreshResult.accessToken;
          sessionState.refreshToken = refreshResult.refreshToken;
          sessionState.retry403Count = 0;
        } catch (err) {
          console.log(chalk.red(` ┊ │ Gagal refresh token untuk chat ${j + 1}: ${err.message}`));
          console.log(chalk.cyan(` ┊ │ Mencoba inisialisasi ulang sesi...`));
          await resetSession();
          accessToken = sessionState.idToken;
          continue;
        }

        const stats = await withRetry(
          () => getStats(accessToken, address, proxy, sessionState.baseHeaders),
          5,
          'Getting Chat Statistic'
        );
        if (stats.daily_message_count >= stats.daily_message_limit) {
          console.log(chalk.red(` ┊ │ Batas chat harian tercapai: ${stats.daily_message_count}/${stats.daily_message_limit}`));
          break;
        }

        const context = {
          conversationHistory: sessionState.history,
          address,
          poolPositions: [],
          availablePools: [],
        };

        let chatSuccess = false;
        for (let attempt = 0; attempt <= sessionState.retry403Count; attempt++) {
          try {
            const response = await withRetry(
              () => sendChat(accessToken, context, randomMessage, proxy, sessionState.baseHeaders),
              5,
              'Sending Message'
            );
            await typeText(response, chalk.magenta, noType);
            sessionState.history.push({ type: 'user', message: randomMessage });
            sessionState.history.push({ type: 'assistant', message: response });

            const updatedStats = await withRetry(
              () => getStats(accessToken, address, proxy, sessionState.baseHeaders),
              5,
              'Getting Chat Statistic'
            );
            console.log(chalk.cyan(` ┊ │ 📋 Chat Daily Usage: ${updatedStats.daily_message_count}/${updatedStats.daily_message_limit}`));
            sessionState.retry403Count = 0;
            consecutive403Failures = 0;
            chatSuccess = true;
            break;
          } catch (err) {
            if (err.response && err.response.status === 403 && sessionState.retry403Count < max403Retries) {
              sessionState.retry403Count++;
              console.log(chalk.cyan(` ┊ │ Mencoba inisialisasi ulang sesi karena error 403 (percobaan ${sessionState.retry403Count}/${max403Retries})...`));
              await sleep(15000);
              await resetSession();
              accessToken = sessionState.idToken;
              consecutive403Failures++;
              if (consecutive403Failures >= maxConsecutive403Failures) {
                console.log(chalk.red(` ┊ │ Terlalu banyak kegagalan 403 berturut-turut. Menghentikan proses untuk akun ini.`));
                throw new Error('Terlalu banyak kegagalan 403 berturut-turut');
              }
            } else {
              console.log(chalk.red(` ┊ │ Gagal chat ${j + 1}: ${err.message}`));
              throw err;
            }
          }
        }

        if (!chatSuccess && sessionState.retry403Count >= max403Retries) {
          console.log(chalk.red(` ┊ │ Batas maksimum percobaan login ulang tercapai untuk chat ${j + 1}`));
          break;
        }

        console.log(chalk.yellow(' ┊ └──'));
        await sleep(8000);
      }
      console.log(chalk.yellow(' ┊ └──'));

      console.log(chalk.magentaBright(' ┊ ┌── Statistik Akun ──'));
      try {
        const { accessToken } = await withRetry(
          () => refreshAccessToken(sessionState.refreshToken, proxy, sessionState.baseHeaders),
          5,
          'Token Refreshed'
        );
        const stats = await withRetry(
          () => getStats(accessToken, address, proxy, sessionState.baseHeaders),
          5,
          'Getting User Statistic'
        );
        console.log(chalk.white(` ┊ │ Address: ${shortAddress}`));
        console.log(chalk.white(` ┊ │ Chat Daily Usage: ${stats.daily_message_count}`));
        console.log(chalk.white(` ┊ │ Chat Counted: ${stats.message_count}`));
        console.log(chalk.white(` ┊ │ Total Points: ${stats.points}`));
        console.log(chalk.yellow(' ┊ └──'));
        successCount++;
      } catch (err) {
        console.log(chalk.red(` ┊ │ Failed getting user statistic: ${err.message}`));
        failCount++;
      }
    } catch (err) {
      console.log(chalk.red(` ┊ ✗ Error processing account ${i + 1}: ${err.message}`));
      failCount++;
    }
    console.log(chalk.gray(' ┊ ══════════════════════════════════════'));
  }

  console.log(chalk.blue(`═════[ Selesai @ ${getTimestamp()} ]═════`));
  console.log(chalk.gray(` ┊ ✅ ${successCount} Account Success, ❌ ${failCount} Account Failed`));
  return { successCount, failCount };
}

function startCountdown(nextRunTime) {
  return new Promise(resolve => {
    const countdownInterval = setInterval(() => {
      const now = moment();
      const timeLeft = moment.duration(nextRunTime.diff(now));
      if (timeLeft.asSeconds() <= 0) {
        clearInterval(countdownInterval);
        clearConsoleLine();
        resolve();
        return;
      }
      clearConsoleLine();
      const hours = Math.floor(timeLeft.asHours()).toString().padStart(2, '0');
      const minutes = Math.floor(timeLeft.asMinutes() % 60).toString().padStart(2, '0');
      const seconds = Math.floor(timeLeft.asSeconds() % 60).toString().padStart(2, '0');
      process.stdout.write(chalk.cyan(` ┊ ⏳ Waiting To Next Loop: ${hours}:${minutes}:${seconds}\r`));
    }, 1000);
  });
}

let isProcessing = false;

async function scheduleNextRun(privateKeys, messages, accountProxies, chatCount, noType) {
  while (true) {
    if (isProcessing) {
      await sleep(1000);
      continue;
    }
    isProcessing = true;
    try {
      const nextRunTime = moment().add(24, 'hours');
      console.log(chalk.green(` ┊ ⏰ All Process Completed Successfully `));
      await startCountdown(nextRunTime);
      console.log(chalk.cyan(` ┊ ⏰ Starting New Session @ ${getTimestamp()}...`));
      await processAccounts(privateKeys, messages, accountProxies, chatCount, noType);
    } catch (err) {
      console.log(chalk.red(` ✗ Error: ${err.message}`));
      await sleep(5000);
    } finally {
      isProcessing = false;
    }
  }
}

async function main() {
  displayBanner();
  const noType = process.argv.includes('--no-type');
  let privateKeys;
  try {
    const data = await fs.readFile('pk.txt', 'utf8');
    privateKeys = data.split('\n').filter(line => line.trim() !== '');
  } catch (err) {
    console.log(chalk.red('✗ File pk.txt Not Found! or Wrong Format'));
    rl.close();
    return;
  }
  if (privateKeys.length === 0) {
    console.log(chalk.red('✗ No Valid Private Key on pk.txt!'));
    rl.close();
    return;
  }

  let messages;
  try {
    const data = await fs.readFile('pesan.txt', 'utf8');
    messages = data.split('\n').filter(line => line.trim() !== '').map(line => line.replace(/\r/g, ''));
  } catch (err) {
    console.log(chalk.red('✗ File pesan.txt tidak ditemukan atau kosong!'));
    rl.close();
    return;
  }
  if (messages.length === 0) {
    console.log(chalk.red('✗ File pesan.txt kosong!'));
    rl.close();
    return;
  }

  let chatCount;
  while (true) {
    const input = await promptUser('How Many Chat For Each Account: ');
    chatCount = parseInt(input, 10);
    if (!isNaN(chatCount) && chatCount > 0) {
      if (chatCount > DAILY_CHAT_LIMIT) {
        console.log(chalk.red(`✗ Chat count tidak boleh melebihi batas harian (${DAILY_CHAT_LIMIT})!`));
        chatCount = DAILY_CHAT_LIMIT;
        console.log(chalk.cyan(` ┊ Mengatur chat count ke ${chatCount}`));
      }
      break;
    }
    console.log(chalk.red('✗ Masukkan angka yang valid!'));
  }

  let useProxy;
  while (true) {
    const input = await promptUser('Do You Want To Use Proxy? (y/n) ');
    if (input.toLowerCase() === 'y' || input.toLowerCase() === 'n') {
      useProxy = input.toLowerCase() === 'y';
      break;
    }
    console.log(chalk.red('✗ Masukkan "y" atau "n"!'));
  }

  let proxies = [];
  if (useProxy) {
    try {
      const data = await fs.readFile('proxy.txt', 'utf8');
      proxies = data.split('\n').filter(line => line.trim() !== '');
      if (proxies.length === 0) {
        console.log(chalk.yellow('✗ File proxy.txt kosong. Lanjut tanpa proxy.'));
      }
    } catch (err) {
      console.log(chalk.yellow('✗ File proxy.txt tidak ditemukan. Lanjut tanpa proxy.'));
    }
  }

  const accountProxies = privateKeys.map((_, index) => proxies.length > 0 ? proxies[index % proxies.length] : null);

  console.log(chalk.cyan(` ┊ ⏰ Memulai proses untuk ${privateKeys.length} akun...`));
  await processAccounts(privateKeys, messages, accountProxies, chatCount, noType);
  scheduleNextRun(privateKeys, messages, accountProxies, chatCount, noType);
  rl.close();
}

main();