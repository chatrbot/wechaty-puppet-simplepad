import { URI } from './uri'
import {
    FileBox,
    log,
    MiniProgramPayload,
    PuppetOptions,
    UrlLinkPayload
} from 'wechaty-puppet'
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import {
    QRCode,
    ScanQRCodeStatus,
    User,
    ManualLogin,
    Contact,
    InitContact,
    ContactListDetail,
    SendMessageResponse,
    ChatroomDetail,
    LabelPairs,
    UploadHeadImage,
    SelfQRCode,
    ChatroomQRCode,
    ChatroomExtraInfo,
    CreateChatroom,
    SearchContact,
    DownloadImageByKeyResponse,
    DownloadFileByKeyResponse,
    DownloadVoice,
    DownloadVideo,
    DownloadImageType,
    RevokeMessageResponse,
    MessageRevokeInfo,
    UploadFile
} from '../defined'
import { BaseResponse } from '../defined'
import { JSONParse } from '../utils/json-parse'
import FormData from 'form-data'
import { PuppetSimplePad } from '../../puppet-simplepad'

const PRE = '[SimplePadAPI]'

class SimplePadAPI {
    private http: AxiosInstance

    constructor(
        protected options: PuppetOptions,
        puppet: PuppetSimplePad,
        timeout = 15
    ) {
        let url = this.getBaseURL()
        if (url.indexOf('http') === -1) {
            url = 'http://' + url
        }
        console.log('server', url)
        this.http = axios.create({
            timeout: timeout * 1000,
            baseURL: url
        })
        this.http.interceptors.request.use((request) => {
            log.verbose(
                PRE,
                'request url:%s,data:%s',
                request.url,
                JSON.stringify(request.data)
            )
            request.headers = { ...request.headers, 'TOKEN-TYPE': 'simplepad' }
            return request
        })
        this.http.interceptors.response.use(
            (response: AxiosResponse<BaseResponse>) => {
                if (response.data.code !== 0 && response.data.code !== 200) {
                    const errMsg = response.data.msg
                    log.verbose(PRE, 'request api err %s', errMsg)
                    if (
                        errMsg.indexOf('请先登录') > -1 ||
                        errMsg.indexOf('实例离线') > -1
                    ) {
                        puppet.manualLogin()
                    }
                    return Promise.reject(response.data.msg)
                }
                return response
            }
        )
    }

    // TODO 改为服务端下发方式来获取
    private getBaseURL() {
        return (
            this.options.endpoint ||
            process.env.SIMPLEPAD_ENDPOINT ||
            '121.199.64.183:8877'
        )
    }

    private async request<T = unknown>(
        uri: string,
        data?: unknown,
        config?: AxiosRequestConfig
    ): Promise<T> {
        uri += '?token=' + this.options.token
        return this.http.post(uri, data, config).then((response) => {
            return response.data.data
        })
    }

    GetWebSocketServerURL(): string {
        let url = this.getBaseURL() + '/ws?token=' + this.options.token
        if (url.indexOf('http') === -1) {
            url = 'ws://' + url
        }
        return url
    }

    // ---- 基本操作 ----
    async GetOnlineStatus(): Promise<boolean> {
        // 如果未在线,接口返回code不为0
        return this.request(URI.GetOnlineInfo)
            .then(() => {
                return true
            })
            .catch(() => {
                return false
            })
    }

    async GetQRCode(): Promise<QRCode> {
        return this.request<QRCode>(
            URI.GetQRCode,
            { platform: 'ipad' },
            { timeout: 15 * 1000 }
        )
    }

    async Logout() {
        return this.request(URI.Logout)
    }

    async CheckScanStatus(): Promise<ScanQRCodeStatus> {
        return this.request<ScanQRCodeStatus>(URI.CheckScanStatus)
    }

    async Login(): Promise<ManualLogin> {
        return this.request<ManualLogin>(URI.ManualLogin)
    }

    // ---- 个人信息 ----
    async GetSelfInfo(): Promise<User> {
        return this.request<User>(URI.GetProfile)
    }

    async UploadHeadImage(headImgUrl: string) {
        return this.request<UploadHeadImage>(URI.UploadHeadImage, {
            headImgUrl
        })
    }

    async GetSelfQRCode(userName: string) {
        return this.request<SelfQRCode>(URI.UploadHeadImage, {
            userName
        })
    }

