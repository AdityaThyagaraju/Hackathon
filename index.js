require('dotenv').config()
const express = require("express")

const app = express()
const http = require("http").Server(app)
const io = require("socket.io")(http)
const bodyParser = require("body-parser")
const ejs = require("ejs")
const session = require("express-session")
const mongoose = require("mongoose")
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const { log } = require('console')

app.set("view engine","ejs")
app.use(express.static("public"))
app.use(bodyParser.urlencoded({extended:true}))

app.use(session({
    secret:"HACKKKERERRERE",
    saveUninitialized:false,
    resave:false
}))
app.use(passport.initialize())
app.use(passport.session())

const dbUrl = "mongodb+srv://deekshith:2avyCCdkZ5h2yN9D@cluster0.71trsjd.mongodb.net/UsersDb?retryWrites=true&w=majority"
mongoose.connect(dbUrl,{useNewUrlParser: true,useUnifiedTopology:true}).then(()=>{
    log("connected to database")
}).catch((err)=>{
    console.log(err);
})

const userSchema = new mongoose.Schema({
    name:String,
    username:String,
    password:String,
    phone:Number,
    aadhar:Number,
})

userSchema.plugin(passportLocalMongoose);

const auctionSchema = new mongoose.Schema({
    from:String,
    to:String
})

app.route("/")
.get((req,res)=>{
    res.render("login")
})


app.listen("3000",()=>{

    try{
        console.log("Server started at port 3000")
    }
    catch(err){
        console.log(err);
    }

})



