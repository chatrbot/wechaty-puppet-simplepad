import { Message } from '../../defined'
import { EventRoomTopicPayload, Puppet, YOU } from 'wechaty-puppet'
import { MessageParserRetType } from './parser-event'
import { clearEscapeFlag } from '../../utils/string'
import { isRoomId } from '../../utils/is-helper'
import { getNickName, getUserName } from '../../utils/get-xml-label'
import { xmlToJson } from '../../utils/xml-to-json'

const ROOM_TOPIC_OTHER_REGEX_LIST = [
    /^"(.+)" changed the group name to "(.+)"$/,
    /^"(.+)"修改群名为“(.+)”$/
]
const ROOM_TOPIC_YOU_REGEX_LIST = [
    /^(You) changed the group name to "(.+)"$/,
    /^(你)修改群名为“(.+)”$/
]

export const roomTopicParser = async (
    puppet: Puppet,
    message: Message
): Promise<MessageParserRetType> => {
    const roomId = message.fromUser
    if (!isRoomId(roomId)) {
        return null
    }

    let content = message.content
    const needParseXML =
        content.includes('你修改群名为') ||
        content.includes('You changed the group name to')
    let linkList

    if (!needParseXML) {
        const [, ...contents] = content.split(':')
        content = clearEscapeFlag(contents.join(':'))

        const roomXml = await xmlToJson(content)
        if (!roomXml || !roomXml.sysmsg || !roomXml.sysmsg.sysmsgtemplate) {
            return null
        }

        content = roomXml.sysmsg.sysmsgtemplate.content_template.template
        linkList = roomXml.sysmsg.sysmsgtemplate.content_template.link_list.link
    }

    let matchesForOther: null | string[] = []
    let matchesForYou: null | string[] = []

    ROOM_TOPIC_OTHER_REGEX_LIST.some(
        (regex) => !!(matchesForOther = content.match(regex))
    )
    ROOM_TOPIC_YOU_REGEX_LIST.some(
        (regex) => !!(matchesForYou = content.match(regex))
    )

    const matches: string[] = matchesForOther || matchesForYou
    if (!matches) {
        return null
    }

    let changerId = matches[1]
    let topic = matches[2]
    if ((matchesForYou && changerId === '你') || changerId === 'You') {
        changerId = (await puppet.roomMemberSearch(roomId, YOU))[0]
    } else {
        changerId = getUserName(linkList, changerId)
        topic = getNickName(linkList, topic)
    }

    const room = await puppet.roomPayload(roomId)
    const oldTopic = room.topic

    return {
        changerId,
        roomId,
        timestamp: message.createTime,
        oldTopic,
        newTopic: topic
    } as EventRoomTopicPayload
}
