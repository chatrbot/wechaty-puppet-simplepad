import {
    EventMessagePayload,
    EventRoomJoinPayload,
    EventRoomLeavePayload,
    EventRoomTopicPayload,
    FriendshipPayload,
    RoomInvitationPayload
} from 'wechaty-puppet'

export enum MessageCategory {
    NormalMessage,
    Friendship,
    RoomInvite,
    RoomJoin,
    RoomLeave,
    RoomTopic,
    Undefined
}

export interface ParsedMessagePayloadSpec {
    [MessageCategory.NormalMessage]: EventMessagePayload
    [MessageCategory.Friendship]: FriendshipPayload
    [MessageCategory.RoomInvite]: RoomInvitationPayload
    [MessageCategory.RoomJoin]: EventRoomJoinPayload
    [MessageCategory.RoomLeave]: EventRoomLeavePayload
    [MessageCategory.RoomTopic]: EventRoomTopicPayload
    [MessageCategory.Undefined]: undefined
}

export interface ParsedMessage<T extends keyof ParsedMessagePayloadSpec> {
    category: T
    payload: ParsedMessagePayloadSpec[T]
}
