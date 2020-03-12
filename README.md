# cov-alert
Monitor Nova Scotia COVID-19 testing data and send email notification if data changed.

## Enable Gmail API from:
https://developers.google.com/gmail/api/quickstart/nodejs

## Download CLIENT CONFIGURATION and save it for `CLIENT_SECRET`

## ```npm install```

## Get access token:
```TO=my@gmail.com TOKEN_PATH=./my_token.json node renew```

## Run:
```TO=my@gmail.com BCC=another@gmail.com FROM=my@gmail.com CLIENT_SECRET=./my_secret_key.json TOKEN_PATH=./my_token.json node index```
