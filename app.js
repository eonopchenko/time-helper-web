const express = require("express");
const session = require("express-session");
const passport = require("passport");
const bluemix_appid = require("bluemix-appid");
const app = express();
const helmet = require("helmet");
const express_enforces_ssl = require("express-enforces-ssl");
const cfEnv = require("cfenv");

const GUEST_USER_HINT = "A guest user started using the app. App ID created a new anonymous profile, where the user’s selections can be stored.";
const RETURNING_USER_HINT = "An identified user returned to the app with the same identity. The app accesses his identified profile and the previous selections that he made.";
const NEW_USER_HINT = "An identified user logged in for the first time. Now when he logs in with the same credentials from any device or web client, the app will show his same profile and selections.";

const LOGIN_URL = "/ibm/bluemix/appid/login";
const CALLBACK_URL = "/ibm/bluemix/appid/callback";

if (cfEnv.getAppEnv().isLocal) {
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

app.get('/',function(req,res){
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
    // res.send('<p>' + req.user.name + '</p>' + '<p>' + req.user.email + '</p>' + '<img src="' + req.user.picture + '"/>');
  });
});

app.get("/login", passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME, {successRedirect : '/protected', forceLogin: true}));

var port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log("Listening on http://localhost:" + port);
});
