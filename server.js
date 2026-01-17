const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let kunder = [];

// Når ny klient kobler
io.on("connection", (socket) => {
  console.log("Ny bruker tilkoblet");

  // Send eksisterende liste
  socket.emit("oppdater", kunder);

  // Ny kunde
  socket.on("nyKunde", (kunde) => {
    kunder.push(kunde);
    io.emit("oppdater", kunder);
  });

  // Oppdater status
  socket.on("oppdaterStatus", ({ id, status }) => {
    kunder = kunder.map(k => k.id === id ? {...k, status} : k);
    io.emit("oppdater", kunder);
  });

  // Fjern kunde
  socket.on("fjernKunde", (id) => {
    kunder = kunder.filter(k => k.id !== id);
    io.emit("oppdater", kunder);
  });

  // Håndter manuell oppdatering
  socket.on("beOmOppdatering", () => {
    socket.emit("oppdater", kunder);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server kjører på port ${PORT}`));
