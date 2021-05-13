export const clearEscapeFlag = (s: string) => {
    return s.replace(/[\r\n\t]/g, '')
}
