export interface BaseResponse<T = any> {
    code: number
    data: T
    msg: string
    traceId: number
}

export const HeartbeatCheckReply = 'pong'

// 用户手机端主动退出
export const ClientQuitAccount = '{"type":2,"data":}'
