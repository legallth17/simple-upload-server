#!/bin/env node

var express = require('express');
var fs = require('fs-extra');
var serveIndex = require('serve-index');

var ipaddress = process.env.SERVER_IP || '0.0.0.0';
var port      = process.env.SERVER_PORT || 8080;
var fqdn      = process.env.SERVER_FQDN;
var uploadDir = process.env.UPLOAD_DIR || './data'

// ensure upload directory does exist


fs.mkdirsSync(uploadDir);

// Create and configure server

var app = express();

app.get('/', function(req, res) {
  res.redirect("/info");
});

app.get('/info', function(req, res) {
  res.send("simple upload server");
});

app.use('/files', express.static(uploadDir));
app.use('/files', serveIndex(uploadDir, {icons: true,view:'details'}))

app.post('/upload/content/:folder', function(req, res) {

  console.log("upload = query: "+JSON.stringify(req.query));
  var folder = req.params.folder || '';
  var fileDir = uploadDir+'/'+folder;
  // Create directory if it does not exist
  fs.mkdirsSync(fileDir);
  // create file ID from date
  var fileId = (new Date()).toISOString().slice(0,19).replace(/[-:]/g,"");
  var fileName = "file-"+fileId;
  var fileData     = fs.createWriteStream(fileDir+'/'+fileName+".data");
  var fileMetadata = fs.createWriteStream(fileDir+'/'+fileName+".info");
  // write headers and query parameters in metada file
  var metaData = JSON.stringify({ query: req.query, headers: req.headers},null,4)
  fileMetadata.write(metaData);
  // log metada
  console.log('== '+fileData.path+' ==\n'+metaData);
  // write body content in data file
  req.pipe(fileData)
  // ensure request is fully processed before returning response
  req.on('end',function() {
    res.location('/files/'+folder+'/'+fileName+'.data');
    res.status(201)
    res.send('ok');
    //res.end() does not work 
  })
});

// Termination handlers

var terminator = function(sig){
    if (typeof sig === "string") {
         console.log('%s: Received %s - terminating Node server ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
};


//  Process on exit and signals.
process.on('exit', function() { terminator(); });

// Removed 'SIGPIPE' from the list - bugz 852598.
['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
 'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
].forEach(function(element, index, array) {
  process.on(element, function() { terminator(element); });
});

// Start server

app.listen(port, ipaddress, function() {
    console.log('%s: Node server started on %s:%d ...',
        Date(Date.now() ), ipaddress, port);
});