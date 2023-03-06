const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./model/user");
const Post = require("./model/post");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const fs = require("fs");
const app = express();
require("dotenv").config();

const jwtScret = "jsg63sddbcad92lkldovnr96arw";

app.use(
  cors({
    credentials: true,
    origin: "https://fabulous-hummingbird-672157.netlify.app",
  })
);
app.use(cookieParser());
app.use(express.json());
app.use("/uploads", express.static(__dirname + "/uploads"));

mongoose.set("strictQuery", true);

mongoose
  .connect(process.env.URL_MONGODB)
  .then(() => console.log("conected !"))
  .catch(() => console.log("faild conect!"));

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Hello! I am the root!",
  });
});

app.get("/test", (req, res) => {
  res.json("test");
});

app.post("/api/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const salt = bcrypt.genSaltSync(10);
    const hashPass = bcrypt.hashSync(password, salt);
    const userDoc = await User.create({
      username,
      email,
      password: hashPass,
    });
    res.status(200).json(userDoc);
  } catch (err) {
    res.status(400).json(err);
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const userDoc = await User.findOne({ email });

  try {
    if (userDoc) {
      const passOk = bcrypt
        .compare(password, userDoc.password)
        .then((result) => result);

      if (passOk) {
        jwt.sign(
          { email: userDoc.email, id: userDoc._id },
          jwtScret,
          {},
          (err, token) => {
            if (err) throw err;
            res.cookie("token", token).json({
              _id: userDoc._id,
              username: userDoc.username,
              email: userDoc.email,
            });
          }
        );
      } else {
        res.status(422).json("wrong password");
      }
    } else {
      res.status(422).json("not found");
    }
  } catch (err) {
    console.log(err);
  }
});

app.get("/api/profile", async (req, res) => {
  const { token } = req.cookies;

  try {
    if (token) {
      jwt.verify(token, jwtScret, {}, async (err, user) => {
        if (err) throw err;
        const { username, email, _id } = await User.findById(user.id);
        res.json({ username, email, _id });
      });
    }
  } catch (err) {
    res.status(400).json("some error");
  }
});

app.post("/api/logout", async (req, res) => {
  res.cookie("token", "").json("ok");
});

const uploadMiddleware = multer({ dest: "uploads/" });
app.post(
  "/api/createPost",
  uploadMiddleware.single("file"),
  async (req, res) => {
    const { path, originalname } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);

    const { title, summary, category, content } = req.body;
    const { token } = req.cookies;

    try {
      jwt.verify(token, jwtScret, {}, async (err, user) => {
        const postDoc = await Post.create({
          title,
          summary,
          category,
          content,
          cover: newPath,
          author: user.id,
        });
        res.status(200).json(postDoc);
      });
    } catch (err) {
      res.status(400).json(err);
    }
  }
);

app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find().populate("author").sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    res.status(400).json("faild");
  }
});

app.get("/api/posts/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const postDoc = await Post.findById(id).populate("author");
    res.status(200).json(postDoc);
  } catch (err) {
    res.status(400).json("faild");
  }
});

app.put(
  "/api/editPost/:id",
  uploadMiddleware.single("file"),
  async (req, res) => {
    const { id } = req.params;
    let newPath = "";

    if (req.file) {
      const { path, originalname } = req.file;
      const parts = originalname.split(".");
      const ext = parts[parts.length - 1];
      newPath = path + "." + ext;
      fs.renameSync(path, newPath);
    }

    try {
      const { token } = req.cookies;

      jwt.verify(token, jwtScret, {}, async (err, user) => {
        if (err) throw err;
        const { title, summary, category, content } = req.body;
        const postDoc = await Post.findById(id);

        const isAuthor =
          JSON.stringify(postDoc.author) === JSON.stringify(user.id);
        if (!isAuthor) {
          return res.status(400).json("you are not the author");
        }

        await postDoc.updateOne({
          title,
          summary,
          category,
          content,
          cover: newPath ? newPath : postDoc.cover,
        });

        res.status(200).json(postDoc);
      });
    } catch (err) {
      res.status(400).json(err);
    }
  }
);

app.listen(5000);
// pass database mongoose: T4wOIgdGd6d3sLKb
