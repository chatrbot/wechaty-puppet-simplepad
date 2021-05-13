/**
 * 因为原始数据中存在BigInt类型的数据,直接使用JSON.parse存在精度丢失的问题
 * 这里直接使用正则做了二次处理转化为string
 * 也可以使用第三方解析库json-bigint来处理
 * https://github.com/sidorares/json-bigint
 */
export const JSONParse = (str: string): any => {
    const obj = JSON.parse(str)
    const matchNewMsgId = str.match(/"newMsgId":(\d+)/)
    if (!matchNewMsgId) {
        return obj
    }
    if (matchNewMsgId.length < 2) {
        return null
    }
    obj.data.newMsgId = matchNewMsgId[1]

    return obj
}
