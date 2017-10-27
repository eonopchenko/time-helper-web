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
var PushMessageBuilder = bluemix_push_notifications.PushMessageBuilder;

const LOGIN_URL = "/ibm/bluemix/appid/login";
const CALLBACK_URL = "/ibm/bluemix/appid/callback";

app.set('view engine', 'ejs');

app.use(express.static("views"));

///--- CLOUDANT SETTINGS ---///
var cloudant_url = 'https://dd99ab4a-3be7-4c60-9eea-90e610e7ff3b-bluemix:397e251ab62bc131be9b552263a174e7d6701f4c261f8f0ed55853e4867e6b00@dd99ab4a-3be7-4c60-9eea-90e610e7ff3b-bluemix.cloudant.com';
var cloudant_instance = сloudant({url: cloudant_url});
timetable_db = cloudant_instance.db.use('timetable_db');

app.use(helmet());
app.use(helmet.noCache());

///--- LOCAL LOGIN ---///
if (cfenv.getAppEnv().isLocal) {

  app.use(session({
    secret: "123456",
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: false
    }
  }));
  
  app.get('/login',function(req,res) {
    
    req.session.name = "User";
    req.session.email = "user@mail.com";
    req.session.picture = "https://cdn1.iconfinder.com/data/icons/mix-color-4/502/Untitled-1-512.png";

    /// 0 - not registered yet, 1 - student, 2 - lecturer
    var class_id_array = new Array();
    var class_start_array = new Array();
    var class_duration_array = new Array();
    var class_title_array = new Array();
    var student_timetable_db = cloudant_instance.db.use('student_timetable_db');

    student_timetable_db.find({selector:{studentId:req.session.email}}, function(er1, result1) {
      if (er1) {
        throw er1;
      }

      timetable_db.find({selector:{user:req.session.email}}, function(er2, result2) {
        if (er2) {
          throw er2;
        }

        timetable_db.find({selector:{}}, function(er3, result3) {
          if (er3) {
            throw er3;
          }
          if(result3.docs.length != 0) {
            for (var i = 0; i < result3.docs.length; i++) {
              class_id_array.push(result3.docs[i]._id);
              class_start_array.push(result3.docs[i].start);
              class_duration_array.push(result3.docs[i].duration);
              class_title_array.push(result3.docs[i].title);
            }
          }
          res.render('landing', {
            name: req.session.name, 
            email: req.session.email,
            picture: req.session.picture,
            showmodal: ((result1.docs.length == 0) && (result2.docs.length == 0)),
            class_id: class_id_array,
            class_start: class_start_array,
            class_duration: class_duration_array,
            class_title: class_title_array
          });
        });
      });
    });
  });
}

///--- REMOTE LOGIN ---///
else {
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
  
  app.get("/protected", passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME), function(req, res) {
    var accessToken = req.session[bluemix_appid.WebAppStrategy.AUTH_CONTEXT].accessToken;
  
    bluemix_appid.UserAttributeManager.getAllAttributes(accessToken).then(function (attributes) {
      req.session.email = req.user.email;
      res.render('landing', {
          name: req.user.name, 
          email: req.user.email,
          picture: req.user.picture
      });
    });
  });
  
  app.get("/login", passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME, {successRedirect : '/protected', forceLogin: true}));
}

app.get('/',function(req,res) {
  res.sendfile(__dirname + '/views/index.html');
});

