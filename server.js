const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const session = require("express-session");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const USERS_FILE = "./data/users.json";
const KUNDER_FILE = "./data/kunder.json";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "verkstedflow-secret",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static("public"));

function lesUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function lesKunder() {
  if (!fs.existsSync(KUNDER_FILE)) return [];
  return JSON.parse(fs.readFileSync(KUNDER_FILE));
}

function lagreKunder(data) {
  fs.writeFileSync(KUNDER_FILE, JSON.stringify(data, null, 2));
}

/* ---------- LOGIN ---------- */
app.post("/login", (req, res) => {
  const { brukernavn, pin } = req.body;
  const users = lesUsers();

  const user = users.find(
    u => u.brukernavn === brukernavn && u.pin === pin
  );

  if (!user) {
    return res.status(401).json({ error: "Feil login" });
  }

  req.session.user = user;
  res.json({ ok: true });
});

/* ---------- SOCKET ---------- */
io.on("connection", socket => {

  socket.on("join", verkstedId => {
    socket.join(verkstedId);
    const kunder = lesKunder().filter(k => k.verkstedId === verkstedId);
    socket.emit("oppdater", kunder);
  });

  socket.on("nyKunde", data => {
    const kunder = lesKunder();
    kunder.push(data);
    lagreKunder(kunder);
    io.to(data.verkstedId).emit(
      "oppdater",
      kunder.filter(k => k.verkstedId === data.verkstedId)
    );
  });

  socket.on("oppdaterStatus", ({ id, status, verkstedId }) => {
    const kunder = lesKunder();
    const kunde = kunder.find(k => k.id === id);
    if (kunde) kunde.status = status;
    lagreKunder(kunder);

    io.to(verkstedId).emit(
      "oppdater",
      kunder.filter(k => k.verkstedId === verkstedId)
    );
  });

  socket.on("fjernKunde", ({ id, verkstedId }) => {
    let kunder = lesKunder();
    kunder = kunder.filter(k => k.id !== id);
    lagreKunder(kunder);

    io.to(verkstedId).emit(
      "oppdater",
      kunder.filter(k => k.verkstedId === verkstedId)
    );
  });
});

server.listen(3000, () => {
  console.log("Server kjører på port 3000");
});
;
});




