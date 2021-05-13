/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import path  from 'path'

import {
  ContactPayload,

  FileBox,

  FriendshipPayload,

  ImageType,

  MessagePayload,

  Puppet,
  PuppetOptions,

  RoomInvitationPayload,
  RoomMemberPayload,
  RoomPayload,

  UrlLinkPayload,
  MiniProgramPayload,

  log,
  PayloadType,
}                           from 'wechaty-puppet'

import {
  CHATIE_OFFICIAL_ACCOUNT_QRCODE,
  qrCodeForChatie,
  VERSION,
}                                   from './config'

// import { Attachment } from './mock/user/types'

import {
  Mocker,
  // ContactMock,
}                     from './mock/mod'
// import { UrlLink, MiniProgram } from 'wechaty'

export type PuppetMockOptions = PuppetOptions & {
  mocker?: Mocker,
}

class PuppetMock extends Puppet {

  static readonly VERSION = VERSION

  private loopTimer?: NodeJS.Timer

  mocker: Mocker

  constructor (
    public options: PuppetMockOptions = {},
  ) {
    super(options)
    log.verbose('PuppetMock', 'constructor()')

    if (options.mocker) {
      log.verbose('PuppetMock', 'constructor() use options.mocker')
      this.mocker = options.mocker
    } else {
      log.verbose('PuppetMock', 'constructor() creating the default mocker')
      this.mocker = new Mocker()
      // this.mocker.use(SimpleBehavior())
    }
    this.mocker.puppet = this
  }

  async start (): Promise<void> {
    log.verbose('PuppetMock', 'start()')

    if (this.state.on()) {
      log.warn('PuppetMock', 'start() is called on a ON puppet. await ready(on) and return.')
      await this.state.ready('on')
      return
    }

    this.state.on('pending')

    // Do some async initializing tasks

    this.state.on(true)

    /**
     * Start mocker after the puppet fully turned ON.
     */
    setImmediate(() => this.mocker.start())
  }

  async stop (): Promise<void> {
    log.verbose('PuppetMock', 'stop()')

    if (this.state.off()) {
      log.warn('PuppetMock', 'stop() is called on a OFF puppet. await ready(off) and return.')
      await this.state.ready('off')
      return
    }

    this.state.off('pending')

    if (this.loopTimer) {
      clearInterval(this.loopTimer)
    }

    this.mocker.stop()

    if (this.logonoff()) {
      await this.logout()
    }

    // await some tasks...
    this.state.off(true)
  }

  login (contactId: string): Promise<void> {
    log.verbose('PuppetMock', 'login()')
    return super.login(contactId)
  }

  async logout (): Promise<void> {
    log.verbose('PuppetMock', 'logout()')

    if (!this.id) {
      throw new Error('logout before login?')
    }

    this.emit('logout', { contactId: this.id, data: 'test' }) // before we will throw above by logonoff() when this.user===undefined
    this.id = undefined

    // TODO: do the logout job
  }

  ding (data?: string): void {
    log.silly('PuppetMock', 'ding(%s)', data || '')
    setTimeout(() => this.emit('dong', { data: data || '' }), 1000)
  }

  unref (): void {
    log.verbose('PuppetMock', 'unref()')
    super.unref()
    if (this.loopTimer) {
      this.loopTimer.unref()
    }
  }

  /**
   *
   * ContactSelf
   *
   *
   */
  async contactSelfQRCode (): Promise<string> {
    log.verbose('PuppetMock', 'contactSelfQRCode()')
    return CHATIE_OFFICIAL_ACCOUNT_QRCODE
  }

  async contactSelfName (name: string): Promise<void> {
    log.verbose('PuppetMock', 'contactSelfName(%s)', name)
  }

  async contactSelfSignature (signature: string): Promise<void> {
    log.verbose('PuppetMock', 'contactSelfSignature(%s)', signature)
  }

  /**
   *
   * Contact
   *
   */
  contactAlias (contactId: string)                      : Promise<string>
  contactAlias (contactId: string, alias: string | null): Promise<void>

