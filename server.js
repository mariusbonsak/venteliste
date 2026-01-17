const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let venteliste = [];

io.on("connection", (socket) => {
socket.on("beOmOppdatering", () => {
  socket.emit("oppdater", venteliste);
});
  socket.emit("oppdater", venteliste);

  socket.on("nyKunde", (kunde) => {
    venteliste.push(kunde);
    io.emit("oppdater", venteliste);
  });

  socket.on("oppdaterStatus", ({ id, status }) => {
    venteliste = venteliste.map(k =>
      k.id === id ? { ...k, status } : k
    );
    io.emit("oppdater", venteliste);
  });

  socket.on("fjernKunde", (id) => {
    venteliste = venteliste.filter(k => k.id !== id);
    io.emit("oppdater", venteliste);
  });
});

server.listen(3000, () => {
  console.log("Venteliste kjører på http://localhost:3000");
});