import {
    ContactGender,
    ContactPayload,
    ContactType,
    FileBox,
    FriendshipPayload,
    FriendshipType,
    ImageType,
    log,
    MessagePayload,
    MessageType,
    MiniProgramPayload,
    PayloadType,
    Puppet,
    PuppetOptions,
    RoomInvitationPayload,
    RoomMemberPayload,
    RoomPayload,
    ScanStatus,
    UrlLinkPayload
} from 'wechaty-puppet'
import {
    ChatroomMember,
    ChatroomNotify,
    Contact,
    Label,
    Message,
    MessageRevokeInfo,
    ReceiveData,
    ReportType,
    SendMessageResponse,
    SimplePadMessageType,
    User
} from './simplepad/defined'
import { isRoomId } from './simplepad/utils/is-helper'
import SimplePadClient from './simplepad/client/simplePadClient'
import { CacheManager, RoomMemberMap } from './simplepad/cache-manager'
import SimplePadAPI from './simplepad/client/api'
import WebSocket from 'ws'
import { ParseRawToMessagePayload } from './simplepad/parser/payload/parser-raw-payload'
import { LogLevelName } from 'brolog/src/brolog'
import { parseMessage } from './simplepad/parser/event'
import { MessageCategory } from './simplepad/parser/event/parser-event-type'
import { MiniProgramXmlSchema } from './simplepad/parser/message/message-miniprogram'
import { clearEscapeFlag } from './simplepad/utils/string'
import { xmlToJson } from './simplepad/utils/xml-to-json'
import { appMessageParser } from './simplepad/parser/message/message-app'
import { JSONParse } from './simplepad/utils/json-parse'
import { emotionPayloadParser } from './simplepad/parser/message/message-emotion'
import { FileBoxType } from 'file-box'
import path from 'path'
import { FileBoxJsonObjectUrl } from 'file-box/src/file-box.type'

const PRE = '[PuppetSimplePad]'

const logLevel = process.env.SIMPLEPAD_LOG || process.env.WECHATY_LOG || 'info'
log.level(logLevel.toLowerCase() as LogLevelName)
log.silly(PRE, 'set level to %s', logLevel)

class PuppetSimplePad extends Puppet {
    private _ws?: WebSocket
    private _self?: User
    private _client: SimplePadClient
    private _cacheMgr?: CacheManager
    private _heartbeatTimer?: NodeJS.Timeout

    constructor(options: PuppetOptions) {
        super(options)

        const token =
            this.options.token ||
            (process.env.WECHATY_PUPPET_SIMPLEPAD_TOKEN as string)
        if (!token) {
            log.error(
                'PuppetSimplePad',
                `

      WECHATY_PUPPET_SIMPLEPAD_TOKEN environment variable not found.

      SimplePad need a token before it can be used,
      Please set WECHATY_PUPPET_SIMPLEPAD_TOKEN then retry again.

    `
            )
            throw new Error(
                'You need a valid WECHATY_PUPPET_SIMPLEPAD_TOKEN to use PuppetSimplePad'
            )
        }
        this.options.token = token
        this._client = new SimplePadAPI(token)
    }

    async start(): Promise<void> {
        await this.startClient()
    }

    private async startClient() {
        if (this.state.on()) {
            log.warn(
                PRE,
                'start() is called on a ON puppet. await ready(on) and return.'
            )
            return
        }
        await this.state.on(true)

        const online = await this._client.GetOnlineStatus()
        log.info(PRE, 'online status:%s', online)
        if (!online) {
            this.manualLogin()
            return
        }
        await this.login()
    }

    // manualLogin 未登录,重新扫码登录
    private manualLogin() {
        this._client
            .GetQRCode()
            .then((data) => {
                this.emit('scan', {
                    status: ScanStatus.Waiting,
                    qrcode: data.qrcode
                })
            })
            .then(() => {
                const QRStatus = {
                    Waiting: 0,
                    Scanned: 1,
                    Confirmed: 2,
                    Cancel: 4,
                    Timeout: 5
                }
                const statusMap = {
                    [QRStatus.Waiting]: ScanStatus.Waiting,
                    [QRStatus.Scanned]: ScanStatus.Scanned,
                    [QRStatus.Confirmed]: ScanStatus.Confirmed,
                    [QRStatus.Cancel]: ScanStatus.Cancel,
                    [QRStatus.Timeout]: ScanStatus.Timeout
                }
                const checkTimer = setInterval(() => {
                    this._client.CheckScanStatus().then((data) => {
                        this.emit('scan', { status: statusMap[data.status] })

                        if (
                            data.status === QRStatus.Confirmed ||
                            data.status === QRStatus.Cancel ||
                            data.status === QRStatus.Timeout
                        ) {
                            clearInterval(checkTimer)
                        }

                        // 二维码过期或取消扫码重新获取
                        if (
                            data.status === QRStatus.Timeout ||
                            data.status === QRStatus.Cancel
                        ) {
                            this.manualLogin()
                            return
                        }

                        if (data.status === QRStatus.Confirmed) {
                            this._client.Login().then(async () => {
                                await new Promise((r) => setTimeout(r, 1000))
                                await this.login()
                            })
                        }
                    })
                }, 3000)
            })
    }

