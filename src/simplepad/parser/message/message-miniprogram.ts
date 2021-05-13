export interface MiniProgramXmlSchema {
    msg: {
        appmsg: {
            title: string
            sourcedisplayname: string
            appattach: {
                cdnthumbaeskey: string
                cdnthumburl: string
            }
            weappinfo: {
                username: string
                appid: string
                pagepath: string
                weappiconurl: string
                shareId: string
            }
            thumburl: string
            md5: any
        }
        fromusername: string
    }
}
