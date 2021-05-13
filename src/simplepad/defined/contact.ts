import { ContactGender } from 'wechaty-puppet'

export interface InitContact {
    userNameList: string[]
    isContinue: boolean
    currentChatRoomContactSeq: number
    currentWxContactSeq: number
}

export interface Contact {
    userName: string
    nickName: string
    alias: string
    bigHeadImgUrl: string
    smallHeadImgUrl: string
    sex: ContactGender
    labelIdList: string
    country: string
    city: string
    province: string
    remark: string

    // 是不是纯粹的群成员(非联系人)
    isChatroomMember?: boolean
    // Room
    chatroomInfoVersion: number
    chatroomVersion: number
    chatRoomOwner: string
    chatroomMemberCount: number
}

export interface LabelPairs {
    labelPairs: Label[]
}

export interface Label {
    labelId: number
    labelName: string
}

export interface SearchContactResponse {
    id: number
}

export interface ContactListDetail {
    contactList: Contact[]
}

export interface SearchContact {
    userName: string
    nickName: string
    alias: string
    bigHeadImgUrl: string
    smallHeadImgUrl: string
    sex: number
    country: string
    city: string
    province: string
    antispamTicket: string
    matchType: number
}