    protected async login(): Promise<void> {
        await this.initSelf()

        if (!this._self) {
            throw new Error('this._self not init')
        }
        const userId = this._self.userName
        await super.login(userId)

        const url = this._client.GetWebSocketServerURL()

        this._cacheMgr = new CacheManager(userId)
        await this._cacheMgr.init()
        await this.initContacts()

        this._ws = new WebSocket(url)
        this.registerWebSocketListeners(url)
    }

    // registerWebSocketListeners 注册推送信息的监听事件
    private registerWebSocketListeners(url: string) {
        this._ws?.on('open', () => {
            log.info(PRE, 'websocket连接成功')
            if (this._heartbeatTimer) {
                clearInterval(this._heartbeatTimer)
            }
            this._heartbeatTimer = setInterval(() => {
                this._ws?.send('ping')
            }, 10000)
        })
        this._ws?.on('message', async (recv: WebSocket.Data) => {
            if (typeof recv === 'string') {
                if (recv === 'pong') {
                    return
                }
                log.verbose('recv', recv)
                try {
                    const recvData = JSONParse(recv)
                    // 接收到的各种推送消息
                    if (recvData.data.reportMsgType === ReportType.Message) {
                        const msg = (recvData as ReceiveData<Message>).data
                        const messageId = msg.newMsgId
                        const { category, payload } = await parseMessage(
                            this,
                            msg
                        )
                        switch (category) {
                            case MessageCategory.NormalMessage:
                                this._cacheMgr?.setMessage(messageId, msg)
                                this.emit('message', { messageId })
                                break
                            case MessageCategory.Friendship:
                                this._cacheMgr?.setFriendshipRawPayload(
                                    messageId,
                                    payload
                                )
                                this.emit('friendship', {
                                    friendshipId: messageId
                                })
                                break
                            case MessageCategory.RoomInvite:
                                this._cacheMgr?.setRoomInvitation(
                                    messageId,
                                    payload
                                )
                                this.emit('room-invite', {
                                    roomInvitationId: messageId
                                })
                                break
                            case MessageCategory.RoomJoin:
                                this.emit('room-join', payload)
                                break
                            case MessageCategory.RoomLeave:
                                this.emit('room-leave', payload)
                                break
                            case MessageCategory.RoomTopic:
                                this.emit('room-topic', payload)
                                break
                        }
                    }

                    // 接收到的群信息变更消息,更新群信息
                    if (
                        recvData.data.reportMsgType ===
                        ReportType.ChatroomNotify
                    ) {
                        const notify = (recvData as ReceiveData<ChatroomNotify>)
                            .data
                        const room = await this._cacheMgr?.getRoom(
                            notify.userName
                        )
                        if (room) {
                            room.nickName = notify.nickName
                            room.smallHeadImgUrl = notify.smallHeadImgUrl
                            room.bigHeadImgUrl = notify.bigHeadImgUrl
                            room.chatRoomOwner = notify.chatroomOwner
                            if (
                                room.chatroomVersion != notify.chatroomVersion
                            ) {
                                log.verbose(
                                    `群信息更新:${room.userName} ${room.nickName}`
                                )
                                room.chatroomVersion = notify.chatroomVersion

                                const members =
                                    await this._cacheMgr!.getRoomMember(
                                        notify.userName
                                    )
                                log.verbose(
                                    `群成员信息变动:${JSON.stringify(members)}`
                                )
                                if (members) {
                                    // 有新成员加入或群内成员信息更新
                                    if (
                                        notify.chatroomMembers.length >=
                                        Object.keys(members).length
                                    ) {
                                        const newMembers =
                                            await this._client.GetChatroomMemberDetail(
                                                notify.userName,
                                                notify.chatroomVersion
                                            )
                                        log.verbose(
                                            `NewMembersInfo:${JSON.stringify(
                                                newMembers
                                            )}`
                                        )
                                        newMembers.memberList.map((member) => {
                                            members[member.userName] = member
                                        })
                                        this._cacheMgr?.setRoomMember(
                                            notify.userName,
                                            members
                                        )
                                        await this.dirtyPayload(
                                            PayloadType.RoomMember,
                                            room.userName
                                        )
                                    }

                                    // 有成员退出
                                    if (
                                        notify.chatroomMembers.length <
                                        Object.keys(members).length
                                    ) {
                                        const newMembers: RoomMemberMap = {}
                                        notify.chatroomMembers.map((m) => {
                                            const oldMember =
                                                members[m.userName]
                                            if (oldMember) {
                                                newMembers[oldMember.userName] =
                                                    oldMember
                                            }
                                        })
                                        this._cacheMgr?.setRoomMember(
                                            notify.userName,
                                            newMembers
                                        )
                                    }
                                }
                            }
                            await this._updateContactCache(room)
                        }
                    }
                } catch (err) {
                    log.error(`解析JSON数据失败:${err},数据:${recv}`)
                }
            }
        })
        this._ws?.on('close', async () => {
            this._heartbeatTimer && clearInterval(this._heartbeatTimer)
            while (true) {
                if (!this.state.on()) {
                    break
                }
                try {
                    this._ws = new WebSocket(url)
                    log.info('websocket重连成功')
                    return
                } catch (err) {
                    log.error(PRE, '重连websocket失败:%s,将在5秒后重试', err)
                    await new Promise((r) => setTimeout(r, 5000))
                }
            }
            log.info(PRE, 'websocket连接关闭')
        })
        this._ws?.on('error', (err) => {
            log.error(PRE, 'websocket发生错误:%s', err)
        })
    }

