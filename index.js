const cron = require('node-cron');
const puppeteer = require('puppeteer');
const readline = require('readline');
const { google } = require('googleapis');
const fs = require('fs');

const dataFile = './coronaData.json';
const secret = fs.readFileSync(process.env.CLIENT_SECRET);

// If modifying these scopes, delete token.json.
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send'
];

// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = process.env.TOKEN_PATH;

cron.schedule('* * * * *', async () => {
  function sendMessage(auth) {
    var raw = makeBody(...Object.values(mail));
    const gmail = google.gmail({ version: 'v1', auth });
    gmail.users.messages.send({
      auth: auth,
      userId: 'me',
      resource: {
        raw: raw
      }
    }, function (err, response) {
      return (err || response)
    });
  }

  const coronaData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const mail = {
    to: process.env.TO,
    bcc: process.env.BCC,
    from: process.env.FROM,
    subject: '',
    content: ''
  }

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.goto('https://novascotia.ca/coronavirus/');

  await page.waitForSelector('#corona-data');

  const newData = await page.evaluate(() => {
    const tableData = document.querySelectorAll('#corona-data td');
    return {
      title: document.querySelector('#cases p').textContent,
      negative: tableData[0].textContent,
      positive: tableData[1].textContent,
    }
  });

  if (coronaData.title !== newData.title || coronaData.negative !== newData.negative || coronaData.positive !== newData.positive) {
    mail.subject = `+[${newData.positive}] ${newData.title}`;
    mail.content = JSON.stringify(newData, null, 2);

    fs.writeFileSync(dataFile, JSON.stringify(newData));

    //send mail
    authorize(JSON.parse(secret), sendMessage);
  }

  console.log(newData);

  browser.close();
});

function makeBody(to, bcc, from, subject, message) {
  var str = ["Content-Type: text/plain; charset=\"UTF-8\"\n",
    "MIME-Version: 1.0\n",
    "Content-Transfer-Encoding: 7bit\n",
    "to: ", to, "\n",
    "bcc: ", bcc, "\n",
    "from: ", from, "\n",
    "subject: ", subject, "\n\n",
    message
  ].join('');

  var encodedMail = Buffer.from(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
  return encodedMail;
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  try {
    const token = fs.readFileSync(TOKEN_PATH);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  } catch (error) {
    return getNewToken(oAuth2Client, callback);
  }
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      callback(oAuth2Client);
    });
  });
}