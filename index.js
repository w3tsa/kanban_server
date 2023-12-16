const express = require("express");
const app = express();
const PORT = 8080;

// socket imports
const http = require("http");
const server = http.createServer(app);
const cors = require("cors");

const { Server } = require("socket.io");
const socketIO = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

app.use(cors());
app.use(express.json());

// const socketIO = require("socket.io")(http, {
//   cors: {
//     origin: "http://localhost:5173",
//   },
// });

// Dummy data
const UID = () => Math.random().toString(36).substring(2, 10);

let tasks = {
  pending: {
    title: "pending",
    items: [
      {
        id: UID(),
        title: "Send the Figma file to Dima",
        comments: [],
      },
    ],
  },
  ongoing: {
    title: "ongoing",
    items: [
      {
        id: UID(),
        title: "Review GitHub issues",
        comments: [
          {
            name: "David",
            text: "Ensure you review before merging",
            id: UID(),
          },
        ],
      },
    ],
  },
  completed: {
    title: "completed",
    items: [
      {
        id: UID(),
        title: "Create technical contents",
        comments: [
          {
            name: "Dima",
            text: "Make sure you check the requirements",
            id: UID(),
          },
        ],
      },
    ],
  },
};

app.get("/api", (req, res) => {
  res.json(tasks);
});

socketIO.on("connection", (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);

  socket.on("createTask", (data) => {
    console.log(data);
    // construct an object like the data struct
    const newTask = { id: UID(), title: data, comments: [] };
    // add the task to the pending category
    tasks["pending"].items.push(newTask);

    // fires the event for update
    socketIO.sockets.emit("tasks", tasks);
  });

  socket.on("addComment", (data) => {
    const taskItems = tasks[data.category].items;
    for (let i = 0; i < taskItems.length; i++) {
      if (taskItems[i].id === data.id) {
        taskItems[i].comments.push({
          name: data.userId,
          text: data.comment,
          id: UID(),
        });
        socket.emit("comments", taskItems[i].comments);
      }
    }
  });

  socket.on("fetchComments", (data) => {
    const { category, id } = data;
    const taskItems = tasks[category].items;

    for (let taskItem of taskItems) {
      if (taskItem.id === id) {
        socket.emit("comments", taskItem.comments);
      }
    }
  });

  socket.on("taskDragged", (data) => {
    const { source, destination } = data;
    const itemMoved = {
      ...tasks[source.droppableId].items[source.index],
    };
    // console.log("ItemMoved>>> ", itemMoved);
    tasks[source.droppableId].items.splice(source.index, 1);
    tasks[destination.droppableId].items.splice(
      destination.index,
      0,
      itemMoved
    );
    // console.log("Source >>>", tasks[source.droppableId].items);
    // console.log("Destination >>>", tasks[destination.droppableId].items);
    socketIO.sockets.emit("tasks", tasks);

    /* 👇🏻 Print the items at the Source and Destination
    console.log("Source >>>", tasks[source.droppableId].items);
    console.log("Destination >>>", tasks[destination.droppableId].items);
     */
  });

  socket.on("disconnect", () => {
    socket.disconnect();
    console.log("🔥: A user disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
