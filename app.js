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
const Promise = require('promise');
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
var cloudant_instance = сloudant({url: cloudant_url, plugin: 'promises'});
lecturer_timetable_db = cloudant_instance.db.use('lecturer_timetable_db');
student_timetable_db = cloudant_instance.db.use('student_timetable_db');

app.use(helmet());
app.use(helmet.noCache());

///--- PUSH NOTIFICATIONS ---///
var myPushNotifications = new PushNotifications(PushNotifications.Region.SYDNEY, "1e1125cd-32ed-4e96-bb35-ab62cb806322", "a5c93e43-91f2-405d-bbc0-2691a8fdbaaf");

///--- LOCAL LOGIN (for Debug purposes only!) ---///
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
    req.session.email = "lecturer@mail.com";
    req.session.picture = "https://cdn1.iconfinder.com/data/icons/mix-color-4/502/Untitled-1-512.png";
    req.session.permission = "lecturer";

    /// 0 - not registered yet, 1 - student, 2 - lecturer
    var class_id_array = new Array();
    var class_start_array = new Array();
    var class_duration_array = new Array();
    var class_title_array = new Array();
    var enrolled_class_array = new Array();

    /// Set user permissions, depending on database content (at least 1 record in lecturer_timetable_db - lecturer,
    /// at least 1 record in student_timetable_db - student)
    student_timetable_db.find({selector:{studentId:req.session.email}}, function(er1, result1) {
      lecturer_timetable_db.find({selector:{lecturerId:req.session.email}}, function(er2, result2) {
        lecturer_timetable_db.find({selector:{}}, function(er3, result3) {
          if (result3.docs.length != 0) {
            for (var i = 0; i < result3.docs.length; i++) {
              class_id_array.push(result3.docs[i]._id);
              class_start_array.push(result3.docs[i].start);
              class_duration_array.push(result3.docs[i].duration);
              class_title_array.push(result3.docs[i].title);
              var enrolled = false;
              for (var j = 0; j < result1.docs.length; j++) {
                if (result3.docs[i]._id == result1.docs[j].classId) {
                  enrolled = true;
                  break;
                }
              }
              enrolled_class_array.push(enrolled ? "checked" : "");
            }
          }

          if (result1.docs.length != 0) {
            req.session.permission = "student";
          }

          res.render('landing', {
            name: req.session.name, 
            email: req.session.email,
            picture: req.session.picture,
            showmodal: ((result1.docs.length == 0) && (result2.docs.length == 0)),
            class_id: class_id_array,
            class_start: class_start_array,
            class_duration: class_duration_array,
            class_title: class_title_array,
            enrolled_class: enrolled_class_array,
            permission: req.session.permission
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

      req.session.name = req.user.name;
      req.session.email = req.user.email;
      req.session.picture = req.user.picture;
      req.session.permission = "lecturer";

      /// 0 - not registered yet, 1 - student, 2 - lecturer
      var class_id_array = new Array();
      var class_start_array = new Array();
      var class_duration_array = new Array();
      var class_title_array = new Array();
      var enrolled_class_array = new Array();

      /// Retrieve data from database
      student_timetable_db.find({selector:{studentId:req.session.email}}, function(er1, result1) {
        lecturer_timetable_db.find({selector:{lecturerId:req.session.email}}, function(er2, result2) {
          lecturer_timetable_db.find({selector:{}}, function(er3, result3) {
            if (result3.docs.length != 0) {
              for (var i = 0; i < result3.docs.length; i++) {
                class_id_array.push(result3.docs[i]._id);
                class_start_array.push(result3.docs[i].start);
                class_duration_array.push(result3.docs[i].duration);
                class_title_array.push(result3.docs[i].title);
                var enrolled = false;
                for (var j = 0; j < result1.docs.length; j++) {
                  if (result3.docs[i]._id == result1.docs[j].classId) {
                    enrolled = true;
                    break;
                  }
                }
                enrolled_class_array.push(enrolled ? "checked" : "");
              }
            }

            if (result1.docs.length != 0) {
              req.session.permission = "student";
            }

            /// Render landing page, depending on retrieved data
            res.render('landing', {
              name: req.session.name, 
              email: req.session.email,
              picture: req.session.picture,
              showmodal: ((result1.docs.length == 0) && (result2.docs.length == 0)),
              class_id: class_id_array,
              class_start: class_start_array,
              class_duration: class_duration_array,
              class_title: class_title_array,
              enrolled_class: enrolled_class_array,
              permission: req.session.permission
            });
          });
        });
      });
    });
  });

  app.get("/login", passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME, {successRedirect : '/protected', forceLogin: true}));
}

app.get('/',function(req,res) {
  res.sendfile(__dirname + '/views/index.html');
});

/// Login as a lecturer
app.get('/login_lecturer',function(req, res) {
  var url = cloudant_url + "/lecturer_timetable_db/_design/lecturer_timetable_db/_view/lecturer_timetable_db";
  request({
    url: url, 
    json: true
  }, function (error, response, body) {
    res.contentType('application/json');
    res.send(JSON.parse("{\"success\":\"true\"}"));
  });
});

/// Login as a student (check, whether classes must be added or removed and update enrolled classes list)
app.get('/login_student',function(req, res) {
  var classesToRemove = req.query.removed_classes && req.query.removed_classes.length;
  var classesToAdd = req.query.added_classes && req.query.added_classes.length;

  if (classesToRemove || classesToAdd) {
    if (classesToRemove) {
      array = [];
      var classesLeft = req.query.removed_classes.length;
      req.query.removed_classes.forEach(function(data) {
        student_timetable_db.find({selector:{studentId:req.session.email, classId:data}}, function(er, result) {
          student_timetable_db.destroy(result.docs[0]._id, result.docs[0]._rev, function(err) {
            if (--classesLeft === 0) {
              if (classesToAdd) {
                var array = new Array();
                for (var i = 0; i < req.query.added_classes.length; i++) {
                  array.push({"studentId": req.session.email, "classId": req.query.added_classes[i]});
                }

                student_timetable_db.bulk({docs:array}, function(err, data) {
                  res.contentType('application/json');
                  res.send(JSON.parse("{\"success\":\"true\"}"));
                });
              } else {
                res.contentType('application/json');
                res.send(JSON.parse("{\"success\":\"true\"}"));
              }
            }
          });
        });
      });
    }

    if (!classesToRemove && classesToAdd) {
        var array = new Array();
        for (var i = 0; i < req.query.added_classes.length; i++) {
          array.push({"studentId": req.session.email, "classId": req.query.added_classes[i]});
        }

        student_timetable_db.bulk({docs:array}, function(err, data) {
          res.contentType('application/json');
          res.send(JSON.parse("{\"success\":\"true\"}"));
          return;
        });
      }
    } else {
      res.contentType('application/json');
      res.send(JSON.parse("{\"success\":\"true\"}"));
    }
});

/// Initial setting of dropdown lists
app.get('/fill_schedule_table', function(req, res) {
  if (req.session.permission == "student") {
    student_timetable_db.find({selector:{studentId:req.session.email}}, function(er, result1) {
      var obj_array = new Array();
      var ids = new Array();
      for (var i = 0; i < result1.docs.length; i++) {
        ids.push(result1.docs[i].classId);
      }

      lecturer_timetable_db.find({selector:{}}, function(er, result2) {
        if (result2) {
          for (var i = 0; i < result2.docs.length; i++) {
            for (var j = 0; j < ids.length; j++) {
              if (ids[j] == result2.docs[i]._id) {
                obj_array.push(result2.docs[i]);
              }
            }
          }
        }
        res.send(obj_array);
      });
    });
  } else if (req.session.permission == "lecturer") {
    lecturer_timetable_db.find({selector:{lecturerId:req.session.email}}, function(er, result) {
      var obj_array = new Array();
      var ids = new Array();
      for (var i = 0; i < result.docs.length; i++) {
        obj_array.push(result.docs[i]);
      }
      res.send(obj_array);
    });
  }
});

/// Lecturer - new class creation
app.get('/create_class',function(req, res) {
  var url = cloudant_url + "/lecturer_timetable_db/_design/lecturer_timetable_db/_view/lecturer_timetable_db";
  var title_string;
  request({
    url: url,
    json: true
  }, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      req.query.lecturerId = req.session.email;
      lecturer_timetable_db.insert(req.query, function(err, data) {
        if (!err) {
          title_string="{\"added\":\"Yes\"}";

          /// Notify all studetns, registered in the database
          var message = PushMessageBuilder.Message.alert("New class has been scheduled: " + 
            req.query.start + ", " + 
            req.query.duration + ", " + 
            req.query.title
          ).build();
          var notificationExample =  Notification.message(message).build();
          myPushNotifications.send(notificationExample, function(error, response, body) {
          });
        } else {
          title_string="{\"added\":\"DB insert error\"}";
        }
        res.contentType('application/json');
        res.send(JSON.parse(title_string));
      });
    } else {
      title_string="{\"added\":\"DB read error\"}";
      res.contentType('application/json');
      res.send(JSON.parse(title_string));
    }
  });
});

