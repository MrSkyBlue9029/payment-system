# Payment App

## Run
npm install
node app.js

## DB Tables

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  amount NUMERIC,
  card_number TEXT,
  cvv TEXT,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