    async ModifyNickName(nickName: string) {
        return this.request(URI.ModifyNickName, {
            nickName
        })
    }

    async ModifySignature(signature: string) {
        return this.request(URI.ModifySignature, {
            signature
        })
    }

    // ---- 联系人 ----
    async UpdateContactRemark(contactId: string, alias: string) {
        return this.request(URI.SetUserRemark, {
            userName: contactId,
            remark: alias
        })
    }

    async GetContact(contactId: string) {
        return this.request<Contact>(URI.GetContactDetail, {
            userName: contactId
        })
    }

    async DeleteContact(userName: string) {
        return this.request(URI.DelContact, { userName })
    }

    async InitContact(chatroomSeq: number, contactSeq: number) {
        return this.request<InitContact>(URI.InitContact, {
            currentChatRoomContactSeq: chatroomSeq,
            currentWxContactSeq: contactSeq
        })
    }

    async GetContactListDetail(userNameList: string[]) {
        return this.request<ContactListDetail>(URI.BatchGetContactDetail, {
            userNameList
        }).then((data) => {
            return data.contactList
        })
    }

    async ApplyNewContact(userName: string, verifyContent?: string) {
        return this.request(URI.ApplyNewContact, {
            userName,
            verifyContent
        })
    }

    async SearchContact(userName: string) {
        return this.request<SearchContact>(URI.SearchContact, {
            userName
        })
    }

    async VerifyFriendApply(xml: string) {
        return this.request(URI.VerifyFriendApply, { xml })
    }

    // ---- 标签 ----
    async GetAllContactLabels() {
        return this.request<LabelPairs>(URI.GetContactLabelList).then(
            (data) => {
                return data.labelPairs
            }
        )
    }

    async AddContactTag(tagName: string) {
        return this.request<LabelPairs>(URI.AddContactLabel, {
            labels: [tagName]
        }).then((data) => {
            const labels = data.labelPairs.filter(
                (label) => label.labelName === tagName
            )
            if (labels.length > 0) {
                return labels[0].labelId
            }
            return 0
        })
    }

    async EditContactLabel(userName: string, labelIds: string) {
        return this.request(URI.EditContactLabel, {
            userName,
            labelIds
        })
    }

    async DelContactLabel(labelId: string) {
        return this.request(URI.DelContactLabel, {
            labelId
        })
    }

    // ---- 群聊 ----
    async CreateChatroom(userNameList: string[]) {
        return this.request<CreateChatroom>(URI.CreateChatroom, {
            userNameList
        })
    }

    async GetChatroomMemberDetail(chatroom: string, version = 0) {
        return this.request<ChatroomDetail>(URI.GetChatroomMemberDetail, {
            chatroom,
            version
        })
    }

    async GetChatroomExtraInfo(chatroom: string) {
        return this.request<ChatroomExtraInfo>(URI.GetChatroomExtraInfo, {
            chatroom
        })
    }

    async ModifyChatroomName(chatroom: string, topic: string) {
        return this.request(URI.ModifyChatroomName, {
            chatroom,
            topic
        })
    }

    async ModifyChatroomAnnouncement(chatroom: string, topic: string) {
        return this.request(URI.ModifyChatroomAnnouncement, {
            chatroom,
            announcement: topic
        })
    }

    async QuitChatroomName(chatroom: string) {
        return this.request(URI.QuitChatroom, {
            chatroom
        })
    }

    async GetChatroomQRCode(chatroom: string) {
        return this.request<ChatroomQRCode>(URI.GetChatroomQRCode, {
            userName: chatroom
        })
    }

    async DelChatroomMember(chatroom: string, memberList: string[]) {
        return this.request(URI.DelChatroomMember, {
            chatroom,
            memberList
        })
    }

    async AddChatroomMember(
        chatroom: string,
        memberList: string[],
        reason?: string
    ) {
        return this.request(URI.AddChatRoomMember, {
            chatroom,
            memberList,
            reason
        })
    }

    async AgreeInviteJoinChatRoom(inviteUrl: string) {
        return this.request(URI.AgreeInviteJoinChatRoom, { inviteUrl })
    }

    // ---- 消息发送 ----
    async SendTextMessage(toUser: string, content: string, atList?: string[]) {
        return this.request<SendMessageResponse>(
            URI.SendTextMessage,
            {
                toUser,
                content,
                atList
            },
            {
                transformResponse: (data) => {
                    return JSONParse(data)
                }
            }
        )
    }

