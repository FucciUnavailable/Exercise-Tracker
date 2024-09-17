const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const mongoose = require("mongoose")
const uri = process.env.URI //mongodb uri
const User = require("./mongoSchema")
 //this comment is just for clarity in case i dont save the mongo file
/*const mongoose = require('mongoose')

const exerciseSchema = mongoose.Schema({description: String, duration: Number, date: Date})
const userSchema = mongoose.Schema({username: String, count: {type: Number, default: 0}, log: [exerciseSchema]})

const User = mongoose.model("User", userSchema)

module.exports = User */

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Successfully connected to MongoDB');
})
.catch((error) => {
  console.error('Error connecting to MongoDB', error);
});

const db = mongoose.connection;
let clearDocuments = () =>{
db.once('open', async () => {
    console.log('Connected to MongoDB');

    try {
        // Remove all documents from User collection
        await User.deleteMany({});
        console.log('Cleared all documents from User collection');

            } catch (error) {
        console.error('Error clearing documents:', error);
    }
});
}




// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Middleware to parse URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.get("/whoami", (req,res)=>{
  let ip = req.ip
  res.send({"Hello friend, this is your ip": ip})
})


app.route("/api/users").post(async(req,res)=>{
    let data= req.body
  try{
      let newUser = new User(data)
      await newUser.save()
      console.log("Saving New User", newUser)
      const fetchUser = await User.find(data).select("username _id")
      res.status(201).send(fetchUser[0])
  }catch(err){
      console.error("error adding new user to db", err)
      res.status(400).send("Cant create new user, try again later...")
  }
}).get(async(req,res)=>{
  try{
        const fetchData = await User.find().select("_id username")
        console.log("fetching data from User Model")
        res.status(200).json(fetchData)
  }catch(err){
    console.error("error fetching data for users", err)

  }
})

app.route("/api/users/:_id/exercises").post(async(req,res)=>{
    //get user ID and form info from request
    let userId = req.params._id
    let {description, duration, date} = req.body
   let exerciseDate = date? new Date(date): new Date();
   
  try{
      //try to find user by id
      const user = await User.findById(userId)
      //if user id doesnt exist in database throw error
      if(!user){
        res.status(400).send("Please make sure the id is correct")
        return
      }
      //push exercises to the log array of the user
      user.log.push({
        "description": description,
        "duration": duration,
        "date": exerciseDate
      })
      //count how many exercises the user has in their log and update the counter
      user.count = user.log.length
      //save user
      await user.save()
      // find the updated user with the added information
      const updatedUser = await User.findById(userId)
      //mongoose is annoying so we have to find the last exercise added first
      const latestExercise = user.log[user.log.length -1]
      //response after submitting the form god willing...
      const exerciseResponse = {
        username: user.username,
        _id: userId,
        description: latestExercise.description,
        duration: latestExercise.duration,
        date: latestExercise.date.toDateString()
      }
      console.log("response to form", exerciseResponse)
      res.status(200).json(exerciseResponse)


  }catch(err){
    console.error("could not add exercise", err)
    res.status(500).send("failed to add exercise")
  }
})



app.get("/api/users/:_id/logs", async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    // Find the user by ID
    const user = await User.findById(userId).exec();

    // Check if the user exists
    if (!user) {
      console.error("User not found with ID:", userId);
      return res.status(404).send("User not found");
    }

    // Convert logs to a plain object and format dates
    let logs = user.log.map(entry => ({
      ...entry.toObject(),
      date: entry.date.toDateString()
    }));

    // Apply filters based on query parameters
    if (from) {
      logs = logs.filter(entry => new Date(entry.date) >= new Date(from));
    }
    if (to) {
      logs = logs.filter(entry => new Date(entry.date) <= new Date(to));
    }

    // Apply limit
    if (limit) {
      const limitNumber = parseInt(limit, 10);
      if (!isNaN(limitNumber)) {
        logs = logs.slice(0, limitNumber);
      }
    }

    // Prepare the response data
    const dataLog = {
      username: user.username,
      id: user._id,
      log: logs,
      count: logs.length
    };

    console.log("Found user for /api/users/:_id/logs", dataLog);
    res.status(200).json(dataLog);

  } catch (err) {
    console.error("Error fetching user with ID:", userId, err);
    res.status(500).send(`Could not fetch user with ID: ${userId}`);
  }
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
