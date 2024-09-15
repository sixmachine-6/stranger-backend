const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const { Server } = require("socket.io");
const Chat = require("./Chat");

const chats = [];
let pendingUser;
dotenv.config({ path: "./config.env" });
const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET, POST"],
  },
});

app.get("/", (req, res) => {
  res.send("i am watching you");
});
io.on("connection", (socket) => {
  console.log(`user connected ${socket.id}`);

  socket.on("pair", () => {
    if (pendingUser) {
      const chat = new Chat(pendingUser, socket.id);
      chats.push(chat);
      io.to(chat.stranger1).emit("paired", "We found start chatting");
      io.to(chat.stranger2).emit("paired", "We found start chatting");
      pendingUser = null;

      console.log(chat);
    } else {
      pendingUser = socket.id;
      socket.emit("pairing", "Wait Until we find stranger??");
      console.log(pendingUser);
    }
  });

  socket.on("sendMessage", (data) => {
    console.log(data);
    const chatFound = chats.find((chat) => {
      console.log("id", data.socket, chat);

      return chat.stranger1 === socket.id || chat.stranger2 === socket.id;
    });
    if (chatFound) {
      const recipient =
        chatFound.stranger1 === socket.id
          ? chatFound.stranger2
          : chatFound.stranger1;

      io.to(recipient).emit("recieveMessage", { ...data, own: false });
    }
  });

  socket.on("disconnect", () => {
    const chatIndex = chats.findIndex(
      (chat) => chat.stranger1 === socket.id || chat.stranger2 === socket.id
    );

    if (chatIndex !== -1) {
      const chatFound = chats[chatIndex];
      pendingUser =
        chatFound.stranger1 === socket.id
          ? chatFound.stranger2
          : chatFound.stranger1;

      io.to(pendingUser).emit("disconnected", "Wait until we find stanger??");
    }

    chats.splice(chatIndex, 1);
  });
});

server.listen(process.env.PORT, () => {
  console.log(`server is listening to port ${process.env.PORT}`);
});
