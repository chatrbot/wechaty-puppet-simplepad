const version = '/api/v1'

export const URI = {
    // 基本操作
    GetQRCode: version + '/login/getCode',
    CheckScanStatus: version + '/login/checkCode',
    ManualLogin: version + '/login/manual',
    GetOnlineInfo: version + '/login/getOnlineInfo',
    Logout: version + '/login/logout',
    // 个人信息
    GetProfile: version + '/profile/getProfile',
    UploadHeadImage: version + '/profile/uploadHeadImage',
    ModifyNickName: version + '/profile/modifyNickName',
    ModifySignature: version + '/profile/modifySignature',
    GetSelfQRCode: version + '/profile/getQRCode',
    // 联系人
    InitContact: version + '/contact/initContact',
    SetUserRemark: version + '/contact/setUserRemark',
    GetContactDetail: version + '/contact/getContact',
    BatchGetContactDetail: version + '/contact/batchGetContactBriefInfo',
    DelContact: version + '/contact/delChatContact',
    TopContact: version + '/toppingContact',
    ApplyNewContact: version + '/contact/applyNewFriend',
    VerifyFriendApply: version + '/contact/verifyUser',
    BlackContact: version + '/contact/blackUser',
    SearchContact: version + '/contact/searchContact',
    // 群
    CreateChatroom: version + '/chatroom/createChatRoom',
    GetChatroomMemberDetail: version + '/chatroom/getChatRoomMemberDetail',
    GetChatroomExtraInfo: version + '/chatroom/getChatRoomInfoDetail',
    ModifyChatroomName: version + '/chatroom/modifyGroupName',
    ModifyChatroomAnnouncement: version + '/chatroom/setChatRoomAnnouncement',
    QuitChatroom: version + '/chatroom/quitChatRoom',
    GetChatroomQRCode: version + '/group/getQRCode',
    DelChatroomMember: version + '/chatroom/delChatRoomMember',
    AddChatRoomMember: version + '/chatroom/addChatRoomMember',
    AgreeInviteJoinChatRoom: version + '/chatroom/agreeInviteJoinChatRoom',
    // 标签
    GetContactLabelList: version + '/contact/getContactLabelList',
    AddContactLabel: version + '/contact/addContactLabel',
    EditContactLabel: version + '/contact/editContactLabel',
    DelContactLabel: version + '/contact/delContactLabel',
    // 消息发送
    SendTextMessage: version + '/chat/sendText',
    SendMiniProgram: version + '/chat/sendSmallApp',
    SendPersonalCard: version + '/chat/sendPersonalCard',
    SendUrl: version + '/chat/sendLink',
    SendPic: version + '/chat/sendPic',
    SendVoice: version + '/chat/sendVoice',
    SendVideo: version + '/chat/sendVideo',
    SendEmoji: version + '/chat/sendEmoji',
    SendFile: version + '/chat/sendFile',
    // 消息撤回
    RevokeMessage: version + '/chat/revokeMsg',
    // 资源下载
    DownloadImage: version + '/chat/downloadImage',
    DownloadImageByKey: version + '/chat/downloadImageByKey',
    DownloadFileByKey: version + '/chat/downloadFileByKey',
    DownloadVoice: version + '/chat/downloadVoice',
    DownloadVideo: version + '/chat/downloadVideo',
    // 资源上传
    UploadFile: '/upload'
}