app.get('/fill_remove_update_classes_dropdown', function(req, res) {
  var url = cloudant_url + "/timetable_db/_design/timetable_db/_view/timetable_db";
  // timetable_db.find({selector:{user:'jake.spb@gmail.com'}}, function(er, result) {
  //   if (er) {
  //     throw er;
  //   }
   
  //   console.log('Found %d documents with name Alice', result.docs.length);
  //   for (var i = 0; i < result.docs.length; i++) {
  //     console.log('  Doc id: %s', result.docs[i].user);
  //   }
  // });
  request({
    url: url, 
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var user_data = body.rows;
      var list_of_classes = '[';
      var start_times_array = [];
      var durations_array = [];
      var titles_array = [];
      var descriptions_array = [];
      
      for(var i = 0; i < user_data.length; i++) {
        if(user_data[i].value[5] == ((req.session == null) ? "user@mail.com" : req.session.email)) {
          start_times_array.push(user_data[i].value[1]);
          durations_array.push(user_data[i].value[2]);
          titles_array.push(user_data[i].value[3]);
          descriptions_array.push(user_data[i].value[4]);
        }
      }

      for(var i = 0; i < titles_array.length; i++) {
        var json_block = 
        '{' + 
        '\"start\":\"' + start_times_array[i] + '\",' + 
        '\"duration\":\"' + durations_array[i] + '\",' + 
        '\"title\":\"' + titles_array[i] + '\",' + 
        '\"description\":\"' + descriptions_array[i] + '\"' + 
        '}';
        if(i !== 0) {
          list_of_classes = list_of_classes.concat(",");
        }
        list_of_classes = list_of_classes.concat(json_block);
      }

      list_of_classes = list_of_classes.concat("]");
      res.contentType('application/json');
      res.send(JSON.parse(list_of_classes));
    } else {
      console.log("No data from URL");
      console.log("Response is : " + response.statusCode);
      var class_string="{\"added\":\"DB read error\"}";
      res.contentType('application/json');
      res.send(JSON.parse(class_string));
    }
  });
});

app.get('/create_class',function(req, res) {
  var url = cloudant_url + "/timetable_db/_design/timetable_db/_view/timetable_db";
  var title_string;
  request({
    url: url,
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      console.log("Recived: " + JSON.stringify(req.query));
      req.query.user = ((req.session == null) ? "user@mail.com" : req.session.email);
      timetable_db.insert(req.query, function(err, data) {
        if (!err) {
          title_string="{\"added\":\"Yes\"}";

          var myPushNotifications = new PushNotifications(PushNotifications.Region.SYDNEY, "1e1125cd-32ed-4e96-bb35-ab62cb806322", "a5c93e43-91f2-405d-bbc0-2691a8fdbaaf");
          var message = PushMessageBuilder.Message.alert("New class has been scheduled: " + 
            req.query.start + ", " + 
            req.query.duration + ", " + 
            req.query.title
          ).build();
          var target = PushMessageBuilder.Target.userIds(((req.session == null) ? "user@mail.com" : req.session.email)).build();
          var notificationExample =  Notification.message(message).target(target).build();
          myPushNotifications.send(notificationExample, function(error, response, body) {
            console.log("Error: " + error);
            console.log("Response: " + JSON.stringify(response));
            console.log("Body: " + body);
          });
        }
        else {
          title_string="{\"added\":\"DB insert error\"}";
        }
        res.contentType('application/json');
        res.send(JSON.parse(title_string));
      });
    }
    else {
      title_string="{\"added\":\"DB read error\"}";
      res.contentType('application/json');
      res.send(JSON.parse(title_string));
    }
  });
});

