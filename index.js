require("dotenv").config();
const express = require("express");

const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const bodyParser = require("body-parser");
const ejs = require("ejs");
const session = require("express-session");
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const { log } = require("console");

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "HACKKKERERRERE",
    saveUninitialized: false,
    resave: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

const dbUrl =
  "mongodb+srv://deekshith:2avyCCdkZ5h2yN9D@cluster0.71trsjd.mongodb.net/UsersDb?retryWrites=true&w=majority";
mongoose
  .connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    log("connected to database");
  })
  .catch((err) => {
    console.log(err);
  });

const userSchema = new mongoose.Schema({
  name: String,
  username: String,
  email:String,
  address:String,
  valet:Number,
  phone: Number,
  aadhar: Number,
});

userSchema.plugin(passportLocalMongoose);

const auctionSchema = new mongoose.Schema({
  from: String,
  to: String,
});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(async function (id, done) {
  const user = await User.findById(id);
  done(null, user);
});

// Ongoing auctions

let auctions = [];

setInterval(() => {
    for (var i = 0; i < auctions.length; i++) {
      if (auctions[i].timer-- === 0) {
        delete auctions[i];
      }
    }
  }, 1000);

app.route("/").get((req, res) => {
  res.render("bidding");
});

app.route("/login")
.get((req,res)=>{
  res.render("login")
})
.post(function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  const user = new User({ username, password });

  req.logIn(user, function (err) {
    if (err) {
      log(err);
    } else {
      passport.authenticate("local")(req, res, function (err) {
        if (err) {
          log("invalid credentials");
        } else {
          res.redirect("/user");
        }
      });
    }
  });
});

app.route("/user").get(async (req, res) => {
  if (req.isAuthenticated()) {
    
    const user = await User.findById(req.user.id);
    let auctionsList = [];
    if (auctions.length != 0) {
      for (var i = 0; i < auctions.length; i++) {
        auctionsList.push(auctions[i]);
      }
    }
    res.render("customer", { user: req.user, auctions: auctionsList });
  }
});

app.route("/signup").get((req,res)=>{
  res.render("signup")
})
.post((req, res) => {
  const { name, username, phone, aadhar, address, email, password, repassword } = req.body;
  if(password === repassword){
    User.register(
      { username, name, phone, aadhar, address, email, password, repassword },
      password,
      function (err, user) {
        if (err) {
          log(err);
          res.redirect("/signup");
        } else {
          passport.authenticate("local")(req, res, function (err) {
            if (!err) {
              res.redirect("/customer");
            } else {
              log("invalid credentials");
            }
          });
        }
      }
    );
  }
});

app.route("/logout").get((req,res)=>{
  req.logout(()=>{
    res.redirect("/")
  })
})

app.listen("3000", () => {
  try {
    console.log("Server started at port 3000");
  } catch (err) {
    console.log(err);
  }
});