    private async initSelf() {
        this._self = await this._client.GetSelfInfo()
    }

    // 初始化联系人信息,roomSeq,contactSeq为列表序号
    private async initContacts(roomSeq = 0, contactSeq = 0) {
        const count = await this._cacheMgr?.getContactCount()
        // 联系人信息只有自己
        if (!count || count === 1) {
            log.info('开始同步联系人信息')
            const initData = await this._client.InitContact(roomSeq, contactSeq)
            if (initData.isContinue) {
                await this.initContacts(
                    initData.currentChatRoomContactSeq,
                    initData.currentWxContactSeq
                )
            }
            const contacts = await this._client.GetContactListDetail(
                initData.userNameList
            )
            await contacts.map(async (contact) => {
                await this._updateContactCache(contact)
            })
            return
        }
        log.info(
            '联系人信息已缓存在本地,联系人总数为:',
            (await this.contactList()).length
        )
    }

    /**
     * 联系人管理
     */

    // 获取/设置用户备注
    contactAlias(contactId: string): Promise<string>
    contactAlias(contactId: string, alias: string | null): Promise<void>
    async contactAlias(
        contactId: string,
        alias?: string | null
    ): Promise<void | string> {
        if (contactId === this._self?.userName) {
            log.warn(PRE, '备注对象不能是自己')
            return
        }
        const contact = await this.contactRawPayload(contactId)
        if (!contact) {
            return
        }
        if (alias) {
            this._client
                ?.UpdateContactRemark(contactId, alias || '')
                .then(async () => {
                    contact.remark = alias
                    await this._updateContactCache(contact)
                })
        } else {
            return contact.remark
        }
    }

    // 获取好友头像/修改自己头像
    contactAvatar(contactId: string): Promise<FileBox>
    contactAvatar(contactId: string, file: FileBox): Promise<void>
    async contactAvatar(
        contactId: string,
        file?: FileBox
    ): Promise<FileBox | void> {
        if (contactId === this._self?.userName && file) {
            if (file.type() === FileBoxType.Url) {
                const obj = file.toJSON() as FileBoxJsonObjectUrl
                this._client.UploadHeadImage(obj.remoteUrl).then((images) => {
                    if (this._self) {
                        this._self.smallHeadImgUrl = images.smallHeadImageUrl
                        this._self.bigHeadImgUrl = images.bigHeadImageUrl
                    }
                })
                return
            }
            if (file.type() === FileBoxType.File) {
                const data = await this._client.UploadFile(file)
                this._client.UploadHeadImage(data.url).then((images) => {
                    if (this._self) {
                        this._self.smallHeadImgUrl = images.smallHeadImageUrl
                        this._self.bigHeadImgUrl = images.bigHeadImageUrl
                    }
                })
                return
            }
            log.warn(PRE, 'contactAvatar目前只支持网络图片和本地文件')
        }

        const contact = await this._cacheMgr?.getContact(contactId)
        if (contact) {
            return FileBox.fromUrl(contact.bigHeadImgUrl)
        }
    }

    // 这里拿到的联系人列表可能会包含群成员
    async contactList(): Promise<string[]> {
        if (!this._cacheMgr) {
            throw new Error('cacheMgr not init')
        }
        const list: string[] = []
        const contactList = await this._cacheMgr.getAllContacts()
        contactList.map((contact) => {
            if (!contact.isChatroomMember) {
                list.push(contact.userName)
            }
        })
        return list
    }

    protected async contactRawPayload(
        id: string
    ): Promise<Contact | undefined> {
        return this._getContactOrRoom(id)
    }

    protected async contactRawPayloadParser(
        contact: Contact
    ): Promise<ContactPayload> {
        return {
            avatar: contact.bigHeadImgUrl,
            gender: contact.sex,
            id: contact.userName,
            name: contact.nickName,
            alias: contact.alias,
            phone: [],
            type: ContactType.Unknown,
            friend: !contact.isChatroomMember
        }
    }

    async contactSelfName(name: string): Promise<void> {
        this._client.ModifyNickName(name).then(() => {
            if (this._self) {
                this._self.nickName = name
            }
        })
    }

    async contactSelfQRCode(): Promise<string> {
        if (!this._self) {
            return ''
        }
        const qrData = await this._client.GetSelfQRCode(this._self.userName)
        return qrData.qrCode
    }

    async contactSelfSignature(signature: string): Promise<void> {
        await this._client.ModifySignature(signature)
    }

    async deleteContact(userName: string): Promise<void> {
        try {
            await this._client.DeleteContact(userName)
            this._cacheMgr?.deleteContact(userName)
        } catch (err) {
            log.error('删除联系人失败', err)
        }
    }

    ding(data?: string): void {
        log.info('call ding func', data)
    }

    /**
     * 好友关系处理
     */

    async friendshipAccept(friendshipId: string): Promise<void> {
        const friendship = await this._cacheMgr?.getFriendshipRawPayload(
            friendshipId
        )
        if (!friendship) {
            throw new Error('no friendship message')
        }
        if (friendship.type === FriendshipType.Receive) {
            await this._client.VerifyFriendApply(friendship.ticket)
        }
    }