    async SendMiniProgram(toUser: string, payload: MiniProgramPayload) {
        return this.request<SendMessageResponse>(URI.SendMiniProgram, {
            toUser,
            thumbUrl: payload.thumbUrl,
            title: payload.title,
            des: payload.description,
            url: '',
            sourceUserName: payload.title,
            sourceDisplayName: payload.title,
            username: payload.username,
            appid: payload.appid,
            type: 2,
            version: 100,
            iconUrl: payload.iconUrl,
            pagePath: payload.pagePath
        })
    }

    async SendPersonalCardMessage(toUser: string, cardUser: string) {
        return this.request<SendMessageResponse>(URI.SendPersonalCard, {
            toUser,
            cardUser
        })
    }

    async SendUrl(toUser: string, urlPayload: UrlLinkPayload) {
        return this.request<SendMessageResponse>(URI.SendUrl, {
            toUser,
            title: urlPayload.title,
            des: urlPayload.description,
            url: urlPayload.url,
            thumbUrl: urlPayload.thumbnailUrl
        })
    }

    async SendVoice(toUser: string, silkUrl: string) {
        return this.request<SendMessageResponse>(URI.SendVoice, {
            toUser,
            silkUrl
        })
    }

    async SendVideo(
        toUser: string,
        videoUrl: string,
        videoThumbUrl: string,
        hitSend: boolean
    ) {
        return this.request<SendMessageResponse>(URI.SendVideo, {
            toUser,
            videoUrl,
            videoThumbUrl,
            hitSend
        })
    }

    async SendImage(toUser: string, imgUrl: string) {
        return this.request<SendMessageResponse>(URI.SendPic, {
            toUser,
            imgUrl
        })
    }

    async SendEmoji(
        toUser: string,
        emojiMd5: string,
        gifUrl: string,
        emojiTotalLen: string
    ) {
        return this.request<SendMessageResponse>(URI.SendEmoji, {
            toUser,
            emojiMd5,
            gifUrl,
            emojiTotalLen
        })
    }

    async SendFile(toUser: string, fileUrl: string, fileName: string) {
        return this.request<SendMessageResponse>(URI.SendFile, {
            toUser,
            fileUrl,
            fileName
        })
    }

    // ---- 消息撤回 ----
    async RevokeMessage(revokeInfo: MessageRevokeInfo) {
        return this.request<RevokeMessageResponse>(URI.RevokeMessage, {
            ...revokeInfo
        }).then((rsp) => {
            return rsp.sysWording === '已撤回'
        })
    }

    // ---- 资源上传 ----
    async UploadFile(file: FileBox) {
        const formData = new FormData()
        const fileStream = await file.toStream()
        formData.append('file', fileStream)
        return this.request<UploadFile>(URI.UploadFile, formData, {
            headers: formData.getHeaders()
        })
    }

    // ---- 资源下载 ----
    async DownloadImage(xml: string) {
        return this.request<DownloadImageByKeyResponse>(URI.DownloadImage, {
            xml
        }).then((rsp) => {
            return rsp.imgUrl
        })
    }

    async DownloadImageByKey(
        aesKey: string,
        fileId: string,
        fileType = DownloadImageType.Thumb
    ) {
        return this.request<DownloadImageByKeyResponse>(
            URI.DownloadImageByKey,
            {
                aesKey,
                fileId,
                fileType
            }
        ).then((rsp) => {
            return rsp.imgUrl
        })
    }

    async DownloadFileByKey(aesKey: string, fileId: string, fileName: string) {
        return this.request<DownloadFileByKeyResponse>(URI.DownloadFileByKey, {
            aesKey,
            fileId,
            fileName
        }).then((rsp) => {
            return rsp.fileUrl
        })
    }

    async DownloadVoice(xml: string, newMsgId: string) {
        return this.request<DownloadVoice>(URI.DownloadVoice, {
            xml,
            newMsgId
        }).then((rsp) => {
            return rsp.voiceUrl
        })
    }

    async DownloadVideo(xml: string) {
        return this.request<DownloadVideo>(URI.DownloadVideo, { xml }).then(
            (rsp) => {
                return rsp.videoUrl
            }
        )
    }
}

export { SimplePadAPI }
export default SimplePadAPI
