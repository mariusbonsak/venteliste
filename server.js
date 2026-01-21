const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* ================================
   FILLAGRING
================================ */
const DATA_DIR = "/data";
const DATA_FILE = path.join(DATA_DIR, "kunder.json");


let kunder = [];

// Last kunder fra fil
function lastKunder() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      kunder = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      console.log("Kunder lastet fra fil");
    }
  } catch (err) {
    console.error("Feil ved lasting av kunder:", err);
    kunder = [];
  }
}

// Lagre kunder til fil
function lagreKunder() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(kunder, null, 2));
  } catch (err) {
    console.error("Feil ved lagring:", err);
  }
}

lastKunder();

/* ================================
   STATISKE FILER
================================ */
app.use(express.static(path.join(__dirname, "public")));

/* ================================
   SOCKET.IO
================================ */
io.on("connection", socket => {
  console.log("Klient koblet til");

  // Send eksisterende kunder
  socket.emit("oppdater", kunder);

  // Ny kunde
  socket.on("nyKunde", kunde => {
    kunder.push(kunde);
    lagreKunder();
    io.emit("oppdater", kunder);
  });

  // Endre status
  socket.on("oppdaterStatus", ({ id, status }) => {
    const k = kunder.find(k => k.id === id);
    if (k) {
      k.status = status;
      lagreKunder();
      io.emit("oppdater", kunder);
    }
  });

  // 🔧 Rediger forventet klar
  socket.on("oppdaterKlarTid", ({ id, klarTid }) => {
    const k = kunder.find(k => k.id === id);
    if (k) {
      k.klarTid = klarTid;
      lagreKunder();
      io.emit("oppdater", kunder);
    }
  });

  // Fjern kunde
  socket.on("fjernKunde", id => {
    kunder = kunder.filter(k => k.id !== id);
    lagreKunder();
    io.emit("oppdater", kunder);
  });

  socket.on("disconnect", () => {
    console.log("Klient koblet fra");
  });
});

/* ================================
   START SERVER
================================ */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server kjører på port ${PORT}`);
});



