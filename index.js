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
const { connect } = require("http2");
const { emit } = require("process");
const PUBLISHABLE_KEY="pk_test_51N4DksSEyHIxQ9jvVSThkcQdrUlRDcuZm4AYj4XPKErZwphlPXqzJFUgwFEp7I8hOjaHrrMyorKF3A4cGYBLLUwW00LACZrU8l";
const SECRET_KEY="sk_test_51N4DksSEyHIxQ9jv3mn5GSebN9vQ0AcC1IIsRFBkOVqKdFyMO8EKKhr4NKoInUSSDbzyiI3DEINL1bEhVIP0hSvA00zWsPo5tC";
const stripe = require('stripe')(SECRET_KEY)

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

const auctionSchema = new mongoose.Schema({
  bought: Boolean,
  sold: Boolean,
  product: String,
  amount: Number,
  from: String,
  to: String,
});

const userSchema = new mongoose.Schema({
  name: String,
  username: String,
  email: String,
  address: String,
  valet: Number,
  phone: Number,
  aadhar: Number,
  transactions: [auctionSchema],
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);
const Auction = new mongoose.model("Auction", auctionSchema);

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
    if (auctions[i].time-- === 0) {
      User.update(
        { username: auctions[i].sellerUsn },
        {
          $addToSet: {
            bought: false,
            sold: true,
            product: auctions[i].product,
            from: auctions[i].sellerUsn,
            amount: auctions[i].amount,
            to: auctions[i].buyerUsn,
          },
          $inc: {
            valet: -auctions[i].bidAmount,
          },
        }
      ).then(() => {
        User.update(
          { username: auctions[i].buyerUsn },
          {
            $addToSet: {
              bought: true,
              sold: false,
              product: auctions[i].product,
              amount: auctions[i].amount,
              from: auctions[i].sellerUsn,
              to: auctions[i].buyerUsn,
            },
            $inc: {
              valet: auctions[i].bidAmount,
            },
          }
        ).then(() => {
          delete auctions[i];
          io.sockets.clients(String(i)).forEach(function(s){
            s.leave(String(i));
        });
          io.sockets.emit("updateAuctions", { auctions: auctions,user:req.user });
          io.to(String(i)).emit("auctionCompleted");
        });
      });
    } else {
      io.to(String(i)).emit("timer",{time : auctions[i].time});
    }
  }
}, 1000);



// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/wallet',(req,res)=>{
  res.render('wallet',{
    key:PUBLISHABLE_KEY
  })
})

app.post('/payment',(req,res)=>{
  stripe.customers.create({
    email:req.body.stripeEmail,
    source:req.body.stripeToken,
    name:"deekshith",
    address:{
      line1:"23 vijaynagar",
      postal_code:'560040',
      city:'Bangalore',
      state:'Karnataka',
      country:'India'
    }
  }).then((customer)=>{
    return stripe.charges.create({
      amount:7000,
      description:'product',
      currency:'USD',
      customer:customer.id
    })
  }).then((charge)=>{
    console.log(charge)
    res.send("success")
  })
  .catch((err)=>{
    res.send(err)
  })
})


//        //////////////////////////////////////////////////////////////////////////////////////////////////

app.route("/").get((req, res) => {
  res.render("home");
});

app
  .route("/login")
  .get((req, res) => {
    res.render("login");
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

app.route("/createauction")
.get((req,res)=>{
  res.render("auction")
})
.post((req, res) => {
  let currentDate = new Date();
  let time = currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
  const { product, baseprice } = req.body;
  auctions.push({
    sellerUsn: req.user.username,
    product,
    baseprice,
    startTime: time,
    time: 3600,
    bidAmount: 0,
    buyerUsn: 0,
  });
  io.sockets.emit("updateAuctions",{auctions:auctions,user:req.user})
  res.redirect("/user");
});

app
  .route("/signup")
  .get((req, res) => {
    res.render("signup");
  })
  .post((req, res) => {
    const {
      name,
      username,
      phone,
      aadhar,
      address,
      email,
      password,
      repassword,
    } = req.body;
    if (password === repassword) {
      User.register(
        { username, name, phone, aadhar, address, email, valet:10000 },
        password,
        function (err, user) {
          if (err) {
            log(err);
            res.redirect("/signup");
          } else {
            passport.authenticate("local")(req, res, function (err) {
              if (!err) {
                res.redirect("/user");
              } else {
                log("invalid credentials");
              }
            });
          }
        }
      );
    }
  });

app
  .route("/enterauction/:params")
  .get((req, res) => {
    const roomId = String(req.params.params);
    io.sockets.on("connection", (socket) => {
      socket.join(roomId);
    });
    res.render("bidding",{roomId:roomId})
  })
  .post((req, res) => {
    const roomId = Number(req.params.params);
    if (req.body.bidamount > auctions[roomId].bidAmount) {
      auctions[roomId].buyerUsn = req.user.username;
      auctions[roomId].bidAmount = req.body.bidamount;
    }
    res.redirect("/enterauction/"+String(roomId))
  });

app.route("/history").get((req, res) => {
  res.render("history", { user: req.user });
});

app.route("/logout").get((req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

http.listen("3000", () => {
  try {
    console.log("Server started at port 3000");
  } catch (err) {
    console.log(err);
  }
});
