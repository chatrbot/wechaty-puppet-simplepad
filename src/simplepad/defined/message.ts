export enum SimplePadMessageType {
    Text = 1,
    Image = 3,
    Voice = 34,
    VerifyMsg = 37,
    ShareCard = 42,
    Video = 43,
    Emoticon = 47,
    App = 49, // 链接消息或者小程序,引用回复
    VoipMsg = 50,
    StatusNotify = 51,
    VoipNotify = 52,
    VoipInvite = 53,
    MicroVideo = 62,
    VerifyMsgEnterprise = 65,
    GroupInvite = 2003, // 群邀请
    SysNotice = 9999,
    Sys = 10002 // 系统消息
}

export const ReportType = {
    // 收到的所有消息,包括系统消息
    Message: 1,
    // 群信息变更后触发的消息
    ChatroomNotify: 2
}

// 接受到的主动推送的消息
export interface ReceiveData<T> {
    type: number
    data: T
}

export interface Message {
    reportMsgType: number
    toUser: string
    content: string
    createTime: number
    pushContent?: string
    atList?: any[]
    clientId?: string
    clientUserName: string
    msgType: number
    newMsgId: string
    msgSeq?: number
    fromUser: string
    msgId?: number
    msgSource?: string
    imgBuf?: any
}

export interface MessageRevokeInfo {
    id: number
}

// 发送消息后的返回结果
export interface SendMessageResponse {
    createTime: number
    clientMsgId: number
    serverTime: number
    msgId: number
    newMsgId: string
}

export interface ChatroomNotify {
    chatroomMemberCount: number
    contactType: string
    remarkName: string
    city: string
    province: string
    chatroomVersion: number
    sex: number
    chatroomOwner: string
    chatroomMembers: ChatroomNotifyMember[]
    clientId: string
    clientUserName: string
    reportMsgType: number
    userName: string
    bigHeadImgUrl: string
    realName: string
    smallHeadImgUrl: string
    country: string
    bitMask: number
    chatroomNotify: number
    nickName: string
    alias: string
    bitVal: number
    chatroomInfoVersion: number
}

export interface ChatroomNotifyMember {
    userName: string
    chatroomMemberFlag: number
}

export interface MessageRevokeInfo {
    toUser: string
    clientMsgId: string
    svrMsgId: string
    createTime: number
}

// 消息撤回后的返回结果
export interface RevokeMessageResponse {
    sysWording: string
    introduction: string
}
