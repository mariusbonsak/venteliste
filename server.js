const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = require("socket.io")(server);

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "kunder.json");

app.use(express.json());
app.use(express.static(__dirname));

/* -----------------------------
   LAST / LAGRE KUNDER
----------------------------- */
let kunder = [];

function lastKunder() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      kunder = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch (err) {
      console.error("Feil ved lesing av kunder.json", err);
      kunder = [];
    }
  }
}

function lagreKunder() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(kunder, null, 2));
}

lastKunder();

/* -----------------------------
   SOCKET.IO
----------------------------- */
io.on("connection", socket => {
  socket.emit("oppdater", kunder);

  socket.on("nyKunde", kunde => {
    kunder.push(kunde);
    lagreKunder();
    io.emit("oppdater", kunder);
  });

  socket.on("oppdaterStatus", ({ id, status }) => {
    const k = kunder.find(k => k.id === id);
    if (k) {
      k.status = status;
      lagreKunder();
      io.emit("oppdater", kunder);
    }
  });

  socket.on("fjernKunde", id => {
    kunder = kunder.filter(k => k.id !== id);
    lagreKunder();
    io.emit("oppdater", kunder);
  });
});

/* -----------------------------
   MEKANIKER-STEMPLING
----------------------------- */
app.post("/jobbstatus", (req, res) => {
  const { ordre, status } = req.body;

  const kunde = kunder.find(k => k.ordre === ordre);
  if (kunde) {
    kunde.status = status;
    lagreKunder();
    io.emit("oppdater", kunder);
  }

  res.sendStatus(200);
});

/* -----------------------------
   START SERVER
----------------------------- */
server.listen(PORT, () => {
  console.log(`Server kjører på port ${PORT}`);
});
