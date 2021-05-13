import { Puppet, RoomInvitationPayload } from 'wechaty-puppet'
import { Message } from '../../defined'
import { MessageParserRetType } from './parser-event'
import {
    appMessageParser,
    AppMessagePayload,
    AppMessageType
} from '../message/message-app'

const ROOM_OTHER_INVITE_TITLE_ZH = [/邀请你加入群聊/]
const ROOM_OTHER_INVITE_TITLE_EN = [/Group Chat Invitation/]
const ROOM_OTHER_INVITE_LIST_ZH = [
    /^"(.+)"邀请你加入群聊(.*)，进入可查看详情。/
]
const ROOM_OTHER_INVITE_LIST_EN = [
    /"(.+)" invited you to join the group chat "(.+)"\. Enter to view details\./
]

export const roomInviteParser = async (
    _puppet: Puppet,
    message: Message
): Promise<MessageParserRetType> => {
    let appMsgPayload: AppMessagePayload
    try {
        appMsgPayload = await appMessageParser(message)
    } catch (e) {
        return null
    }

    if (appMsgPayload.type !== AppMessageType.Url) {
        return null
    }

    if (!appMsgPayload.title || !appMsgPayload.des) {
        return null
    }

    let matchesForOtherInviteTitleEn = null as null | string[]
    let matchesForOtherInviteTitleZh = null as null | string[]
    let matchesForOtherInviteEn = null as null | string[]
    let matchesForOtherInviteZh = null as null | string[]

    ROOM_OTHER_INVITE_TITLE_EN.some(
        (regex) =>
            !!(matchesForOtherInviteTitleEn = appMsgPayload.title.match(regex))
    )
    ROOM_OTHER_INVITE_TITLE_ZH.some(
        (regex) =>
            !!(matchesForOtherInviteTitleZh = appMsgPayload.title.match(regex))
    )
    ROOM_OTHER_INVITE_LIST_EN.some(
        (regex) => !!(matchesForOtherInviteEn = appMsgPayload.des!.match(regex))
    )
    ROOM_OTHER_INVITE_LIST_ZH.some(
        (regex) => !!(matchesForOtherInviteZh = appMsgPayload.des!.match(regex))
    )

    const titleMatch =
        matchesForOtherInviteTitleEn || matchesForOtherInviteTitleZh
    const matchInviteEvent = matchesForOtherInviteEn || matchesForOtherInviteZh
    const matches = !!titleMatch && !!matchInviteEvent

    if (!matches) {
        return null
    }

    return {
        avatar: appMsgPayload.thumburl,
        id: message.newMsgId,
        invitation: appMsgPayload.url,
        inviterId: message.fromUser,
        memberCount: 0,
        memberIdList: [],
        receiverId: message.toUser,
        timestamp: message.createTime,
        topic: matchInviteEvent![2]
    } as RoomInvitationPayload
}
