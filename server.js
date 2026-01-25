const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const session = require("express-session");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const KUNDER_FILE = path.join(DATA_DIR, "kunder.json");

/* --------- SIKRER AT FILER FINNES --------- */
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([
    { brukernavn: "admin", pin: "1234", verkstedId: "verksted1" }
  ], null, 2));
}

if (!fs.existsSync(KUNDER_FILE)) {
  fs.writeFileSync(KUNDER_FILE, JSON.stringify([], null, 2));
}

/* --------- MIDDLEWARE --------- */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "verkstedflow-secret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "public")));

/* --------- LOGIN --------- */
app.post("/login", (req, res) => {
  const { brukernavn, pin } = req.body;
  const users = JSON.parse(fs.readFileSync(USERS_FILE));

  const userIndex = users.findIndex(
    u => u.brukernavn === brukernavn && u.pin === pin
  );

  if (userIndex === -1) {
    return res.status(401).json({ error: "Feil brukernavn eller PIN" });
  }

  const user = users[userIndex];
  const now = Date.now();

  if (user.lastLogin && now - user.lastLogin < 24 * 60 * 60 * 1000) {
    return res.status(403).json({
      error: "Du kan kun logge inn én gang per 24 timer"
    });
  }

  users[userIndex].lastLogin = now;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

  req.session.user = user;
  res.json({ verkstedId: user.verkstedId });
});


/* --------- SOCKET.IO --------- */
io.on("connection", socket => {

  socket.on("join", verkstedId => {
    socket.join(verkstedId);
    const kunder = JSON.parse(fs.readFileSync(KUNDER_FILE))
      .filter(k => k.verkstedId === verkstedId);
    socket.emit("oppdater", kunder);
  });

  socket.on("nyKunde", kunde => {
    const kunder = JSON.parse(fs.readFileSync(KUNDER_FILE));
    kunder.push(kunde);
    fs.writeFileSync(KUNDER_FILE, JSON.stringify(kunder, null, 2));

    io.to(kunde.verkstedId).emit("oppdater",
      kunder.filter(k => k.verkstedId === kunde.verkstedId)
    );
  });

  socket.on("fjernKunde", ({ id, verkstedId }) => {
    let kunder = JSON.parse(fs.readFileSync(KUNDER_FILE));
    kunder = kunder.filter(k => k.id !== id);
    fs.writeFileSync(KUNDER_FILE, JSON.stringify(kunder, null, 2));

    io.to(verkstedId).emit("oppdater",
      kunder.filter(k => k.verkstedId === verkstedId)
    );
  });
});

/* --------- START --------- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server kjører på port", PORT);
});



