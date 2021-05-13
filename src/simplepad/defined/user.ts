export type QRCode = {
    qrcode: string
    clientId: string
}

export type ScanQRCodeStatus = {
    status: number
    statusMsg: string
    nickName: string
    headImage: string
    wxUserName: string
}

export type ManualLogin = {
    userName: string
    nickName: string
    alias: string
    pluginFlag: number
    status: number
    headImage: string
}

export type User = {
    userName: string
    nickName: string
    alias: string
    bigHeadImgUrl: string
    smallHeadImgUrl: string
    sex: number
    country: string
    city: string
    province: string
    status: number
    pluginFlag: number
    snsFlagEx: number
}

// 修改头像后的回包
export interface UploadHeadImage {
    bigHeadImageUrl: string
    smallHeadImageUrl: string
}

// 获取个人二维码
export interface SelfQRCode {
    qrCode: string
    footerWording: string
    revokeQrcodeWording: string
}
