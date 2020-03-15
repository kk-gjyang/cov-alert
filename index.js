const cron = require('node-cron');
const request = require('request');
const HTMLParser = require('node-html-parser');
const readline = require('readline');
const { google } = require('googleapis');
const fs = require('fs');

const dataFile = './savedData.json';
const caDataFile = '../covpy/caData.txt';
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

  const savedData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const mail = {
    to: process.env.TO,
    bcc: process.env.BCC,
    from: process.env.FROM,
    subject: '',
    content: ''
  }

  request({ url: 'https://novascotia.ca/coronavirus/', strictSSL: false }, (error, response, body) => {
    const content = HTMLParser.parse(body);
    const tableData = content.querySelectorAll('#corona-data td');
    const newData = {
      title: content.querySelector('#cases p').text,
      confirmed_positive: tableData[0].text,
      presumptive_positive: tableData[1].text,
      negative: tableData[2].text,
    }

    if (
        savedData.title !== newData.title ||
        savedData.confirmed_positive !== newData.confirmed_positive ||
        savedData.presumptive_positive !== newData.presumptive_positive ||
        savedData.negative !== newData.negative
      ) {
      const caData = fs.readFileSync(caDataFile, 'utf8');
      const nsData =
        `${newData.title}<br><br>
        Confirmed Positive: <b>${newData.confirmed_positive}</b><br>
        Presumptive Positive: ${newData.presumptive_positive}<br>
        Negative: ${newData.negative}
        <br><br>*Source: https://novascotia.ca/coronavirus/<br><br>`;
      mail.subject = `+[${newData.confirmed_positive}] ${newData.title}`;
      mail.content = `${nsData} ${caData} <br><br>*Source: https://www.canada.ca/en/public-health/services/diseases/coronavirus-disease-covid-19.html`;

      fs.writeFileSync(dataFile, JSON.stringify(newData));

      //send mail
      authorize(JSON.parse(secret), sendMessage);
    }

    console.log(newData);
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