const cron = require('node-cron');
const request = require('request');
const readline = require('readline');
const { google } = require('googleapis');
const fs = require('fs');

const dataFile = './savedData.json';
const caDataFile = '../covpy/caData.txt';
const secret = fs.readFileSync(process.env.CLIENT_SECRET);
const sourceCa = 'https://www.canada.ca/en/public-health/services/diseases/2019-novel-coronavirus-infection.html';
const sourceNs = 'https://novascotia.ca/coronavirus/data/';
const sourceNsData = 'https://novascotia.ca/coronavirus/data/COVID-19-data.csv';

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

  const mail = {
    to: process.env.TO,
    bcc: process.env.BCC,
    from: process.env.FROM,
    subject: '',
    content: ''
  }

  request({ url: sourceNsData, strictSSL: false }, (error, response, body) => {
    const rows = body.split('\n');
    const lastRow = rows[rows.length - 1].split(',');
    const lastDate = lastRow[0];
    const thisDate = new Date().toLocaleString("en-CA", { timeZone: "America/Halifax" }).split(',')[0];

    if (lastDate === thisDate) {
      let total = 0;

      rows.forEach(row => {
        const columns = row.split(',');
        const newCases = columns[1];

        if (!isNaN(newCases)) total += parseInt(newCases);
      });

      const newData = {
        title: lastDate,
        positive: total.toString(),
        negative: lastRow[2]
      };

      const savedData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

      if (
        savedData.title !== newData.title ||
        savedData.positive !== newData.positive ||
        savedData.negative !== newData.negative
      ) {
        const caData = fs.readFileSync(caDataFile, 'utf8');
        const nsData =
          `Novel coronavirus (COVID-19) cases in Nova Scotia<br><br>
        Positive: <b>${newData.positive}</b><br>
        Negative: ${newData.negative}
        <br><br>*Source: ${sourceNs}<br><br>`;
        mail.subject = `+[${newData.positive}] Cronavirus cases in Nova Scotia - ${newData.title}`;
        mail.content = `${nsData} ${caData} <br>*Source: ${sourceCa}`;

        fs.writeFileSync(dataFile, JSON.stringify(newData));

        //send mail
        authorize(JSON.parse(secret), sendMessage);
      }
    }
  });

});

function makeBody(to, bcc, from, subject, message) {
  var str = ["Content-Type: text/html; charset=\"UTF-8\"\n",
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