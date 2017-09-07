const express = require("express");
const session = require("express-session");
const passport = require("passport");
const bluemix_appid = require("bluemix-appid");
const app = express();
const helmet = require("helmet");
const express_enforces_ssl = require("express-enforces-ssl");
const cfEnv = require("cfenv");

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
  res.send('<p>test</p>');
});

app.get("/anon_login", passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME, {allowAnonymousLogin: true, successRedirect : '/protected', forceLogin: true}));
app.get("/login", passport.authenticate(bluemix_appid.WebAppStrategy.STRATEGY_NAME, {successRedirect : '/protected', forceLogin: true}));
app.get("/token", function(req, res) {
	res.render('token',{tokens: JSON.stringify(req.session[bluemix_appid.WebAppStrategy.AUTH_CONTEXT])});
});

var port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log("Listening on http://localhost:" + port);
});