  async contactAlias (contactId: string, alias?: string | null): Promise<void | string> {
    log.verbose('PuppetMock', 'contactAlias(%s, %s)', contactId, alias)

    if (typeof alias === 'undefined') {
      return 'mock alias'
    }
  }

  public async contactPhone (contactId: string): Promise<string[]>
  public async contactPhone (contactId: string, phoneList: string[]): Promise<void>

  public async contactPhone (contactId: string, phoneList?: string[]): Promise<string[] | void> {
    log.verbose('PuppetMock', 'contactPhone(%s, %s)', contactId, phoneList)
    if (typeof phoneList === 'undefined') {
      return []
    }
  }

  public async contactCorporationRemark (contactId: string, corporationRemark: string) {
    log.verbose('PuppetMock', 'contactCorporationRemark(%s, %s)', contactId, corporationRemark)
  }

  public async contactDescription (contactId: string, description: string) {
    log.verbose('PuppetMock', 'contactDescription(%s, %s)', contactId, description)
  }

  public async contactList (): Promise<string[]> {
    log.verbose('PuppetMock', 'contactList()')
    return [...this.mocker.cacheContactPayload.keys()]
  }

  async contactQRCode (contactId: string): Promise<string> {
    log.verbose('PuppetMock', 'contactQRCode(%s)', contactId)
    if (contactId !== this.selfId()) {
      throw new Error('can not set avatar for others')
    }

    throw new Error('not supported')
    // return await this.bridge.WXqr
  }

  async contactAvatar (contactId: string)                : Promise<FileBox>
  async contactAvatar (contactId: string, file: FileBox) : Promise<void>

  async contactAvatar (contactId: string, file?: FileBox): Promise<void | FileBox> {
    log.verbose('PuppetMock', 'contactAvatar(%s)', contactId)

    /**
     * 1. set
     */
    if (file) {
      return
    }

    /**
     * 2. get
     */
    const WECHATY_ICON_PNG = path.resolve('../../docs/images/wechaty-icon.png')
    return FileBox.fromFile(WECHATY_ICON_PNG)
  }

  async contactRawPayloadParser (payload: ContactPayload) { return payload }
  async contactRawPayload (id: string): Promise<ContactPayload> {
    log.verbose('PuppetMock', 'contactRawPayload(%s)', id)
    return this.mocker.contactPayload(id)
  }

  /**
   *
   * Message
   *
   */
  async messageContact (
    messageId: string,
  ): Promise<string> {
    log.verbose('PuppetMock', 'messageContact(%s)', messageId)
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof ContactMock) {
    //   return attachment.id
    // }
    return ''
  }

  async messageImage (
    messageId: string,
    imageType: ImageType,
  ) : Promise<FileBox> {
    log.verbose('PuppetMock', 'messageImage(%s, %s[%s])',
      messageId,
      imageType,
      ImageType[imageType],
    )
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof FileBox) {
    //   return attachment
    // }
    return FileBox.fromQRCode('fake-qrcode')
  }

  async messageRecall (
    messageId: string,
  ): Promise<boolean> {
    log.verbose('PuppetMock', 'messageRecall(%s)', messageId)
    return false
  }

  async messageFile (id: string): Promise<FileBox> {
    // const attachment = this.mocker.MockMessage.loadAttachment(id)
    // if (attachment instanceof FileBox) {
    //   return attachment
    // }
    return FileBox.fromBase64(
      'cRH9qeL3XyVnaXJkppBuH20tf5JlcG9uFX1lL2IvdHRRRS9kMMQxOPLKNYIzQQ==',
      'mock-file' + id + '.txt',
    )
  }

  async messageUrl (messageId: string)  : Promise<UrlLinkPayload> {
    log.verbose('PuppetMock', 'messageUrl(%s)', messageId)
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof UrlLink) {
    //   return attachment.payload
    // }
    return {
      title : 'mock title for ' + messageId,
      url   : 'https://mock.url',
    }
  }

