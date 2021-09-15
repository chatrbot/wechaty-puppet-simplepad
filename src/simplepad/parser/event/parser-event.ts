import { Message } from '../../defined'
import { Puppet, EventMessagePayload, log } from 'wechaty-puppet'
import {
    MessageCategory,
    ParsedMessage,
    ParsedMessagePayloadSpec
} from './parser-event-type'

const PRE = '[ParseEvent]'

export type MessageParserRetType =
    | ParsedMessagePayloadSpec[keyof ParsedMessagePayloadSpec]
    | null
export type MessageParser = (
    puppet: Puppet,
    message: Message
) => Promise<MessageParserRetType>

const MessageParsers: Map<MessageCategory, MessageParser> = new Map()
export function registerMessageParser(
    category: MessageCategory,
    parser: MessageParser
): void {
    MessageParsers.set(category, parser)
}

export async function parseMessage(
    puppet: Puppet,
    message: Message
): Promise<ParsedMessage<any>> {
    for (const [category, parser] of MessageParsers.entries()) {
        try {
            const parsedPayload = await parser(puppet, message)
            if (parsedPayload) {
                return {
                    category,
                    payload: parsedPayload
                }
            }
        } catch (e) {
            log.error(PRE, `parse message error: ${e}`)
        }
    }

    return {
        category: MessageCategory.NormalMessage,
        payload: {
            messageId: message.newMsgId
        } as EventMessagePayload
    }
}
