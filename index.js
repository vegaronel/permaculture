const express = require("express");
const bodyParser = require("body-parser");
const cron = require('node-cron');
const mongoose = require('mongoose');
const session = require('express-session');
const middleWare = require("./middleware/middleware");
const MemoryStore = require('memorystore')(session);
const email = require("./routes/emails");
const comments = require("./routes/commentsRoutes");
const userLogin = require("./routes/userloginlogout");
const isAuthenticated = require('./middleware/athenticateUser');
const userDashboard = require("./routes/userDashboard");
const registration = require("./routes/registration");
const plantIdentification = require("./routes/plantDetection");
const dashboardPlants = require("./routes/dashboardPlants");
const commentsRoutes = require("./routes/commentsRoutes");
const postRoutes = require("./routes/postRoutes");

const app = express();
const port = process.env.PORT || 4000;

require('./routes/cronJobs'); // Just require the module
app.set('view engine', 'ejs');

require('dotenv').config();


  app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => 
  {
    console.log("Database Connected");
  })
  .catch(() => 
  {
    console.log("Connection Failed");
  });

app.use(session({
  cookie: { maxAge: 86400000 },
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  resave: false,
  secret: 'keyboard cat'
}));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json());
app.use(express.static("public"));

app.use(middleWare);
app.use(plantIdentification);
app.use(comments);
app.use(email);
app.use(userLogin);
app.use(userDashboard);
app.use(registration);
app.use(dashboardPlants);

app.use(commentsRoutes);
app.use(postRoutes);


app.get("/", (req, res) => {
  res.render("homepage.ejs");
});

app.get("/dashboard", isAuthenticated, async (req, res) => {
    res.render("index.ejs");
  });

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/community", isAuthenticated, (req, res) => {
  const name = req.session.firstname + " " + req.session.lastname;
  res.render("community.ejs", { username: name ,name: req.session.firstname + " " + req.session.lastname});
});

app.use((req, res, next) => {
  res.status(404).render("404.ejs");
});

app.listen(port, () => {
  console.log(`Server running on port http://localhost:${port}`);
});