  async messageMiniProgram (messageId: string): Promise<MiniProgramPayload> {
    log.verbose('PuppetMock', 'messageMiniProgram(%s)', messageId)
    // const attachment = this.mocker.MockMessage.loadAttachment(messageId)
    // if (attachment instanceof MiniProgram) {
    //   return attachment.payload
    // }
    return {
      title : 'mock title for ' + messageId,
    }
  }

  async messageRawPayloadParser (payload: MessagePayload) { return payload }
  async messageRawPayload (id: string): Promise<MessagePayload> {
    log.verbose('PuppetMock', 'messageRawPayload(%s)', id)
    return this.mocker.messagePayload(id)
  }

  private async messageSend (
    conversationId: string,
    something: string | FileBox, // | Attachment
  ): Promise<void> {
    log.verbose('PuppetMock', 'messageSend(%s, %s)', conversationId, something)
    if (!this.id) {
      throw new Error('no this.id')
    }

    const user = this.mocker.ContactMock.load(this.id)
    let conversation

    if (/@/.test(conversationId)) {
      // FIXME: extend a new puppet method messageRoomSendText, etc, for Room message?
      conversation = this.mocker.RoomMock.load(conversationId)
    } else {
      conversation = this.mocker.ContactMock.load(conversationId)
    }
    user.say(something).to(conversation)
  }

  async messageSendText (
    conversationId: string,
    text     : string,
  ): Promise<void> {
    return this.messageSend(conversationId, text)
  }

  async messageSendFile (
    conversationId: string,
    file     : FileBox,
  ): Promise<void> {
    return this.messageSend(conversationId, file)
  }

  async messageSendContact (
    conversationId: string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'messageSendUrl(%s, %s)', conversationId, contactId)

