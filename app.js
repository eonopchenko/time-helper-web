const express = require("express");
const session = require("express-session");
const passport = require("passport");
const bluemix_appid = require("bluemix-appid");
const app = express();
const request = require('request');
const helmet = require("helmet");
const express_enforces_ssl = require("express-enforces-ssl");
const cfenv = require("cfenv");
const сloudant = require('cloudant');
const bluemix_push_notifications = require('bluemix-push-notifications');
const PushNotifications = bluemix_push_notifications.PushNotifications;
const Notification = bluemix_push_notifications.Notification;

const LOGIN_URL = "/ibm/bluemix/appid/login";
const CALLBACK_URL = "/ibm/bluemix/appid/callback";

if (cfenv.getAppEnv().isLocal) {
   console.error('This sample should not work locally, please push the sample to Bluemix.');
   process.exit(1);
}

app.use(helmet());
app.use(helmet.noCache());
app.enable("trust proxy");
app.use(express_enforces_ssl());

app.use(session({
  secret: "123456",
  resave: true,
  saveUninitialized: true,
	proxy: true,
	cookie: {
		httpOnly: true,
		secure: true
	}
}));

app.set('view engine', 'ejs');

app.use(express.static("views"));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new bluemix_appid.WebAppStrategy());

bluemix_appid.UserAttributeManager.init();

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

app.get(LOGIN_URL, passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME, {
  forceLogin: true
}));

app.get(CALLBACK_URL, passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME, {allowAnonymousLogin: true}));

app.get('/',function(req,res) {
	res.sendfile(__dirname + '/views/index.html');
});

app.get("/protected", passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME), function(req, res) {
  var accessToken = req.session[bluemix_appid.WebAppStrategy.AUTH_CONTEXT].accessToken;

  bluemix_appid.UserAttributeManager.getAllAttributes(accessToken).then(function (attributes) {
    res.render('landing', {
        name: req.user.name, 
        email: req.user.email,
        picture: req.user.picture
    });
  });
});

app.get("/login", passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME, {successRedirect : '/protected', forceLogin: true}));


///--- CLOUDANT DATABASE CONNECTION ---///
var cloudant_url = 'https://dd99ab4a-3be7-4c60-9eea-90e610e7ff3b-bluemix:397e251ab62bc131be9b552263a174e7d6701f4c261f8f0ed55853e4867e6b00@dd99ab4a-3be7-4c60-9eea-90e610e7ff3b-bluemix.cloudant.com';
var cloudant_instance = сloudant({url: cloudant_url});
db = cloudant_instance.db.use('timetable_db');

app.get('/read_classes',function(req, res) {
  var url = cloudant_url + "/timetable_db/_design/timetable_db/_view/timetable_db";
	request({
      url: url,
      json: true
    }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var user_data = body.rows;
      var list_of_classes = '[';
      var days_array = [];
      var start_time_array = [];
      var end_time_array = [];
      var titles_array = [];

      for(var i = 0; i < user_data.length; i++) {
        days_array.push(user_data[i].value[1]);
        start_time_array.push(user_data[i].value[2]);
        end_time_array.push(user_data[i].value[3]);
        titles_array.push(user_data[i].value[4]);
      }

      for(var i = 0; i < titles_array.length; i++) {
        var json_block = 
          '{\"day\":\"' + days_array[i] + '\",' + 
          '\"start_time\":\"' + start_time_array[i] + '\",' + 
          '\"end_time\":\"' + end_time_array[i] + '\",' + 
          '\"title\":\"' + titles_array[i] + '\"}';
        if(i !== 0) {
          list_of_classes = list_of_classes.concat(",");
        }
        list_of_classes = list_of_classes.concat(json_block);
      }

      list_of_classes = list_of_classes.concat("]");
      res.contentType('application/json');
      res.send(JSON.parse(list_of_classes));
		} else {
			var str ="{\"error\":\"db read error\"}";
			res.contentType('application/json');
			res.send(JSON.parse(str));
		}
	});
});

app.get('/create_class',function(req, res) {
  var url = cloudant_url + "/timetable_db/_design/timetable_db/_view/timetable_db";
  var name_string;
  
  request({
    url: url,
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      db.insert(req.query, function(err, data) {
        if (!err) {
          name_string="{\"added\":\"Yes\"}";

          var pushNotification = new PushNotifications(PushNotifications.Region.SYDNEY, "1e1125cd-32ed-4e96-bb35-ab62cb806322", "a5c93e43-91f2-405d-bbc0-2691a8fdbaaf");
          var notification = new Notification("New class has been scheduled: " + 
            req.query.day + ", " + 
            req.query.start_time + ", " + 
            req.query.end_time + ", " + 
            req.query.title);
          pushNotification.send(notification, function(error, response, body) {
          });
        }
        else {
          name_string="{\"added\":\"DB insert error\"}";
        }
        res.contentType('application/json');
        res.send(JSON.parse(name_string));
      });
    }
    else {
      name_string="{\"added\":\"DB read error\"}";
      res.contentType('application/json');
      res.send(JSON.parse(name_string));
    }
  });
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on http://localhost:" + port);
});