    async friendshipAdd(contactId: string, hello?: string): Promise<void> {
        const contact = await this._getContactOrRoom(contactId)
        if (contact && contact.alias) {
            contactId = contact.alias
        }
        await this._client.ApplyNewContact(contactId, hello)
    }

    protected async friendshipRawPayload(
        friendshipId: string
    ): Promise<FriendshipPayload> {
        const friendship = await this._cacheMgr?.getFriendshipRawPayload(
            friendshipId
        )
        if (!friendship) {
            throw new Error(`找不到好友信息的原始数据: ${friendshipId}`)
        }
        return friendship
    }

    protected async friendshipRawPayloadParser(
        friendship: FriendshipPayload
    ): Promise<FriendshipPayload> {
        return friendship
    }

    async friendshipSearchPhone(phone: string): Promise<string | null> {
        return this._friendshipSearch(phone)
    }

    async friendshipSearchWeixin(weixin: string): Promise<string | null> {
        return this._friendshipSearch(weixin)
    }

    async _friendshipSearch(id: string): Promise<string | null> {
        let contact = await this._cacheMgr?.getContactSearch(id)
        if (!contact) {
            contact = await this._client.SearchContact(id)
            if (!contact) {
                return null
            }
            await this._cacheMgr?.setContactSearch(id, contact)
        }
        return contact.userName
    }

    /**
     * 消息发送,转发,下载
     */

    // 文件最大不能超过20m
    async messageFile(messageId: string): Promise<FileBox> {
        const message = await this.messageRawPayload(messageId)
        const messagePayload = await this.messageRawPayloadParser(message)

        log.verbose(PRE, `解析文件类型 ${messagePayload.type}`)

        switch (messagePayload.type) {
            case MessageType.Image:
                const imgUrl = await this._client?.DownloadImage(
                    messagePayload.text!
                )
                const imgeFileBox = FileBox.fromUrl(imgUrl)
                imgeFileBox.mimeType = 'image/jpeg'
                return imgeFileBox

            case MessageType.Audio:
                const voiceUrl = await this._client?.DownloadVoice(
                    messagePayload.text!,
                    messagePayload.id
                )
                const voiceFileBox = FileBox.fromUrl(voiceUrl)
                voiceFileBox.mimeType = 'audio/silk'
                return voiceFileBox

            case MessageType.Video:
                const videoUrl = await this._client?.DownloadVideo(
                    messagePayload.text!
                )
                const videoFileBox = FileBox.fromUrl(videoUrl)
                videoFileBox.mimeType = 'video/mp4'
                return videoFileBox

            case MessageType.Attachment:
                const attachPayload = await appMessageParser(message)
                const fileUrl = await this._client?.DownloadFileByKey(
                    attachPayload.appattach!.aeskey!,
                    attachPayload.appattach!.cdnattachurl!,
                    attachPayload.title
                )
                const fileBox = FileBox.fromUrl(fileUrl)
                fileBox.mimeType = 'application/octet-stream'
                return fileBox

            case MessageType.Emoticon:
                const emotionPayload = await emotionPayloadParser(message)
                const emoticonBox = FileBox.fromUrl(
                    emotionPayload.cdnurl,
                    `message-${messagePayload.id}-emotion.gif`
                )

                emoticonBox.metadata = emotionPayload
                emoticonBox.mimeType = 'emoticon'

                return emoticonBox

            case MessageType.MiniProgram:
                const miniProgramXml: MiniProgramXmlSchema = await xmlToJson(
                    messagePayload.text!
                )
                const appmsg = miniProgramXml.msg.appmsg
                const appattach = appmsg.appattach

                const thumbUrl = await this._client.DownloadImageByKey(
                    appattach.cdnthumbaeskey,
                    appattach.cdnthumburl
                )

                return FileBox.fromUrl(
                    thumbUrl,
                    `message-${messagePayload.id}-miniprogram-thumb.jpg`
                )

            case MessageType.Url:
                const appPayload = await appMessageParser(message)
                if (appPayload.thumburl) {
                    return FileBox.fromUrl(
                        appPayload.thumburl,
                        `message-${messagePayload.id}-url-thumb.jpg`
                    )
                }
        }
        throw new Error(`Can not get file for message: ${messageId}`)
    }

    // FIXME 不同分辨率的图片下载
    async messageImage(messageId: string, _: ImageType): Promise<FileBox> {
        const message = await this.messageRawPayload(messageId)
        const messagePayload = await this.messageRawPayloadParser(message)
        if (messagePayload.type !== MessageType.Image) {
            throw new Error('该消息不是图片类型的消息')
        }
        if (!messagePayload.text) {
            throw new Error('图片消息XML不存在')
        }
        const url = await this._client.DownloadImage(messagePayload.text)
        return FileBox.fromUrl(url)
    }

