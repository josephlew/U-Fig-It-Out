var database = require('./database')
var readDocument = database.readDocument

var writeDocument = database.writeDocument;
var addDocument = database.addDocument;
var getCollection = database.getCollection;
// Imports the express Node module.
var express = require('express');
var validate = require('express-jsonschema').validate;
var NewItemSchema = require('../schemas/itemlistings.json')
// Creates an Express server.
var app = express();
var mongo_express = require('../node_modules/mongo-express/lib/middleware');
var mongo_express_config = require('../node_modules/mongo-express/config.default.js');

app.use('/mongo_express', mongo_express(mongo_express_config));
// You run the server from `server`, so `../client/build` is `server/../client/build`.
// '..' means "go up one directory", so this translates into `client/build`!
app.use(express.static('../client/build'));

var bodyParser = require('body-parser');
// Support receiving text in HTTP request bodies
app.use(bodyParser.text());
// Support receiving JSON in HTTP request bodies
app.use(bodyParser.json());
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/UFigItOut';
MongoClient.connect(url, function(err, db) {
  if (err) {
    throw new Error("Could not connect to database: " + err);
  } else {
    console.log("Connected correctly to server.");
    // This is where we will kick off other actions that use the database!
  }


function getUserData(user) {
  var userData = readDocument('users', user)
  return userData
}

function getItemListings(itemIds) {
  if(itemIds.constructor !== Array) {
    itemIds = [itemIds]
  }
  var itemDataList = []
  for (var i = 0; i < itemIds.length; i++) {
    var itemData = readDocument("item_listings", new ObjectId(itemIds[i]))
    var userData = readDocument("users", new ObjectId(itemData.owner))
    itemData.owner = userData
    itemDataList.push(itemData)
  }

  return itemDataList
}

//Get user info for a particular user
app.get('/user/:userid/info', function(req, res) {
  var userid = req.params.userid
  res.send(getUserData(userid))
})

app.post('/items', function(req, res) {
  res.send(getItemListings(req.body))
})

//Get all the categories in the database
app.get('/categories', function(req, res) {
    var allCategories = getCategories();
    res.send(allCategories);
    res.status(200);
});

//Helper function for app.get('/allcategories'...). Retrieves the list of
//categories from the database and returns it.
function getCategories() {
  var categoriesList = []
  var categories = database.search('categories', {})
  categories.forEach((category) => {
    categoriesList.push(category)
  })
  return categoriesList;
}

function storeListing(user, title, description, categories, preferred_payments, price, images) {
  var newItem = {
    "owner": new ObjectId(user),
    "title": title,
    "description": description,
    "categories": categories,
    "preferred_payments": preferred_payments,
    "timestamp": new Date().getTime(),
    "last_updated": new Date().getTime(),
    "active": 1,
    "price": price,
    "type": 0,
    "rating": null,
    "images": images
  }
  newItem = addDocument('item_listings', newItem)
  var userdata = readDocument('users', newItem.owner)

  userdata.items.push(newItem._id)
  writeDocument('users', userdata)
  return newItem;
}

app.get('/categories/:categoryid', function(req, res) {
    var category = req.params.categoryid;
    res.send(getCategoryListings(category));
    res.status(200);
});

function getCategoryListings(category, cb) {
  var itemDataList = []
  db.collection('item_listings').find({categories: category, active: 1}).toArray((err, items) => {
    if (err)
      cb(err)
    return items
  })
}

function getUserIdFromToken(authorizationLine) {
    try {
        // Cut off "Bearer " from the header value.
        var token = authorizationLine.slice(7);
        // Convert the base64 string to a UTF-8 string.
        var regularString = new Buffer(token, 'base64').toString('utf8');
        // Convert the UTF-8 string into a JavaScript object.
        var tokenObj = JSON.parse(regularString);
        var id = tokenObj['id'];
        // Check that id is a string.
        if (typeof id === 'string') {
            return id;
        } else {
            // Not a number. Return an empty string, an invalid ID.
            return '';
        }
    } catch (e) {
        // Return an invalid ID.
        return '';
    }
}

/*

Example
app.get('examplePath', function(req, res) {
  var userid = req.params.userid;
  var fromUser = getUserIdFromToken(req.get('Authorization'));
  // userid is a string. We need it to be a number.
  // Parameters are always strings.
  var useridNumber = parseInt(userid, 10);
  if (fromUser === useridNumber) {
    // Send response.
    res.send(getFeedData(userid));
  } else {
    // 401: Unauthorized request.
    res.status(401).end();
  }
});
*/


/*
Start with app.POST/GET(ETC)
*/

/**
 * Translate JSON Schema Validation failures into error 400s.
 */
app.use(function(err, req, res, next) {
  if (err.name === 'JsonSchemaValidation') {
    // Set a bad request http response status
    res.status(400).end();
  } else {
    // It's some other sort of error; pass it to next error middleware handler
    next(err);
  }
});

app.post('/make_listing/:id', function(req,res) {
  var body = req.body;
  var fromUser = getUserIdFromToken(req.get('Authorization'));
  if(fromUser == body.user) {
    var newItem = storeListing(body.user,body.title,body.description,body.categories,body.preferred_payments,body.price);
    res.status(201);
    res.set('/make_listing/' + newItem._id)
    res.send(newItem)
  }else{
    res.status(401).end()
  }
});

// Reset database.
var ResetDatabase = require('./resetdatabase');

app.post('/resetdb', function(req, res) {
  console.log("Resetting database...");
  ResetDatabase(db, function() {
    res.send();
  });
});

/*
app.post('/make_listing/:id', validate({body: NewItemSchema}), function(req,res) {
  var body = req.body;
  var fromUser = getUserIdFromToken(req.get('Authorization'));
  //var fromUser = getuserIdFromToken(req.get('Authorization'));
  if(fromUser === body.owner){
    var newItem = storeListing(body.user,body.title,body.description,body.categories,body.preferred_payments,body.price);
    res.status(201);
    res.set('/make_listing/'+newItem._id)
    res.send(newItem)
  }else{
    res.status(401).end()
  }
});
*/
// Starts the server on port 3000!
app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
});
