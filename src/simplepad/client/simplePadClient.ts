import SimplePadAPI from './api'

class SimplePadClient extends SimplePadAPI {
    constructor(token: string, timeout = 10) {
        super(token, timeout)
    }
}

export default SimplePadClient
