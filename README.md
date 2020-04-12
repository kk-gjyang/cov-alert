# cov-alert
Monitor Nova Scotia COVID-19 testing data and send email notification if data changed.

*Data source: https://novascotia.ca/coronavirus/data/

## Enable Gmail API from:
https://developers.google.com/gmail/api/quickstart/nodejs

## Download CLIENT CONFIGURATION and save it for `CLIENT_SECRET`

## Install dependencies
```npm install```

## Get access token:
```TO=my@gmail.com TOKEN_PATH=./my_token.json node renew```

## Run:
```TO=my@gmail.com BCC=another@gmail.com FROM=my@gmail.com CLIENT_SECRET=./my_secret_key.json TOKEN_PATH=./my_token.json node index```


*I have another repo to get the data table for Canada and save to a file "caData.txt" which used in this script - add the table to the bottom of mail for reference: https://github.com/kk-gjyang/cov-ca-table.
