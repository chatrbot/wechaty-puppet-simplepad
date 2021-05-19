# WECHATY-PUPPET-SIMPLEPAD

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-brightgreen.svg)](https://github.com/wechaty/wechaty)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)
![Stage](https://img.shields.io/badge/Stage-beta-yellow)

## 如何开始使用
1. clone我们的demo项目
```shell
$ git clone https://github.com/chatrbot/wechaty-puppet-simplepad-demo.git
```
2. 安装相应的依赖  
```shell
$ cd wechaty-puppet-simplepad-demo
$ npm install
```
3. 执行运行命令,把{YOUR_TOKEN}替换为您自己的token
```shell
$ npx ts-node ./bot.ts -t {YOUR_TOKEN}
```
> 更多信息可以阅读[wiki](https://github.com/chatrbot/wechaty-puppet-simplepad/wiki)和[demo](https://github.com/chatrbot/wechaty-puppet-simplepad-demo)的介绍.

## SimplePad的优势
- ### 架构清晰易懂
  SimplePad是以一套完整的Http协议接口为基础进行的Puppet实现.所有主动操作底层都是以Http调用为主,简单明了.
  消息接收使用了WebSocket,方便开发者能够在本地开发调试(在没有公网IP的情况下).

- ### 扩展方便快捷
  >- 如果您擅长的是Java/Python/Go等其他语言或者苦于Node的繁琐?
  >- 如果您只是想简单的使用Wechaty的某个功能?
  >- 如果您想快速集成相关功能到您已有的项目中?

  **我们有全套完整的Http协议的接口,只需要进行简单的Http调用即可实现您想要的功能.**

  >- 那么如何接收机器人收到的消息?

  **我们支持`Http回调`和`Websocket`两种方式,让您有轻松愉快的开发体验.**

- ### 提供快捷的操作后台
  在您获取到TOKEN后我们会提供一个快捷的操作后台,让你更为方便的管理自己的TOKEN,并且提供类Postman的接口调试工具来高效的开发和调试.

## PUPPET功能对比
SimplePad是目前功能最为完善,接口最为全面(支持Http协议调用),使用最为方便的Puppet实现之一.

Puppet|donut|wxwork|paimon|padlocal|simplepad👍
:---|:---:|:---:|:---:|:---:|:---:|
支持账号|个人微信|企业微信|个人微信|个人微信|个人微信
**<消息>**|
收发文本|✅|✅|✅|✅|✅
收发个人名片|✅|✅|✅|✅|✅
收发图文链接|✅|✅|✅|✅|✅
发送图片、文件|✅|✅|✅（较慢）|✅|✅
接收图片、文件|✅|✅|✅|✅|✅
发送视频|✅|✅|✅（较慢）|✅|✅
接收视频|✅|✅|✅|✅|✅
发送小程序|✅|✅|✅|✅|✅
接收动图|❌|✅|❌|✅|✅
发送动图|✅|✅|✅（以文件形式发送）|✅（以文件形式发送）|✅(以文件形式发送)
接收语音消息|✅|✅|❌|✅|✅
发送语音消息|❌|❌|❌|✅|✅
转发文本|✅|✅|✅|✅|✅
转发图片|✅|✅|✅|✅|✅
转发图文链接|✅|✅|❌|✅|✅
转发音频|✅|✅|❌|✅|✅
转发视频|✅|✅|✅|✅|✅
转发文件|✅|✅|✅|✅|✅
转发动图|❌|✅|❌|✅|✅
转发小程序|✅|✅|✅|✅|✅
**<群组>**|
创建群聊|✅|✅|✅|✅|✅
设置群公告|✅|✅|✅|✅|✅
获取群公告|❌|❌|✅|✅|✅
群二维码|❌|❌|❌|✅|✅
拉人进群|✅|✅|✅|✅|✅
踢人出群|✅|✅|✅|✅|✅
退出群聊|✅|❌|✅|✅|✅
改群名称|✅|✅|❌|✅|✅
入群事件|✅|✅|✅|✅|✅
离群事件|✅|✅|✅|✅|✅
群名称变更事件|✅|✅|❌|✅|✅
@群成员|✅|✅|✅|✅|✅
群列表|✅|✅|✅|✅|✅
群成员列表|✅|✅|✅|✅|✅
群详情|✅|✅|✅|✅|✅
**<联系人>**|
修改备注|✅|✅|❌|✅|✅
添加好友|✅|✅|❌|✅|✅
自动通过好友|✅|✅|✅|✅|✅
好友列表|✅|✅|✅|✅|✅
好友详情|✅|✅|✅|✅|✅
**<朋友圈(http协议)>**|
朋友圈列表|❌|❌|❌|❌|✅
朋友圈详情|❌|❌|❌|❌|✅
朋友圈点赞|❌|❌|❌|❌|✅
发送朋友圈|❌|❌|❌|❌|✅
删除朋友圈|❌|❌|❌|❌|✅
修改朋友圈背景图|❌|❌|❌|❌|✅
**<其他>**|
登录事件|✅|✅|✅|✅|✅
扫码状态|❌|❌|❌|✅|✅
登出事件|✅|✅|❌|✅|✅
主动退出登录|✅|❌|✅|✅|✅
依赖协议|Windows|Windows|iPad|iPad|iPad
