const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

// ================================
// PERSISTENT DATA (RENDER DISK)
// ================================
const DATA_DIR = "/data";
const DATAFIL = path.join(DATA_DIR, "kunder.json");

// Sørg for at mappen finnes
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Last kunder ved oppstart
let kunder = [];
if (fs.existsSync(DATAFIL)) {
  try {
    kunder = JSON.parse(fs.readFileSync(DATAFIL, "utf8"));
  } catch (err) {
    console.error("Feil ved lesing av kunder.json:", err);
    kunder = [];
  }
}

// Lagre til fil
function lagre() {
  fs.writeFileSync(DATAFIL, JSON.stringify(kunder, null, 2));
}

// ================================
// EXPRESS
// ================================
app.use(express.static("public"));

// ================================
// SOCKET.IO
// ================================
io.on("connection", (socket) => {
  console.log("Ny klient tilkoblet");

  // Send eksisterende kunder
  socket.emit("oppdater", kunder);

  // Ny kunde
  socket.on("nyKunde", (kunde) => {
    kunder.push(kunde);
    lagre();
    io.emit("oppdater", kunder);
  });

  // Oppdater status
  socket.on("oppdaterStatus", ({ id, status }) => {
    kunder = kunder.map(k =>
      k.id === id ? { ...k, status } : k
    );
    lagre();
    io.emit("oppdater", kunder);
  });

  // Fjern kunde
  socket.on("fjernKunde", (id) => {
    kunder = kunder.filter(k => k.id !== id);
    lagre();
    io.emit("oppdater", kunder);
  });

  // Manuell refresh
  socket.on("beOmOppdatering", () => {
    socket.emit("oppdater", kunder);
  });
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server kjører på port ${PORT}`);
});
