#!/usr/bin/env node

var minimist = require('minimist')
var docker = require('./')

var argv = minimist(process.argv, {
  alias: {port:'p', docker:'d', help:'h'},
  default: {port:process.env.PORT || 8080}
})

var default_docker_addr = argv._[2]
var lb_addr = argv._[3]

if (argv.help|| !default_docker_addr || !lb_addr) {
  console.log('Usage: docker-browser-server default_docker_addr [options]')
  console.log()
  console.log('  --port,    -p  [8080]          (port to listen on)')
  console.log('  --docker,  -d  [$DOCKER_HOST]  (optional host of the docker daemon)')
  console.log('  --persist                      (allow persistance of /root in the containers)')
  console.log('')
  return process.exit(argv.help ? 0 : 1)
}

var server = docker(default_docker_addr, lb_addr,argv)

server.on('spawn', function(container) {
  console.log('Spawning new container (%s)', container.id)
})

server.on('kill', function(container) {
  console.log(container);
  console.log('Killing container (%s)', container.id)
})

server.on('listening', function() {
  console.log('Server is listening on port %d', server.address().port)
})

server.listen(argv.port)
