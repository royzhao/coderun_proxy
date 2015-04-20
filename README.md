Docker proxy
================
这个模块的作用是做代理转发请求
有如下几个api
#创建tty
```
代码位于index.js 103行
/user/{userid}/{imagename}/{tag}
这里需要对docker_hosts进行负载均衡
```
#运行代码请求
```
代码位于index.js 45行
/runner/{imagename}
目前流程如下
先使用/findrunner/查找到相应image的信息，
如果有相关容器运行，那么直接将请求转发到该容器中
如果没有则/createrunner/进行创建容器，创建成功之后则把请求转发到容器中
超时时间均为200ms

负载均衡代码需要在上面进行修改
```
#运行
node bin.js default_docker_addr