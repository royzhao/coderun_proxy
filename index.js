#!/usr/bin/env node

var WebSocketServer = require('ws').Server
var request = require('request')
var websocket = require('websocket-stream')
var root = require('root')
var url = require('url')
var send = require('send')
var path = require('path')
var pump = require('pump')
var cors = require('cors')
var net = require('net')
var xtend = require('xtend')

var docker_hosts='docker2.peilong.me:9090'
module.exports = function(redis_addr, opts) {
  var image = "ubuntu";
  if (!opts) opts = {}

  var REDIS_ADDR = redis_addr ||'127.0.0.1:6379'
  var server = root()
  var wss = new WebSocketServer({server:server})

  wss.on('connection', function(connection) {
    var req = connection.upgradeReq
    var uri = req.url.slice(1)
      console.log(req.url)
      var stream = websocket(connection)
      var ws_url = 'ws://' + docker_hosts+'/'+uri;

      pump(stream, websocket(ws_url), stream,function(err){
        console.log(err)
          console.log('error in create docker');
      })

  })

  server.all(cors())

    server.get('/-/*', function(req, res) {
        send(req, req.params.glob, {root:path.join(__dirname, 'web')}).pipe(res)
    })
    //TODO check container is exist
  server.post('/runner/{imagename}',function(req,res){
      var image = req.params.imagename
      console.log("runner image is :"+image)
      return pump(req, request('http://'+docker_hosts+'/runner/'+image), res)

  })
  server.get('/user/{userid}/{imagename}/{tag}',function(req,res){
      var userid = req.params.userid
      var imagename = req.params.imagename
      var tag = req.params.tag
      return pump(req, request('http://'+docker_hosts+'/user/'+userid+'/'+imagename+'/'+tag), res)

  })
    server.get('/bundle.js', '/-/bundle.js')
    server.get('/index.html', '/-/index.html')
  //server.get('/containers/{id}','/-/index.html')


  return server
}