    async messageMiniProgram(messageId: string): Promise<MiniProgramPayload> {
        const message = await this.messageRawPayload(messageId)
        const messagePayload = await this.messageRawPayloadParser(message)

        if (messagePayload.type !== MessageType.MiniProgram) {
            throw new Error('该消息不是小程序类型的消息')
        }
        if (!messagePayload.text) {
            throw new Error('小程序消息XML不存在')
        }

        const tryXmlText = clearEscapeFlag(messagePayload.text!)

        const miniProgramXml: MiniProgramXmlSchema = await xmlToJson(tryXmlText)
        const appmsg = miniProgramXml.msg.appmsg
        const weappinfo = appmsg.weappinfo
        const appattach = appmsg.appattach

        const thumbUrl = await this._client.DownloadImageByKey(
            appattach.cdnthumbaeskey,
            appattach.cdnthumburl
        )

        return {
            appid: weappinfo.appid,
            username: weappinfo.username,
            title: appmsg.title,
            description: appmsg.sourcedisplayname,
            pagePath: weappinfo.pagepath,
            iconUrl: weappinfo.weappiconurl,
            shareId: weappinfo.shareId,
            thumbUrl: thumbUrl,
            thumbKey: appattach.cdnthumbaeskey
        }
    }

    // messageUrl 解析消息为url类型
    async messageUrl(messageId: string): Promise<UrlLinkPayload> {
        const message = await this.messageRawPayload(messageId)
        const messagePayload = await this.messageRawPayloadParser(message)
        if (messagePayload.type !== MessageType.Url) {
            throw new Error('该消息不是超链接类型的消息')
        }
        if (!messagePayload.text) {
            throw new Error('链接消息XML不存在')
        }
        const appPayload = await appMessageParser(message)
        return {
            description: appPayload.des,
            thumbnailUrl: appPayload.thumburl,
            title: appPayload.title,
            url: appPayload.url
        }
    }

    async messageForward(
        conversationId: string,
        messageId: string
    ): Promise<void | string> {
        throw new Error(`not implement`)
    }

    protected async messageRawPayload(messageId: string): Promise<Message> {
        const message = await this._cacheMgr?.getMessage(messageId)
        if (!message) {
            throw new Error(`没有找到这条消息的原始数据: ${messageId}`)
        }
        return message
    }

    protected async messageRawPayloadParser(
        message: Message
    ): Promise<MessagePayload> {
        return await ParseRawToMessagePayload(message)
    }

    async messageRecall(messageId: string): Promise<boolean> {
        const revokeInfo = await this._cacheMgr?.getMessageRevokeInfo(messageId)
        if (!revokeInfo) {
            throw new Error('找不到原始的发送消息信息')
        }

        try {
            return await this._client.RevokeMessage(revokeInfo)
        } catch (e) {
            log.error(PRE, `消息撤回失败 ${e}`)
            return false
        }
    }

    async messageSendContact(
        toUser: string,
        contactId: string
    ): Promise<void | string> {
        const rsp = await this._client.SendPersonalCardMessage(
            toUser,
            contactId
        )
        await this._setSendMessage(SimplePadMessageType.App, toUser, rsp)
        await this._setMessageRevokeInfo(toUser, rsp)
        return rsp.newMsgId
    }

    async messageSendFile(
        toUser: string,
        fileBox: FileBox
    ): Promise<void | string> {
        const fileType =
            fileBox.mimeType && fileBox.mimeType !== 'application/octet-stream'
                ? fileBox.mimeType
                : path.extname(fileBox.name)

        let msgType = SimplePadMessageType.Text
        let fileUrl = ''
        if (fileBox.type() === FileBoxType.Url) {
            fileUrl = (fileBox as any).remoteUrl
        } else if (fileBox.type() === FileBoxType.File) {
            const upload = await this._client.UploadFile(fileBox)
            fileUrl = upload.url
        } else {
            throw new Error('目前只支持网络地址和本地文件类型的FileBox发送')
        }

        log.verbose(PRE, `fileType ${fileType} fileUrl ${fileUrl}`)

        let rsp: SendMessageResponse | null = null
        switch (fileType) {
            case '.slk':
            case 'audio/silk':
                msgType = SimplePadMessageType.Voice
                rsp = await this._client.SendVoice(toUser, fileUrl)
                break
            case 'image/jpeg':
            case 'image/png':
            case '.jpg':
            case '.jpeg':
            case '.png':
                msgType = SimplePadMessageType.Image
                rsp = await this._client.SendImage(toUser, fileUrl)
                break
            case 'emoticon':
                msgType = SimplePadMessageType.Emoticon
                rsp = await this._client.SendEmoji(toUser, '', fileUrl, '')
                break
            case 'video/mp4':
            case '.mp4':
                // msgType = SimplePadMessageType.Video
                // rsp = await this._client.SendVideo(toUser, fileUrl, '', false)
                // FIXME 处理视频的封面问题
                log.error('暂时不支持视频转发')
                return
            case 'application/xml':
                log.error('暂时不支持xml消息转发')
                return
            default:
                msgType = SimplePadMessageType.App
                rsp = await this._client.SendFile(toUser, fileUrl, fileBox.name)
        }

        if (rsp) {
            await this._setSendMessage(msgType, toUser, rsp)
            await this._setMessageRevokeInfo(toUser, rsp)
            return rsp.newMsgId
        }
    }

    async messageSendMiniProgram(
        toUser: string,
        miniProgramPayload: MiniProgramPayload
    ): Promise<void | string> {
        const rsp = await this._client.SendMiniProgram(
            toUser,
            miniProgramPayload
        )
        await this._setSendMessage(SimplePadMessageType.App, toUser, rsp)
        await this._setMessageRevokeInfo(toUser, rsp)
        return rsp.newMsgId
    }

