require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { Pool } = require("pg");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

const key = Buffer.from(process.env.ENCRYPTION_KEY);
const iv = Buffer.alloc(16, 0);

function encrypt(text) {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  return cipher.update(text, "utf8", "hex") + cipher.final("hex");
}

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.sendStatus(403);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

app.get("/", (req, res) => {
  res.send(`
    <h2>Pago con tarjeta</h2>
    <input id="email" placeholder="email"/><br/>
    <input id="password" placeholder="password"/><br/>
    <button onclick="register()">Register</button>
    <button onclick="login()">Login</button>

    <h3>Pago</h3>
    <input id="card" placeholder="card"/><br/>
    <input id="cvv" placeholder="cvv"/><br/>
    <input id="amount" placeholder="amount"/><br/>
    <button onclick="pay()">Pagar</button>

    <script>
      let token = "";

      async function register() {
        await fetch('/register', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            email: email.value,
            password: password.value
          })
        });
        alert("Registrado");
      }

      async function login() {
        const res = await fetch('/login', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            email: email.value,
            password: password.value
          })
        });
        const data = await res.json();
        token = data.token;
        alert("Login OK");
      }

      async function pay() {
        await fetch('/payments', {
          method:'POST',
          headers:{
            'Content-Type':'application/json',
            'Authorization': token
          },
          body: JSON.stringify({
            cardNumber: card.value,
            cvv: cvv.value,
            amount: amount.value
          })
        });
        alert("Pago realizado");
      }
    </script>
  `);
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);

  await db.query(
    "INSERT INTO users(email,password) VALUES($1,$2)",
    [email, hash]
  );

  res.send("ok");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await db.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send("error");
  }

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

  res.json({ token });
});

app.post("/payments", auth, async (req, res) => {
  const { cardNumber, cvv, amount } = req.body;

  await db.query(
    "INSERT INTO transactions(amount, card_number, cvv, user_id) VALUES($1,$2,$3,$4)",
    [
      amount,
      encrypt(cardNumber),
      encrypt(cvv),
      req.user.id
    ]
  );

  res.send("Pago OK");
});

app.get("/transactions", auth, async (req, res) => {
  const result = await db.query(
    "SELECT * FROM transactions WHERE user_id=$1",
    [req.user.id]
  );

  res.json(result.rows);
});

app.listen(3000, () => console.log("Running on http://localhost:3000"));
