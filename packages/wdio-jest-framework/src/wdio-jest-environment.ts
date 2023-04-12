import type { Circus } from '@jest/types'
import { TestEnvironment } from 'jest-environment-jsdom'
import WDIOJestEnvironmentBridge from './wdio-jest-environment-bridge.js'

export default class WDIOJestEnvironment extends TestEnvironment {
    async setup() {
        await super.setup()
        const wdioGlobals = WDIOJestEnvironmentBridge.getGlobals()
        this.global.$ = wdioGlobals.$
    }
    handleTestEvent: Circus.EventHandler = (event, state) => {
        WDIOJestEnvironmentBridge.emit(event, state)
    }
}