    async messageSendText(
        toUser: string,
        text: string,
        mentionIdList?: string[]
    ): Promise<void | string> {
        const rsp = await this._client.SendTextMessage(
            toUser,
            text,
            mentionIdList
        )
        await this._setSendMessage(SimplePadMessageType.Text, toUser, rsp)
        await this._setMessageRevokeInfo(toUser, rsp)
        return rsp.newMsgId
    }

    async messageSendUrl(
        toUser: string,
        urlLinkPayload: UrlLinkPayload
    ): Promise<void | string> {
        const rsp = await this._client.SendUrl(toUser, urlLinkPayload)
        await this._setSendMessage(SimplePadMessageType.App, toUser, rsp)
        await this._setMessageRevokeInfo(toUser, rsp)
        return rsp.newMsgId
    }

    /**
     * 群聊操作
     */

    // 群公告
    roomAnnounce(roomId: string): Promise<string>
    roomAnnounce(roomId: string, text: string): Promise<void>
    async roomAnnounce(roomId: string, text?: string): Promise<string | void> {
        const room = await this._getContactOrRoom(roomId)
        if (!room) {
            return
        }
        if (text) {
            await this._client.ModifyChatroomAnnouncement(roomId, text)
        }
        const extRoomInfo = await this._client.GetChatroomExtraInfo(
            room.userName
        )
        if (extRoomInfo) {
            return extRoomInfo.announcement
        }
    }

    async roomAvatar(roomId: string): Promise<FileBox> {
        const room = await this._getContactOrRoom(roomId)
        if (room) {
            return FileBox.fromUrl(room.bigHeadImgUrl)
        }
        return FileBox.fromUrl('')
    }

    async roomCreate(contactIdList: string[], topic?: string): Promise<string> {
        const newRoom = await this._client.CreateChatroom(contactIdList)
        if (newRoom) {
            const chatroomId = newRoom.chatroomName
            if (!topic) {
                return chatroomId
            }
            await this.roomTopic(chatroomId, topic)
            return chatroomId
        }
        return ''
    }

    async roomAdd(roomId: string, contactId: string): Promise<void> {
        await this._client.AddChatroomMember(roomId, [contactId])
    }

    async roomDel(roomId: string, contactId: string): Promise<void> {
        await this._client.DelChatroomMember(roomId, [contactId])
    }

    async roomInvitationAccept(roomInvitationId: string): Promise<void> {
        const invitation = await this._cacheMgr?.getRoomInvitation(
            roomInvitationId
        )
        if (!invitation) {
            return
        }
        await this._client.AgreeInviteJoinChatRoom(invitation.invitation)
    }

    protected async roomInvitationRawPayload(
        roomInvitationId: string
    ): Promise<RoomInvitationPayload> {
        const invitation = await this._cacheMgr?.getRoomInvitation(
            roomInvitationId
        )
        if (!invitation) {
            throw new Error('入群邀请信息不存在')
        }
        return invitation
    }

    protected async roomInvitationRawPayloadParser(
        rawPayload: RoomInvitationPayload
    ): Promise<RoomInvitationPayload> {
        return rawPayload
    }

    async roomList(): Promise<string[]> {
        if (!this._cacheMgr) {
            throw new Error('cacheMgr not init')
        }
        return this._cacheMgr.getRoomIds()
    }

    async roomMemberList(roomId: string): Promise<string[]> {
        const members = await this._cacheMgr?.getRoomMember(roomId)
        if (members) {
            return Object.keys(members)
        }
        return Promise.resolve([])
    }

    protected async roomMemberRawPayload(
        roomId: string,
        contactId: string
    ): Promise<ChatroomMember | undefined> {
        const members = await this._cacheMgr?.getRoomMember(roomId)
        if (!members) {
            return
        }
        return members[contactId]
    }

    protected async roomMemberRawPayloadParser(
        rawPayload: ChatroomMember
    ): Promise<RoomMemberPayload> {
        return {
            avatar: rawPayload.bigHeadImgUrl,
            id: rawPayload.userName,
            name: rawPayload.nickName,
            inviterId: rawPayload.inviterUserName,
            roomAlias: rawPayload.displayName
        }
    }

    async roomQRCode(roomId: string): Promise<string> {
        const qrData = await this._client.GetChatroomQRCode(roomId)
        return qrData.qrCode
    }

    async roomQuit(roomId: string): Promise<void> {
        await this._client.QuitChatroomName(roomId)

        await this._cacheMgr?.deleteRoom(roomId)
        await this._cacheMgr?.deleteRoomMember(roomId)
    }

    protected async roomRawPayload(
        roomId: string
    ): Promise<Contact | undefined> {
        return this._getContactOrRoom(roomId)
    }

    protected async roomRawPayloadParser(
        rawPayload: Contact
    ): Promise<RoomPayload> {
        const members = await this._cacheMgr?.getRoomMember(rawPayload.userName)
        let memberList: string[] = []
        const adminIdList: string[] = []
        if (members) {
            memberList = Object.keys(members)
            Object.keys(members).map((id) => {
                members[id].chatroomMemberFlag === 2048 && adminIdList.push(id)
            })
        }
        return {
            id: rawPayload.userName,
            topic: rawPayload.nickName,
            avatar: rawPayload.smallHeadImgUrl,
            ownerId: rawPayload.chatRoomOwner,
            memberIdList: memberList,
            adminIdList: adminIdList
        }
    }

