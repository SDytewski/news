// Dependencies
const express = require("express");
const logger = require("morgan");

// Require axios and cheerio. This makes the scraping possible
const axios = require("axios");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const exphbs = require("express-handlebars");
const db = require("./models");



// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server




var PORT = 3000;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";


// Connect to the Mongo DB
mongoose.Promise = global.Promise;
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

// var db = mongoose.connection;
// db.on('error', console.error.bind(console, 'connection error'));
// db.once('open', function () {
//   console.log('Connected to Mongoose!');
// })


// A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.npr.org").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);


    // Now, we grab every h2 within an article tag, and do the following:
    $(".hp-item").each(function (i, element) {
      // Save an empty result object
      var results = {};

      results.title = $(element).find("h3.title").text();
      results.url = $(element).find("a").attr('href');
      results.description = $(element).find("p.teaser").text();
      //let link = $(element).find("a").attr("href");

      // Save these results in an object that we'll push into the results array we defined earlier
      // results.push({
      //   title: title,
      //   link: url,
      //   description: description


      // });
      let entry = new db.Article(results);
      entry.save(function (err, doc) {
        if (err) {
          console.log(err);
        }
        else {
          console.log("article added to DB");
        }
      })
      console.log(results);
      // res.json(results);

    });










    // Send a message to the client
    res.send("Scrape Complete");
  });
});

// // Route for getting all Articles from the db
// app.get("/articles", function(req, res) {
//   // Grab every document in the Articles collection
//   db.Article.find({})
//     .then(function(dbArticle) {
//       // If we were able to successfully find Articles, send them back to the client
//       res.json(dbArticle);
//     })
//     .catch(function(err) {
//       // If an error occurred, send it to the client
//       res.json(err);
//     });
// });


app.get("/articles", function (req, res) {
  db.Article.find({}).limit(20).exec(function (error, doc) {
    if (error) {
      console.log(error);
    }
    else {
      res.json(doc);
    }
  });
});


// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


// app.post("/api/note", (req, res) => {
//   db.Note
//   .create({body: req.body.body})
//   .then(dbNote => {
//     res.json(dbNote)


//   }).catch(err =>res.json(err));

// });
app.get("/note/:id", (req, res) => {
  db.Note.findOne({ _id: req.params.id })
    .then(function (articleInfo) {
      res.json(articleInfo);
    })
    .catch(function (err) {
      res.json(err);
    })

})

// app.delete("/note/:id", (req, res) => {
//   db.Note.findOneAndRemove({ _id: req.params.note_id  }, function (err) {
//     // Log any errors
//     if (err) {
//       console.log(err);
//       res.send(err);
//     }
//     else {
//       db.Article.findOneAndUpdate({ _id: req.params.id }, { $pull:  { note: req.params.note_id }})
//         // Execute the above query
//         .exec(function (err) {
//           // Log any errors
//           if (err) {
//             console.log(err);
//             res.send(err);
//           }
//           else {
//             // Or send the note to the browser
//             res.send("Note Deleted");
//           }
//         });
//     }
//   });
// });





// Route for saving/updating an Article's associated Note
app.post("/articles/:id", (req, res) => {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function (dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function (dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });



});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
