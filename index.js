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
var rest = require('restler')

var docker_hosts='127.0.0.1:9090'
module.exports = function(default_docker_addr, opts) {
  var image = "ubuntu";
  if (!opts) opts = {}
  docker_hosts = default_docker_addr||'127.0.0.1:9090'
  var REDIS_ADDR = '127.0.0.1:6379'
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
    server.get('/containers/{id}', function(req, res) {
        var id = req.params.id
        var container = containers.hasOwnProperty(id) && containers[id]
        if (!container) return res.error(404, 'Could not find container')
        //console.log(contain)
        return res.send({'ID':container.docker_run.id})
    })
    //TODO check container is exist
  server.post('/runner/{imagename}',function(req,res){
      var image = req.params.imagename
      console.log("runner image is :"+image)
      //find a instance
      rest.get('http://'+docker_hosts+'/findrunner/'+image,{timeout:200})
              .on('success',function(data){
                  console.log(data);
                  if(data == null || data == ""){
                    rest.post('http://'+docker_hosts+'/createrunner/'+image,{timeout:200})
                            .on('success',function(data){
                                if(data.status ==3 && data.instances.length >0 ){
                                    var url = 'http://'+data.hosts+':'+data.instances[0].port+'/api/coderunner';
                                    console.log(url)
                                    return pump(req, request(url), res)
                                }else{
                                    var result ={
                                        status:4,
                                        message:"need retry"
                                    }
                                    return res.send(result)
                                }
                            })
                            .on('error',function(err){
                                    var result ={
                                      status:4,
                                      message:"server error, retry"
                                    }
                              return res.send(result)
                            })
                            .on('timeout',function(ms){
                                    console.log('did not return within '+ms+' ms');
                                    var result ={
                                      status:4,
                                      message:"timeout,retry"
                                    }
                                    return res.send(result)
                              })
                  }else{
                    if(data.status ==3 && data.instances.length >0 ){
                       var url = 'http://'+data.hosts+':'+data.instances[0].port+'/api/coderunner';
                      console.log(url)
                      return pump(req, request(url), res)                     
                    }else{
                                    var result ={
                                      status:4,
                                      message:"need retry"
                                    }
                                    return res.send(result)                      
                    }
                  }

              })
              .on('error',function(err){
                console.log(err);
                return res.send(err)
              })
              .on('timeout',function(ms){
                  console.log('did not return within '+ms+' ms');
                  var result ={
                    status:4,
                    message:"timeout"
                  }
                  return res.send(result)
            })
      // return pump(req, request('http://'+docker_hosts+'/runner/'+image), res)

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