    roomTopic(roomId: string): Promise<string>
    roomTopic(roomId: string, topic: string): Promise<void>
    async roomTopic(roomId: string, topic?: string): Promise<string | void> {
        const room = await this._getContactOrRoom(roomId)
        if (!room) {
            return
        }
        if (topic) {
            this._client.ModifyChatroomName(roomId, topic).then(() => {
                if (room) {
                    room.nickName = topic
                    this._updateContactCache(room)
                }
            })
            return
        }
        return room.nickName
    }

    parseMemberToContact(roomId: string, member: ChatroomMember): Contact {
        return {
            chatRoomOwner: '',
            chatroomInfoVersion: 0,
            chatroomMemberCount: 0,
            chatroomVersion: 0,
            alias: member.displayName,
            bigHeadImgUrl: member.bigHeadImgUrl,
            labelIdList: '',
            city: '',
            country: '',
            nickName: member.nickName,
            province: '',
            remark: '',
            sex: ContactGender.Unknown,
            smallHeadImgUrl: member.smallHeadImgUrl,
            userName: member.userName,
            isChatroomMember: true
        }
    }

    /**
     * 联系人标签
     */

    async tagContactAdd(tagName: string, contactId: string): Promise<void> {
        const label = (await this._findTagWithName(tagName, true))!

        const contact = await this.contactRawPayload(contactId)
        if (!contact) {
            return
        }
        let contactLabelIds: number[] = []
        if (contact.labelIdList.length > 0) {
            contactLabelIds = contact.labelIdList
                .split(',')
                .filter((l) => l)
                .map((l) => parseInt(l, 10))
        }
        if (contactLabelIds.indexOf(label.labelId) !== -1) {
            log.warn(
                `contact: ${contactId} has already assigned tag: ${tagName}`
            )
            return
        }

        contactLabelIds.push(label.labelId)
        await this._client?.EditContactLabel(
            contactId,
            contactLabelIds.join(',')
        )

        contact.labelIdList = contactLabelIds.join(',')
        await this._updateContactCache(contact)
    }

    async tagContactRemove(tagName: string, contactId: string): Promise<void> {
        const label = await this._findTagWithName(tagName)
        if (!label) {
            throw new Error(`can not find tag with name: ${tagName}`)
        }

        const contact = await this.contactRawPayload(contactId)
        if (!contact) {
            throw new Error(`can not find contact ${contactId}`)
        }
        const contactLabelIds = contact?.labelIdList
            .split(',')
            .filter((l) => l)
            .map((l) => parseInt(l, 10))
        if (!contactLabelIds) {
            return
        }
        const labelIndex = contactLabelIds.indexOf(label.labelId)
        if (labelIndex === -1) {
            log.warn(PRE, `contact: ${contactId} has no tag: ${tagName}`)
            return
        }

        contactLabelIds.splice(labelIndex, 1)
        await this._client!.EditContactLabel(
            contactId,
            contactLabelIds.join(',')
        )

        contact.labelIdList = contactLabelIds.join(',')
        await this._updateContactCache(contact)
    }

    async tagContactDelete(tagName: string): Promise<void> {
        const label = (await this._findTagWithName(tagName, false))!
        if (!label) {
            throw new Error(`tag:${tagName} doesn't exist`)
        }

        await this._client!.DelContactLabel(label.labelId.toString())

        // refresh label list
        await this._getTagList(true)
    }

    tagContactList(contactId: string): Promise<string[]>
    tagContactList(): Promise<string[]>
    async tagContactList(contactId?: string): Promise<string[]> {
        // the all tag
        if (!contactId) {
            const { labelList } = await this._getTagList(true)
            return labelList.map((l) => l.labelName)
        } else {
            const contact = await this.contactRawPayload(contactId)
            if (!contact) {
                return []
            }
            if (!contact.labelIdList || !contact.labelIdList.length) {
                return []
            }

            const contactLabelIds: number[] = contact.labelIdList
                .split(',')
                .filter((l) => l)
                .map((l) => parseInt(l, 10))

            const { labelList, fromCache } = await this._getTagList()
            let contactLabelList = labelList.filter(
                (l) => contactLabelIds.indexOf(l.labelId) !== -1
            )
            if (
                contactLabelList.length === contactLabelIds.length ||
                !fromCache
            ) {
                return contactLabelList.map((l) => l.labelName)
            }

            // cached label list is out of date
            const newLabelList = (await this._getTagList(true)).labelList
            contactLabelList = newLabelList.filter(
                (l) => contactLabelIds.indexOf(l.labelId) !== -1
            )
            return contactLabelList.map((l) => l.labelName)
        }
    }

    async stop(): Promise<void> {
        this._client?.Logout().then(() => {
            this._heartbeatTimer && clearInterval(this._heartbeatTimer)
            this.state.off(true)
            log.info('账户登出')
        })
    }

    /**
     * 暂时不能实现的方法
     */

    async messageContact(_messageId: string): Promise<string> {
        throw new Error(`not implement`)
    }

