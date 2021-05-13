export interface BaseResponse<T = any> {
    code: number
    data: T
    msg: string
    traceId: number
}