app.get('/update_class',function(req, res) {
  console.log("Received : " + JSON.stringify(req.query));
  var url = cloudant_url + "/timetable_db/_design/timetable_db/_view/timetable_db";
  request({
    url: url, 
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      var class_string;
      var user_data = body.rows;
      var id_to_update;
      var rev_to_update;
      var total_rows = user_data.length;

      for (var i = 0; i < user_data.length; i++) {
         var doc = user_data[i];
        if (doc.value[1] === req.query.upd_start) {
          id_to_update = doc.key;
          rev_to_update = doc.value[0];
        }
      }

      var string_to_update = "{" + 
        "\"_id\":\"" + id_to_update + "\", " + 
        "\"_rev\":\"" + rev_to_update + "\", " + 
        "\"start\":\"" + req.query.upd_start + "\", " + 
        "\"duration\":\"" + req.query.upd_duration + "\", " + 
        "\"title\":\"" + req.query.upd_class_title + "\", " + 
        "\"description\":\"" + req.query.upd_class_description + "\"," + 
        "\"user\":\"" + ((req.session == null) ? "user@mail.com" : req.session.email) + "\"" + 
        "}";

      var update_obj = JSON.parse(string_to_update);
      if(total_rows !== 0) {
        timetable_db.insert(update_obj, function(err, data) {
          if(!err) {
            console.log("Updated doc.");
            var myPushNotifications = new PushNotifications(PushNotifications.Region.SYDNEY, "1e1125cd-32ed-4e96-bb35-ab62cb806322", "a5c93e43-91f2-405d-bbc0-2691a8fdbaaf");
            var message = PushMessageBuilder.Message.alert("Class has been updated: " + 
              req.query.upd_start + ", " + 
              req.query.upd_duration + ", " + 
              req.query.upd_class_title
            ).build();
            var notificationExample =  Notification.message(message).build();
            myPushNotifications.send(notificationExample, function(error, response, body) {
              console.log("Error: " + error);
              console.log("Response: " + JSON.stringify(response));
              console.log("Body: " + body);
            });
            class_string="{\"updated\":\"updated\"}";
            res.contentType('application/json');
            res.send(JSON.parse(class_string));
          } else {
            console.log("Couldn't update class " + err);
            class_string="{\"updated\":\"could not update\"}";
            res.contentType('application/json');
            res.send(JSON.parse(class_string));
          }
        });
      } else {
        console.log("DB is empty");
        var class_string="{\"updated\":\"empty database\"}";
        res.contentType('application/json');
        res.send(JSON.parse(class_string));
      }
    } else {
      console.log("No response from URL. Status : " + response.statusCode);
      class_string="{\"updated\":\"DB read error\"}";
      res.contentType('application/json');
      res.send(JSON.parse(class_string));
    }
  });
});

app.get('/remove_class',function(req, res) {
  console.log("Class to be removed : = " + req.query.start);
  var url = cloudant_url + "/timetable_db/_design/timetable_db/_view/timetable_db";
  request({
       url: url, 
       json: true
      }, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var class_string;
        var user_data = body.rows;
        var id_to_remove;
        var rev_to_remove;
        var total_rows = user_data.length;
        for(var i=0; i< user_data.length; i++) {
          var doc = user_data[i];
          if(doc.value[1] === req.query.start) {
            id_to_remove = doc.key;
            rev_to_remove = doc.value[0];
            break;
          }
        }
        if(total_rows !== 0) {
          timetable_db.destroy(id_to_remove, rev_to_remove, function(err) {
            if(!err) {
              console.log("Removed class");
              var myPushNotifications = new PushNotifications(PushNotifications.Region.SYDNEY, "1e1125cd-32ed-4e96-bb35-ab62cb806322", "a5c93e43-91f2-405d-bbc0-2691a8fdbaaf");
              var message = PushMessageBuilder.Message.alert("Class has been removed: " + 
                req.query.start + ", " + 
                req.query.duration + ", " + 
                req.query.title
              ).build();
              var notificationExample =  Notification.message(message).build();
              myPushNotifications.send(notificationExample, function(error, response, body) {
                console.log("Error: " + error);
                console.log("Response: " + JSON.stringify(response));
                console.log("Body: " + body);
              });
              class_string="{\"removed\":\"removed\"}";
              res.contentType('application/json');
              res.send(JSON.parse(class_string));
            } else {
              console.log("Couldn't remove class");
              console.log(err);
              class_string="{\"removed\":\"could not remove\"}";
              res.contentType('application/json');
              res.send(JSON.parse(class_string));
            }
          });
        }
        else
        {
          console.log("DB is empty");
          class_string="{\"removed\":\"empty database\"}";
          res.contentType('application/json');
          res.send(JSON.parse(class_string));
        }
      }
      else
      {
        console.log("No data from URL");
        console.log("Response is : " + response.statusCode);
        class_string="{\"removed\":\"DB read error\"}";
        res.contentType('application/json');
        res.send(JSON.parse(class_string));
      }
  });
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on http://localhost:" + port);
});
