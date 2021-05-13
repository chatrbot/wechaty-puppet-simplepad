export interface DownloadImageByKeyResponse {
    content: string
    imgUrl: string
}

export interface DownloadFileByKeyResponse {
    content: string
    fileUrl: string
}

export interface DownloadVoice {
    content: string
    voiceUrl: string
    voiceLength: number
}

export interface DownloadVideo {
    content: string
    videoUrl: string
}

export const DownloadImageType = {
    Origin: '1',
    HD: '2',
    Thumb: '3'
}
