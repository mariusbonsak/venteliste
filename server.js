const express = require("express");
const http = require("http");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

/* SESSION – 24 TIMER */
app.use(session({
  secret: "venteliste-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(express.static("public"));

/* BUILD INFO */
const BUILD = {
  name: "Venteliste",
  version: "1.0.0",
  author: "Marius Bonsak",
  contact: "mariusbonsak@gmail.com",
  year: new Date().getFullYear()
};

app.get("/about", (req, res) => {
  res.json(BUILD);
});

/* DATA */
const DATA_PATH = path.join(__dirname, "data", "kunder.json");
const USERS_PATH = path.join(__dirname, "data", "users.json");

const load = p => fs.existsSync(p) ? JSON.parse(fs.readFileSync(p)) : [];
const save = (p, d) => fs.writeFileSync(p, JSON.stringify(d, null, 2));

let kunder = load(DATA_PATH);
let users = load(USERS_PATH);

/* LOGIN */
app.post("/login", (req, res) => {
  const { brukernavn, pin } = req.body;
  const user = users.find(u => u.brukernavn === brukernavn && u.pin === pin);
  if (!user) return res.status(401).end();

  req.session.verkstedId = user.verkstedId;
  res.json({ verkstedId: user.verkstedId });
});

app.get("/session", (req, res) => {
  if (req.session.verkstedId) {
    res.json({ verkstedId: req.session.verkstedId });
  } else {
    res.status(401).end();
  }
});

/* SOCKET */
io.on("connection", socket => {

  socket.on("join", verkstedId => {
    socket.join(verkstedId);
    socket.emit("oppdater",
      kunder.filter(k => k.verkstedId === verkstedId)
    );
  });

  socket.on("nyKunde", kunde => {
    kunder.push(kunde);
    save(DATA_PATH, kunder);
    io.to(kunde.verkstedId).emit("oppdater",
      kunder.filter(k => k.verkstedId === kunde.verkstedId)
    );
  });

  socket.on("fjernKunde", ({ id, verkstedId }) => {
    kunder = kunder.filter(k => k.id !== id);
    save(DATA_PATH, kunder);
    io.to(verkstedId).emit("oppdater",
      kunder.filter(k => k.verkstedId === verkstedId)
    );
  });

  socket.on("redigerTid", ({ id, verkstedId, klarTid }) => {
    const k = kunder.find(x => x.id === id);
    if (k) {
      k.klarTid = klarTid;
      save(DATA_PATH, kunder);
      io.to(verkstedId).emit("oppdater",
        kunder.filter(x => x.verkstedId === verkstedId)
      );
    }
  });
});

server.listen(3000, () => console.log("Venteliste kjører"));





