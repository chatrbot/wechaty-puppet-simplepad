import { SelfQRCode } from './user'

export interface ChatroomDetail {
    serverVersion: number
    chatroomUserName: string
    memberList: ChatroomMember[]
}

export interface ChatroomMember {
    userName: string
    nickName: string
    bigHeadImgUrl: string
    smallHeadImgUrl: string
    displayName: string
    inviterUserName: string
    chatroomMemberFlag: number
}

export interface ChatroomExtraInfo {
    announcement: string
    announcementEditor: string
    announcementPublishTime: number
    chatroomStatus: number
    chatroomInfoVersion: number
}

export interface CreateChatroom {
    chatroomName: string
    // 拉失败的微信号,可能不是好友或者该人被封
    failMemberList: string[]
}

export type ChatroomQRCode = SelfQRCode
