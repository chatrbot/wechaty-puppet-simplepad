import fs from 'fs-extra'
import os from 'os'
import path from 'path'
import LRU from 'lru-cache'

import { log } from 'brolog'
import FlashStoreSync from 'flash-store'
import {
    ChatroomMember,
    Contact,
    Label,
    Message,
    MessageRevokeInfo,
    SearchContact
} from './defined'
import { FriendshipPayload, RoomInvitationPayload } from 'wechaty-puppet'

const PRE = '[CacheManager]'

export type RoomMemberMap = { [contactId: string]: ChatroomMember }

export class CacheManager {
    private readonly _userName: string

    private _messageCache?: LRU<string, Message> // because message count may be massive, so we just keep them in memory with LRU and with limited capacity
    private _messageRevokeCache?: LRU<string, MessageRevokeInfo>
    private _contactCache?: FlashStoreSync<Contact>
    private _contactSearchCache?: LRU<string, SearchContact>
    private _roomCache?: FlashStoreSync<Contact>
    private _roomMemberCache?: FlashStoreSync<RoomMemberMap>
    private _roomInvitationCache?: FlashStoreSync<RoomInvitationPayload>
    private _friendshipCache?: FlashStoreSync<FriendshipPayload>

    private _labelList?: Label[]

    constructor(userName: string) {
        this._userName = userName
    }

    async init(): Promise<void> {
        if (this._messageCache) {
            throw new Error('already initialized')
        }

        const baseDir = path.join(
            os.homedir(),
            path.sep,
            '.wechaty',
            'puppet-simplepad-cache',
            path.sep,
            this._userName,
            path.sep
        )

        const baseDirExist = await fs.pathExists(baseDir)
        if (!baseDirExist) {
            await fs.mkdirp(baseDir)
        }

        this._messageCache = new LRU<string, Message>({
            max: 1000,
            // length: function (n) { return n * 2},
            dispose(key: string, val: any) {
                log.silly(
                    PRE,
                    'constructor() lruOptions.dispose(%s, %s)',
                    key,
                    JSON.stringify(val)
                )
            },
            maxAge: 1000 * 60 * 60
        })

        this._messageRevokeCache = new LRU<string, MessageRevokeInfo>({
            max: 1000,
            // length: function (n) { return n * 2},
            dispose(key: string, val: any) {
                log.silly(
                    PRE,
                    'constructor() lruOptions.dispose(%s, %s)',
                    key,
                    JSON.stringify(val)
                )
            },
            maxAge: 1000 * 60 * 60
        })

        this._contactCache = new FlashStoreSync(
            path.join(baseDir, 'contact-raw-payload')
        )
        this._contactSearchCache = new LRU<string, SearchContact>({
            max: 1000,
            // length: function (n) { return n * 2},
            dispose(key: string, val: any) {
                log.silly(
                    PRE,
                    'constructor() lruOptions.dispose(%s, %s)',
                    key,
                    JSON.stringify(val)
                )
            },
            maxAge: 1000 * 60 * 60
        })

        this._roomCache = new FlashStoreSync(
            path.join(baseDir, 'room-raw-payload')
        )
        this._roomMemberCache = new FlashStoreSync(
            path.join(baseDir, 'room-member-raw-payload')
        )
        this._roomInvitationCache = new FlashStoreSync(
            path.join(baseDir, 'room-invitation-raw-payload')
        )
        this._friendshipCache = new FlashStoreSync(
            path.join(baseDir, 'friendship-raw-payload')
        )

        const contactTotal = await this._contactCache.size

        log.verbose(
            PRE,
            `initCache() inited ${contactTotal} Contacts,  cachedir="${baseDir}"`
        )
    }

    async close() {
        log.verbose(PRE, 'close()')

        if (
            this._contactCache &&
            this._roomMemberCache &&
            this._roomCache &&
            this._friendshipCache &&
            this._roomInvitationCache &&
            this._messageCache
        ) {
            log.silly(PRE, 'close() closing caches ...')

            await Promise.all([
                this._contactCache.close(),
                this._roomMemberCache.close(),
                this._roomCache.close(),
                this._friendshipCache.close(),
                this._roomInvitationCache.close()
            ])

            this._contactCache = undefined
            this._roomMemberCache = undefined
            this._roomCache = undefined
            this._friendshipCache = undefined
            this._roomInvitationCache = undefined
            this._messageCache = undefined

            log.silly(PRE, 'close() cache closed.')
        } else {
            log.verbose(PRE, 'close() cache not exist.')
        }
    }