    // 暂时不支持设置联系人电话功能
    async contactPhone(
        _contactId: string,
        _phoneList: string[]
    ): Promise<void> {
        throw new Error(`not implement`)
    }

    // 暂时不支持设置企业备注功能
    async contactCorporationRemark(
        _contactId: string,
        _corporationRemark: string | null
    ): Promise<void> {
        throw new Error(`not implement`)
    }

    // 暂时不支持设置联系人详情功能
    async contactDescription(
        _contactId: string,
        _description: string | null
    ): Promise<void> {
        throw new Error(`not implement`)
    }

    async conversationRead(_conversationId: string): Promise<void> {
        throw new Error(`not implement`)
    }

    /**
     * 私有方法
     */

    private async _getContactOrRoom(
        contactId: string
    ): Promise<Contact | undefined> {
        let contact: Contact | undefined
        if (isRoomId(contactId)) {
            contact = await this._cacheMgr?.getRoom(contactId)
        } else {
            contact = await this._cacheMgr?.getContact(contactId)
        }
        if (!contact) {
            contact = await this._client.GetContact(contactId)
            if (!contact) {
                log.error(PRE, '获取联系人/群信息失败', contactId)
                return undefined
            }
            await this._updateContactCache(contact)
        }
        return contact
    }

    private async _updateContactCache(contact: Contact): Promise<void> {
        if (!contact.userName) {
            log.warn(
                PRE,
                `contact信息中缺少userName字段: ${JSON.stringify(contact)}`
            )
            return
        }

        if (isRoomId(contact.userName)) {
            const roomId = contact.userName
            const members = await this._cacheMgr?.getRoomMember(roomId)
            if (!members || Object.keys(members).length == 0) {
                // 初始化群成员信息
                const detail = await this._client.GetChatroomMemberDetail(
                    roomId
                )
                if (detail) {
                    contact.chatroomVersion = detail.serverVersion
                    const memberMap: RoomMemberMap = {}
                    await detail.memberList.map(async (member) => {
                        memberMap[member.userName] = member
                        // 存一份在contact中,在room.ready()时候会遍历一次群内成员
                        if (
                            !(await this._cacheMgr?.hasContact(member.userName))
                        ) {
                            const _contact = this.parseMemberToContact(
                                roomId,
                                member
                            )
                            await this._cacheMgr?.setContact(
                                _contact.userName,
                                _contact
                            )
                            await this.dirtyPayload(
                                PayloadType.Contact,
                                _contact.userName
                            )
                        }
                    })
                    await this._cacheMgr?.setRoomMember(roomId, memberMap)
                    log.verbose('初始化群成员信息完成', roomId)
                }
            }
            await this._cacheMgr?.setRoom(roomId, contact)
            await this.dirtyPayload(PayloadType.Room, roomId)
        } else {
            await this._cacheMgr?.setContact(contact.userName, contact)
            await this.dirtyPayload(PayloadType.Contact, contact.userName)
        }
    }

    private async _findTagWithName(
        tagName: string,
        addIfNotExist?: boolean
    ): Promise<Label | null> {
        let labelList = (await this._getTagList()).labelList
        let ret = labelList.find((l) => l.labelName === tagName)
        if (!ret) {
            // try refresh label list if not find by name
            labelList = (await this._getTagList(true)).labelList
            ret = labelList.find((l) => l.labelName === tagName)
        }

        // add new label
        if (!ret && addIfNotExist) {
            const newLabelId = await this._client?.AddContactTag(tagName)
            ret = {
                labelName: tagName,
                labelId: newLabelId
            }
            // refresh label list;
            await this._getTagList(true)
        }

        return ret || null
    }

    private async _getTagList(
        force?: boolean
    ): Promise<{ labelList: Label[]; fromCache: boolean }> {
        let labelList = this._cacheMgr?.getLabelList()
        let fromCache = true

        if (!labelList || force) {
            labelList = await this._client?.GetAllContactLabels()
            this._cacheMgr?.setLabelList(labelList)
            fromCache = false
        }

        return {
            labelList,
            fromCache
        }
    }

    // 设置发送的消息缓存信息
    private async _setSendMessage(
        msgType: SimplePadMessageType,
        toUser: string,
        rsp: SendMessageResponse
    ) {
        const msg: Message = {
            clientUserName: this._self!.userName,
            content: '',
            createTime: rsp.createTime,
            fromUser: this._self!.userName,
            msgType: msgType,
            newMsgId: rsp.newMsgId,
            reportMsgType: ReportType.Message,
            toUser: toUser
        }

        log.verbose('记录发送消息的Message信息', JSON.stringify(msg))
        this._cacheMgr?.setMessage(rsp.newMsgId, msg)
    }

    // 设置用于撤回的缓存信息
    private async _setMessageRevokeInfo(
        toUser: string,
        rsp: SendMessageResponse
    ) {
        this._cacheMgr?.setMessageRevokeInfo(rsp.newMsgId, {
            toUser: toUser,
            clientMsgId: rsp.clientMsgId ? rsp.clientMsgId.toString() : '0',
            svrMsgId: rsp.newMsgId,
            createTime: rsp.createTime
        } as MessageRevokeInfo)
    }
}

export { PuppetSimplePad }
