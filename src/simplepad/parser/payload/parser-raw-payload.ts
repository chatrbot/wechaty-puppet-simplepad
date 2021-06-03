import { Message, SimplePadMessageType } from '../../defined'
import { MessagePayload, MessageType } from 'wechaty-puppet'
import { isRoomId } from '../../utils/is-helper'
import { appMessageParser, AppMessageType } from '../message/message-app'

// ParseRawToMessagePayload 把原始数据解析成puppet的消息类型
export const ParseRawToMessagePayload = async (
    msg: Message
): Promise<MessagePayload> => {
    const payload = {
        type: MessageType.Unknown,
        id: msg.newMsgId,
        timestamp: msg.createTime,
        fromId: msg.fromUser,
        roomId: isRoomId(msg.fromUser) ? msg.fromUser : '',
        toId: msg.toUser,
        mentionIdList: msg.atList,
        text: msg.content
    }
    if (isRoomId(msg.fromUser)) {
        const parts = msg.content.split(':\n')
        if (parts && parts.length > 1) {
            payload.fromId = parts[0]
        }
        payload.roomId = msg.fromUser
        if (!/^<msg>.*/.test(payload.text)) {
            payload.text = payload.text.replace(/^[^\n]+\n/, '')
        }
    }

    // 当前支持的消息类型
    switch (msg.msgType) {
        case SimplePadMessageType.Text:
            payload.type = MessageType.Text
            break
        case SimplePadMessageType.Image:
            payload.type = MessageType.Image
            break
        case SimplePadMessageType.Video:
            payload.type = MessageType.Video
            break
        case SimplePadMessageType.Voice:
            payload.type = MessageType.Audio
            break
        case SimplePadMessageType.Emoticon:
            payload.type = MessageType.Emoticon
            break
        case SimplePadMessageType.ShareCard:
            payload.type = MessageType.Contact
            break
        case SimplePadMessageType.App:
            // 小程序 链接 文件类型需要根据具体xml内容来区分
            // TODO 处理引用类型的回复
            try {
                const appPayload = await appMessageParser(msg)
                if (appPayload.type === AppMessageType.Url) {
                    payload.type = MessageType.Url
                }
                if (appPayload.type === AppMessageType.Attach) {
                    payload.type = MessageType.Attachment
                }
                if (appPayload.type === AppMessageType.MiniProgram) {
                    payload.type = MessageType.MiniProgram
                }
            } catch (e) {
                throw e
            }
            break
        case SimplePadMessageType.VerifyMsg:
            break
    }
    return payload
}