    /**
     * -------------------------------
     * Message Section
     * --------------------------------
     */
    async getMessage(messageId: string): Promise<Message | undefined> {
        return this._messageCache!.get(messageId)
    }

    async setMessage(messageId: string, payload: Message): Promise<void> {
        await this._messageCache!.set(messageId, payload)
    }

    async hasMessage(messageId: string): Promise<boolean> {
        return this._messageCache!.has(messageId)
    }

    async getMessageRevokeInfo(
        messageId: string
    ): Promise<MessageRevokeInfo | undefined> {
        return this._messageRevokeCache!.get(messageId)
    }

    async setMessageRevokeInfo(
        messageId: string,
        messageSendResult: MessageRevokeInfo
    ): Promise<void> {
        await this._messageRevokeCache!.set(messageId, messageSendResult)
    }

    /**
     * -------------------------------
     * Contact Section
     * --------------------------------
     */
    async getContact(contactId: string): Promise<Contact | undefined> {
        return this._contactCache!.get(contactId)
    }

    async setContact(contactId: string, payload: Contact): Promise<void> {
        await this._contactCache!.set(contactId, payload)
    }

    async deleteContact(contactId: string): Promise<void> {
        await this._contactCache!.delete(contactId)
    }

    async getContactIds(): Promise<string[]> {
        const result: string[] = []
        for await (const key of this._contactCache!.keys()) {
            result.push(key)
        }

        return result
    }

    async getAllContacts(): Promise<Contact[]> {
        const result: Contact[] = []
        for await (const value of this._contactCache!.values()) {
            result.push(value)
        }
        return result
    }

    async hasContact(contactId: string): Promise<boolean> {
        return this._contactCache!.has(contactId)
    }

    async getContactCount(): Promise<number> {
        return this._contactCache!.size
    }

    /**
     * contact search
     */

    async getContactSearch(id: string): Promise<SearchContact | undefined> {
        return this._contactSearchCache!.get(id)
    }

    async setContactSearch(id: string, payload: SearchContact): Promise<void> {
        await this._contactSearchCache!.set(id, payload)
    }

    async hasContactSearch(id: string): Promise<boolean> {
        return this._contactSearchCache!.has(id)
    }

    /**
     * -------------------------------
     * Room Section
     * --------------------------------
     */
    async getRoom(roomId: string): Promise<Contact | undefined> {
        return this._roomCache!.get(roomId)
    }

    async setRoom(roomId: string, payload: Contact): Promise<void> {
        await this._roomCache!.set(roomId, payload)
    }

    async deleteRoom(roomId: string): Promise<void> {
        await this._roomCache!.delete(roomId)
    }

    async getRoomIds(): Promise<string[]> {
        const result: string[] = []
        for await (const key of this._roomCache!.keys()) {
            result.push(key)
        }
        return result
    }

    async getRoomCount(): Promise<number> {
        return this._roomCache!.size
    }

    async hasRoom(roomId: string): Promise<boolean> {
        return this._roomCache!.has(roomId)
    }
    /**
     * -------------------------------
     * Room Member Section
     * --------------------------------
     */
    async getRoomMember(roomId: string): Promise<RoomMemberMap | undefined> {
        return this._roomMemberCache!.get(roomId)
    }

    async setRoomMember(roomId: string, payload: RoomMemberMap): Promise<void> {
        await this._roomMemberCache!.set(roomId, payload)
    }

    async deleteRoomMember(roomId: string): Promise<void> {
        await this._roomMemberCache!.delete(roomId)
    }

    /**
     * -------------------------------
     * Room Invitation Section
     * -------------------------------
     */
    async getRoomInvitation(
        messageId: string
    ): Promise<RoomInvitationPayload | undefined> {
        return this._roomInvitationCache!.get(messageId)
    }

    async setRoomInvitation(
        messageId: string,
        payload: RoomInvitationPayload
    ): Promise<void> {
        await this._roomInvitationCache!.set(messageId, payload)
    }

    async deleteRoomInvitation(messageId: string): Promise<void> {
        await this._roomInvitationCache!.delete(messageId)
    }

    /**
     * -------------------------------
     * Friendship Cache Section
     * --------------------------------
     */
    async getFriendshipRawPayload(
        id: string
    ): Promise<FriendshipPayload | undefined> {
        return this._friendshipCache!.get(id)
    }

    async setFriendshipRawPayload(id: string, payload: FriendshipPayload) {
        await this._friendshipCache!.set(id, payload)
    }

    getLabelList(): Label[] | undefined {
        return this._labelList
    }

    setLabelList(labelList: Label[]): void {
        this._labelList = labelList
    }
}
