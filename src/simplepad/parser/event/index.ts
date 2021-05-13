import { registerMessageParser } from './parser-event'
import { roomTopicParser } from './parser-event-room-topic'
import { roomInviteParser } from './parser-event-room-invite'
import { MessageCategory } from './parser-event-type'
import { friendShipParser } from './parser-event-friendship'
import { roomJoinParser } from './parser-event-room-join'
import { roomLeaveParser } from './parser-event-room-leave'

registerMessageParser(MessageCategory.Friendship, friendShipParser)
registerMessageParser(MessageCategory.RoomInvite, roomInviteParser)
registerMessageParser(MessageCategory.RoomJoin, roomJoinParser)
registerMessageParser(MessageCategory.RoomLeave, roomLeaveParser)
registerMessageParser(MessageCategory.RoomTopic, roomTopicParser)

export { parseMessage } from './parser-event'
