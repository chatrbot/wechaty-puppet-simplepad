import {
    Puppet,
    FriendshipPayloadConfirm,
    FriendshipPayloadVerify,
    FriendshipType
} from 'wechaty-puppet'
import { FriendshipPayloadReceive } from 'wechaty-puppet/src/schemas/friendship'
import { Message, SimplePadMessageType } from '../../defined'
import { isContactId, isIMContactId } from '../../utils/is-helper'
import { MessageParserRetType } from './parser-event'
import { xmlToJson } from '../../utils/xml-to-json'
import { clearEscapeFlag } from '../../utils/string'

const FRIENDSHIP_CONFIRM_REGEX_LIST = [
    /^You have added (.+) as your WeChat contact. Start chatting!$/,
    /^你已添加了(.+)，现在可以开始聊天了。$/,
    /I've accepted your friend request. Now let's chat!$/,
    /^(.+) just added you to his\/her contacts list. Send a message to him\/her now!$/,
    /^(.+)刚刚把你添加到通讯录，现在可以开始聊天了。$/,
    /^我通过了你的朋友验证请求，现在我们可以开始聊天了$/
]

const FRIENDSHIP_VERIFY_REGEX_LIST = [
    /^(.+) has enabled Friend Confirmation/,
    /^(.+)开启了朋友验证，你还不是他（她）朋友。请先发送朋友验证请求，对方验证通过后，才能聊天。/
]

interface ReceiveXmlSchema {
    msg: {
        $: {
            fromusername: string
            encryptusername: string
            content: string
            scene: string
            ticket: string
            sourcenickname?: string
            sourceusername?: string
            sharecardnickname?: string
            sharecardusername?: string
        }
    }
}

const isConfirm = (message: Message): boolean => {
    return FRIENDSHIP_CONFIRM_REGEX_LIST.some((regexp) => {
        return !!message.content.match(regexp)
    })
}

const isNeedVerify = (message: Message): boolean => {
    return FRIENDSHIP_VERIFY_REGEX_LIST.some((regexp) => {
        return !!message.content.match(regexp)
    })
}

const isReceive = async (
    message: Message
): Promise<ReceiveXmlSchema | null> => {
    if (
        message.msgType !== SimplePadMessageType.VerifyMsg &&
        message.msgType !== SimplePadMessageType.VerifyMsgEnterprise
    ) {
        return null
    }

    try {
        const verifyXml: ReceiveXmlSchema = await xmlToJson(message.content)
        const contactId = verifyXml.msg.$.fromusername
        if (isContactId(contactId) && verifyXml.msg.$.encryptusername) {
            return verifyXml
        } else if (isIMContactId(contactId)) {
            return verifyXml
        }
    } catch (e) {
        // not receive event
    }

    return null
}

export const friendShipParser = async (
    _puppet: Puppet,
    message: Message
): Promise<MessageParserRetType> => {
    if (isConfirm(message)) {
        return {
            contactId: message.fromUser,
            id: message.newMsgId,
            timestamp: message.createTime,
            type: FriendshipType.Confirm
        } as FriendshipPayloadConfirm
    } else if (isNeedVerify(message)) {
        return {
            contactId: message.fromUser,
            id: message.newMsgId,
            timestamp: message.createTime,
            type: FriendshipType.Verify
        } as FriendshipPayloadVerify
    } else {
        const verifyXml = await isReceive(message)
        if (verifyXml) {
            return {
                contactId: verifyXml.msg.$.fromusername,
                hello: verifyXml.msg.$.content,
                id: message.newMsgId,
                scene: parseInt(verifyXml.msg.$.scene, 10),
                stranger: verifyXml.msg.$.encryptusername,
                // 这里的ticket并非wechaty原始意义上的ticket
                // 因为接口不同,所以这里存放的是原始xml
                ticket: clearEscapeFlag(message.content),
                timestamp: message.createTime,
                type: FriendshipType.Receive,
                sourceNickName: verifyXml.msg.$.sourcenickname,
                sourceContactId: verifyXml.msg.$.sourceusername,
                shareCardNickName: verifyXml.msg.$.sharecardnickname,
                shareCardContactId: verifyXml.msg.$.sharecardusername
            } as FriendshipPayloadReceive
        }

        return null
    }
}