    // const contact = this.mocker.MockContact.load(contactId)
    // return this.messageSend(conversationId, contact)
  }

  async messageSendUrl (
    conversationId: string,
    urlLinkPayload: UrlLinkPayload,
  ) : Promise<void> {
    log.verbose('PuppetMock', 'messageSendUrl(%s, %s)', conversationId, JSON.stringify(urlLinkPayload))

    // const url = new UrlLink(urlLinkPayload)
    // return this.messageSend(conversationId, url)
  }

  async messageSendMiniProgram (
    conversationId: string,
    miniProgramPayload: MiniProgramPayload,
  ): Promise<void> {
    log.verbose('PuppetMock', 'messageSendMiniProgram(%s, %s)', conversationId, JSON.stringify(miniProgramPayload))
    // const miniProgram = new MiniProgram(miniProgramPayload)
    // return this.messageSend(conversationId, miniProgram)
  }

  async messageForward (
    conversationId: string,
    messageId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'messageForward(%s, %s)',
      conversationId,
      messageId,
    )
  }

  /**
   *
   * Room
   *
   */
  async roomRawPayloadParser (payload: RoomPayload) { return payload }
  async roomRawPayload (id: string): Promise<RoomPayload> {
    log.verbose('PuppetMock', 'roomRawPayload(%s)', id)
    return this.mocker.roomPayload(id)
  }

  async roomList (): Promise<string[]> {
    log.verbose('PuppetMock', 'roomList()')
    return [...this.mocker.cacheRoomPayload.keys()]
  }

  async roomDel (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'roomDel(%s, %s)', roomId, contactId)
  }

  async roomAvatar (roomId: string): Promise<FileBox> {
    log.verbose('PuppetMock', 'roomAvatar(%s)', roomId)

    const payload = await this.roomPayload(roomId)

    if (payload.avatar) {
      return FileBox.fromUrl(payload.avatar)
    }
    log.warn('PuppetMock', 'roomAvatar() avatar not found, use the chatie default.')
    return qrCodeForChatie()
  }

  async roomAdd (
    roomId    : string,
    contactId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'roomAdd(%s, %s)', roomId, contactId)
  }

  async roomTopic (roomId: string)                : Promise<string>
  async roomTopic (roomId: string, topic: string) : Promise<void>

  async roomTopic (
    roomId: string,
    topic?: string,
  ): Promise<void | string> {
    log.verbose('PuppetMock', 'roomTopic(%s, %s)', roomId, topic)

    if (typeof topic === 'undefined') {
      return 'mock room topic'
    }

    await this.dirtyPayload(PayloadType.Room, roomId)
  }

  async roomCreate (
    contactIdList : string[],
    topic         : string,
  ): Promise<string> {
    log.verbose('PuppetMock', 'roomCreate(%s, %s)', contactIdList, topic)

    return 'mock_room_id'
  }

  async roomQuit (roomId: string): Promise<void> {
    log.verbose('PuppetMock', 'roomQuit(%s)', roomId)
  }

  async roomQRCode (roomId: string): Promise<string> {
    log.verbose('PuppetMock', 'roomQRCode(%s)', roomId)
    return roomId + ' mock qrcode'
  }

  async roomMemberList (roomId: string) : Promise<string[]> {
    log.verbose('PuppetMock', 'roomMemberList(%s)', roomId)
    return []
  }

  async roomMemberRawPayload (roomId: string, contactId: string): Promise<RoomMemberPayload>  {
    log.verbose('PuppetMock', 'roomMemberRawPayload(%s, %s)', roomId, contactId)
    return {
      avatar    : 'mock-avatar-data',
      id        : 'xx',
      name      : 'mock-name',
      roomAlias : 'yy',
    }
  }

  async roomMemberRawPayloadParser (rawPayload: RoomMemberPayload): Promise<RoomMemberPayload>  {
    log.verbose('PuppetMock', 'roomMemberRawPayloadParser(%s)', rawPayload)
    return rawPayload
  }

  async roomAnnounce (roomId: string)                : Promise<string>
  async roomAnnounce (roomId: string, text: string)  : Promise<void>

  async roomAnnounce (roomId: string, text?: string) : Promise<void | string> {
    if (text) {
      return
    }
    return 'mock announcement for ' + roomId
  }

  /**
   *
   * Room Invitation
   *
   */
  async roomInvitationAccept (roomInvitationId: string): Promise<void> {
    log.verbose('PuppetMock', 'roomInvitationAccept(%s)', roomInvitationId)
  }

  async roomInvitationRawPayload (roomInvitationId: string): Promise<any> {
    log.verbose('PuppetMock', 'roomInvitationRawPayload(%s)', roomInvitationId)
  }

  async roomInvitationRawPayloadParser (rawPayload: any): Promise<RoomInvitationPayload> {
    log.verbose('PuppetMock', 'roomInvitationRawPayloadParser(%s)', JSON.stringify(rawPayload))
    return rawPayload
  }

  /**
   *
   * Friendship
   *
   */
  async friendshipRawPayload (id: string): Promise<any> {
    return { id } as any
  }

  async friendshipRawPayloadParser (rawPayload: any): Promise<FriendshipPayload> {
    return rawPayload
  }

  async friendshipSearchPhone (
    phone: string,
  ): Promise<null | string> {
    log.verbose('PuppetMock', 'friendshipSearchPhone(%s)', phone)
    return null
  }

  async friendshipSearchWeixin (
    weixin: string,
  ): Promise<null | string> {
    log.verbose('PuppetMock', 'friendshipSearchWeixin(%s)', weixin)
    return null
  }

  async friendshipAdd (
    contactId : string,
    hello     : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'friendshipAdd(%s, %s)', contactId, hello)
  }

  async friendshipAccept (
    friendshipId : string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'friendshipAccept(%s)', friendshipId)
  }

  /**
   *
   * Tag
   *
   */
  async tagContactAdd (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'tagContactAdd(%s)', tagId, contactId)
  }

  async tagContactRemove (
    tagId: string,
    contactId: string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'tagContactRemove(%s)', tagId, contactId)
  }

  async tagContactDelete (
    tagId: string,
  ): Promise<void> {
    log.verbose('PuppetMock', 'tagContactDelete(%s)', tagId)
  }

  async tagContactList (
    contactId?: string,
  ): Promise<string[]> {
    log.verbose('PuppetMock', 'tagContactList(%s)', contactId)
    return []
  }

}

export { PuppetMock }
export default PuppetMock
