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
var lb_addr = '127.0.0.1:3000'
module.exports = function(default_docker_addr,lb_addr, opts) {
  var image = "ubuntu";
  if (!opts) opts = {}
  docker_hosts = default_docker_addr||'127.0.0.1:9090'
  var REDIS_ADDR = '127.0.0.1:6379'
  lb_addr = lb_addr || '127.0.0.1:3000'
  var server = root()
  var wss = new WebSocketServer({server:server})

  wss.on('connection', function(connection) {
    var req = connection.upgradeReq
    var uri = req.url.slice(11)
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
        console.log('find containers'+id)
        return pump(req, request('http://'+docker_hosts+'/containers/'+id), res)
    })
    //TODO check container is exist
  server.post('/runner/{imagename}',function(req,res){
      var image = req.params.imagename
      console.log("runner image is :"+image)
      req.on('json', function(body) {

          //find a instance
          var jsonData = {imagename:image}
          console.log(body)
          rest.postJson('http://'+lb_addr+'/api/dispatcher/v1.0/container/create',jsonData,{timeout:1000})
              .on('success',function(data){
                  console.log(data);
                  if(data == null || data == ""){
                      var result ={
                          status:6,
                          message:'服务器异常，请稍后重试'
                      }
                      return res.send(result)
                  }else{
                      if(data.Status ==3 && data.Instance != null ){
                          var url = 'http://'+data.Instance.ServerIP+':'+data.Instance.ServerPort+'/api/coderunner';
                          console.log(url)
                          //return pump(req, request(url), res)
                          rest.postJson(url,body,{timeout:800}).
                              on('success',function(result){
                                  res.send(result)
                              })
                              .on('error',function(err){
                                  console.log(err);
                                  var result= {
                                      status:6,
                                      message:"error"+err
                                  }
                                  return res.send(result)
                              })
                              .on('timeout',function(ms){
                                  //console.log('did not return within '+ms+' ms');
                                  var result ={
                                      status:4,
                                      message:"timeout"
                                  }
                                  return res.send(result)
                              })
                      }else{
                          var result ={
                              status:data.status,
                              message:'没有该镜像！'
                          }
                          return res.send(result)
                      }
                  }

              })
              .on('error',function(err){
                  console.log(err);
                  var result= {
                      status:6,
                      message:"error"+err
                  }
                  return res.send(result)
              })
              .on('timeout',function(ms){
                  //console.log('did not return within '+ms+' ms');
                  var result ={
                      status:4,
                      message:"timeout"
                  }
                  return res.send(result)
              })
          //res.send(body);
      });

      //rest.get('http://'+docker_hosts+'/findrunner/'+image,{timeout:800})
      //        .on('success',function(data){
      //            console.log(data);
      //            if(data == null || data == ""){
      //              rest.post('http://'+docker_hosts+'/createrunner/'+image,{timeout:800})
      //                      .on('success',function(data){
      //                          if(data.status ==3 && data.instances ){
      //                              var url = 'http://'+data.hosts+':'+data.instances.port+'/api/coderunner';
      //                              console.log(url)
      //                              return pump(req, request(url), res)
      //                          }else{
      //                              var result ={
      //                                  status:data.status,
      //                                  message:data.status_msg
      //                              }
      //                              return res.send(result)
      //                          }
      //                      })
      //                      .on('error',function(err){
      //                              var result ={
      //                                status:6,
      //                                message:"server error, retry"
      //                              }
      //                        return res.send(result)
      //                      })
      //                      .on('timeout',function(ms){
      //                              console.log('did not return within '+ms+' ms');
      //                              var result ={
      //                                status:4,
      //                                message:"timeout,retry"
      //                              }
      //                              return res.send(result)
      //                        })
      //            }else{
      //              if(data.status ==3 && data.instances ){
      //                 var url = 'http://'+data.hosts+':'+data.instances.port+'/api/coderunner';
      //                console.log(url)
      //                return pump(req, request(url), res)
      //              }else{
      //                              var result ={
      //                                  status:data.status,
      //                                  message:data.status_msg
      //                              }
      //                              return res.send(result)
      //              }
      //            }
      //
      //        })
      //        .on('error',function(err){
      //          console.log(err);
      //          var result= {
      //              status:6,
      //              message:"error"+err
      //          }
      //          return res.send(result)
      //        })
      //        .on('timeout',function(ms){
      //            console.log('did not return within '+ms+' ms');
      //            var result ={
      //              status:4,
      //              message:"timeout"
      //            }
      //            return res.send(result)
      //      })
  })
  server.get('/user/{userid}/{imagename}/{tag}',function(req,res){
      var userid = req.params.userid
      var imagename = req.params.imagename
      var tag = req.params.tag
      console.log(docker_hosts)
      return pump(req, request('http://'+docker_hosts+'/user/'+userid+'/'+imagename+'/'+tag), res)

  })
    server.get('/bundle.js', '/-/bundle.js')
    server.get('/index.html', '/-/index.html')
  //server.get('/containers/{id}','/-/index.html')


  return server
}
