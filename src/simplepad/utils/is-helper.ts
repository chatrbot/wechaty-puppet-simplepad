export function isRoomId(id?: string): boolean {
    if (!id) {
        return false
    }
    return /@chatroom$/.test(id)
}

export function isIMRoomId(id?: string): boolean {
    if (!id) {
        return false
    }
    return /@im.chatroom$/.test(id)
}

export function isContactId(id?: string): boolean {
    if (!id) {
        return false
    }
    return !isRoomId(id) && !isIMRoomId(id) && !isIMContactId(id)
}

export function isIMContactId(id?: string): boolean {
    if (!id) {
        return false
    }
    return /@openim$/.test(id)
}
