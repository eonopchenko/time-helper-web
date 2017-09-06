const express = require("express");
const app = express();
const cfenv = require("cfenv");

/*
if (cfenv.getAppEnv().isLocal) {
   console.error('This sample should not work locally, please push the sample to Bluemix.');
   process.exit(1);
}
*/

app.use(express.static("views"));

app.get('/',function(req,res){
	res.sendfile(__dirname + '/views/index.html');
});

var appEnv = cfenv.getAppEnv();
app.listen(appEnv.port, '127.0.0.1', function() {
  console.log("server starting on " + appEnv.url);
});
