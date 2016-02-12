//basic setup

var express 	= require('express');
var app 		= express();
var bodyParser 	= require('body-parser');
var morgan 		= require('morgan');
var mongoose 	= require('mongoose');
var port 		= process.env.PORT || 8080;
var User		= require('./app/models/user');
var jwt			= require('jsonwebtoken');
var superSecret	= 'ilovechocolateandwine';


//connect to our database 
mongoose.connect('mongodb://localhost:27017/node-api');

// APP Configuration 

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//configure to handle CORS requests
app.use(function(req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization');
	next();

});

//log all requests to the console
app.use(morgan('dev'));

//ROUTES FOR OUR API

//basic route for the home page
app.get('/', function(req, res) {
	res.send('Welcome to the home page');
});

//get an instance of express router

var apiRouter = express.Router();

//route for authenticating users
apiRouter.post('/authenticate',function(req, res) {
	//find the user
	//select username and password explicitly
	User.findOne({
		username: req.body.username

	}).select('name username password').exec(function(err,user) {
		if(err) throw err;
		if(!user) {
			res.json({success:false,
						message: 'Authentication failed. User not found'
			});
		} else if (user) {

			//check if password matches
			var validPassword = user.comparePassword(req.body.password);
			if (!validPassword) {
				res.json({
					success: false,
					message: 'Authentication failed. Wrong password'
				});
			} else {

				//create a token
				var token =jwt.sign({
					name: user.name,
					username: user.username
				}, superSecret, {
					expiresInMinutes: 1440 // 24 hours
				});

				res.json({
					success:true,
					message: 'Enjoy youe token',
					token: token
				});
			}
		}
	});
});

//middleware to use for all requests
apiRouter.use(function(req, res, next) {
	//do logging
	console.log('somebody called our app');
	next();
});


//middleware to verify a token

apiRouter.use(function(req, res, next) {
	//check header or url parameters or post parameters
	var token = req.body.token || req.param('token') || req.headers['x-access-token'];

	//decode token
	if (token) {

		//verifies secret and checks exp
		jwt.verify(token, superSecret, function(err, decoded) {
			if(err) {
				return res.status(403).send({
					success: false,
					message: 'Failed to authenticate token'
				});
			} else {
				//if everything is good save to request for use in other routes
				req.decoded = decoded;
				next();
			}
		});
	} else {
		//if there is no token return 403 and error
		return res.status(403).send({
			success: false,
			message: 'No token provided'
		});
	}

});


//test route to make sure everything is working
//accessed at GET http://loclahost:8080/api

apiRouter.get('/',function(req, res) {
	res.json({ message: 'Welcome to our api!'});
});

//more routes here

//on routes that end in /users

apiRouter.route('/users')

//create a user (accessed at POST http://localhost:8080/api/users)

//set the users info (comes from the request)
.post(function(req, res) {

	var user = new User();
	user.name = req.body.name;
	user.username = req.body.username;
	user.password = req.body.password;

	user.save(function(err) {
		if(err) {
			if(err.code = 11000)
				return res.json({success: false, message: 'A user with that username already exists'});
			else
				return res.send(err);
		}
	res.json({message: 'User created'});
	});

})
.get(function(req, res) {
	User.find(function (err, users) {
		if(err) res.send(err);
		res.json(users);
	});
});

//on routes that end in /users:user_id

apiRouter.route('/users/:user_id')

.get(function(req, res) {
	User.findById(req.params.user_id,function(err,user) {
			if (err) res.send(err);
			
			res.json(user);
	});
})

.put(function(req, res) {
User.findById(req.params.user_id,function(err,user) {
			if (err) res.send(err);
			
			if(req.body.name) user.name = eq.body.name;
			if(req.body.username) user.username = req.body.username;
			if(req.body.password) user.password = req.body.password;
			user.save(function(err){
				if (err) res.send (err);
				res.json({message: 'User Updated'});
			})
	});
})

.delete(function(req,res) {
	User.remove({_id: req.params.user_id}, function(err, user) {
		if (err) return res.send(err);
		res.json({message: 'User deleted'});
	});
});

apiRouter.get('/me', function(req, res) {
	res.send(req.decoded);
});

//REGISTER OUR ROUTES
app.use('/api', apiRouter);

//START THE SERVER

app.listen(port);
console.log('Magic happens on port ' + port);
