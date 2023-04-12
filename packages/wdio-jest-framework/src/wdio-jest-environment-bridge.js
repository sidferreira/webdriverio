let receiver = undefined
let sharedGlobals = undefined
const sendGlobals = (incomingGlobals) => {
    sharedGlobals = incomingGlobals
}
const getGlobals = () => {
    return sharedGlobals
}
const setReceiver = (eventHandlerCallback) => {
    receiver = eventHandlerCallback
}
const emit = (...args) => {
    if (receiver) {
        receiver(...args)
    }
}
export default {
    setReceiver,
    emit,
    sendGlobals,
    getGlobals,
}