/// Lecturer - class update
app.get('/update_class',function(req, res) {
  var url = cloudant_url + "/lecturer_timetable_db/_design/lecturer_timetable_db/_view/lecturer_timetable_db";
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
        if ((doc.value[1] === req.query.upd_start) && (doc.value[5] === req.session.email)) {
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
        "\"lecturerId\":\"" + req.session.email + "\"," + 
        "\"lat\":\"" + req.query.upd_lat + "\"," + 
        "\"lng\":\"" + req.query.upd_lng + "\"," + 
        "\"venue\":\"" + req.query.upd_venue + "\"" + 
        "}";

      var update_obj = JSON.parse(string_to_update);
      if (total_rows !== 0) {
        lecturer_timetable_db.insert(update_obj, function(err, data) {
          if (!err) {
            student_timetable_db.find({selector:{classId:id_to_update}}, function(er, result) {
              
              var message = PushMessageBuilder.Message.alert("Class has been updated: " + 
                req.query.upd_start + ", " + 
                req.query.upd_duration + ", " + 
                req.query.upd_class_title
              ).build();

              if (!er) {
                if (result && result.docs && (result.docs.length != 0)) {
                  var ids = new Array();
                  for (var i = 0; i < result.docs.length; i++) {
                    ids.push(result.docs[i].studentId);
                  }
                  var target = PushMessageBuilder.Target.userIds(ids).build();
                  var notificationExample =  Notification.message(message).target(target).build();
                  myPushNotifications.send(notificationExample, function(error, response, body) {
                  });
                }
                class_string="{\"updated\":\"updated\"}";
                res.contentType('application/json');
                res.send(JSON.parse(class_string));
              }
            });
          } else {
            class_string="{\"updated\":\"could not update\"}";
            res.contentType('application/json');
            res.send(JSON.parse(class_string));
          }
        });
      } else {
        var class_string="{\"updated\":\"empty database\"}";
        res.contentType('application/json');
        res.send(JSON.parse(class_string));
      }
    } else {
      class_string="{\"updated\":\"DB read error\"}";
      res.contentType('application/json');
      res.send(JSON.parse(class_string));
    }
  });
});

// Lecturer - class removal
app.get('/remove_class',function(req, res) {
  var url = cloudant_url + "/lecturer_timetable_db/_design/lecturer_timetable_db/_view/lecturer_timetable_db";
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
        for (var i=0; i< user_data.length; i++) {
          var doc = user_data[i];
          if (doc.value[1] === req.query.start) {
            id_to_remove = doc.key;
            rev_to_remove = doc.value[0];
            break;
          }
        }
        if (total_rows !== 0) {
          lecturer_timetable_db.destroy(id_to_remove, rev_to_remove, function(err) {
            if (!err) {
              student_timetable_db.find({selector:{classId:id_to_remove}}, function(er, result) {

                var message = PushMessageBuilder.Message.alert("Class has been updated: " + 
                  req.query.start + ", " + 
                  req.query.duration + ", " + 
                  req.query.title
                ).build();

                if (!er) {
                  if (result && result.docs && (result.docs.length != 0)) {
                    var ids = new Array();
                    for (var i = 0; i < result.docs.length; i++) {
                      ids.push(result.docs[i].studentId);
                    }
                    var target = PushMessageBuilder.Target.userIds(ids).build();
                    var notificationExample =  Notification.message(message).target(target).build();
                    myPushNotifications.send(notificationExample, function(error, response, body) {
                    });
                  }
                  class_string="{\"removed\":\"removed\"}";
                  res.contentType('application/json');
                  res.send(JSON.parse(class_string));
                }
              });
            } else {
              class_string="{\"removed\":\"could not remove\"}";
              res.contentType('application/json');
              res.send(JSON.parse(class_string));
            }
          });
        } else {
          class_string="{\"removed\":\"empty database\"}";
          res.contentType('application/json');
          res.send(JSON.parse(class_string));
        }
      } else {
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
