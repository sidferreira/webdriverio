import path from 'node:path'
import type { EventEmitter } from 'node:events'
import flattenDeep from 'lodash.flattendeep'
import type { Circus, Config as JestConfig } from '@jest/types'

import type { Options, Services, Capabilities } from '@wdio/types'

import Jest from 'jest'
import WDIOJestEnvironmentBridge from './wdio-jest-environment-bridge.js'

type HooksArray = {
    [K in keyof Required<Services.HookFunctions>]: Required<Services.HookFunctions>[K][]
}

interface WebdriverIOJestConfig extends Omit<Options.Testrunner, keyof HooksArray>, HooksArray {
    jestOpts?: JestConfig.DefaultOptions
}

/**
 * Jest runner
 */
class JestAdapter {
    private _jestOpts: JestConfig.InitialOptions
    private _jestSuiteStack:any[] = []
    private _jestTestStack:any[] = []
    private _eventEmitter: EventEmitter

    constructor(
        private _cid: string,
        private _config: WebdriverIOJestConfig,
        private _specs: string[],
        private _capabilities: Capabilities.RemoteCapabilities,
        eventEmitter: EventEmitter
    ) {
        if (!this._config.rootDir || !this._config.specs) {
            throw new Error('Missing config')
        }

        const pwd = process.env.PWD || ''
        const rootDir = this._config.rootDir

        const testMatch = (flattenDeep(this._config.specs) as string[])
            .map(specPath =>
                path.resolve(path.join(rootDir, specPath)).replace(pwd, '<rootDir>'))

        this._eventEmitter = eventEmitter

        this._jestOpts = Object.assign({
        }, this._config.jestOpts, {
            testMatch,
            testEnvironment: './node_modules/@wdio/jest-framework/build/wdio-jest-environment.js',
            setupFilesAfterEnv: ['./node_modules/@wdio/jest-framework/build/wdio-jest-setup-after-env.js'],
            // validating
            preset: 'react-native',
            transformIgnorePatterns: [
                'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expect-webdriverio|@wdio/jest-framework)/)',
            ],
        })
    }

    async init() {
        WDIOJestEnvironmentBridge.setReceiver((a:any, b:any ) => {
            this.onJestEvent(a, b)
        })

        return this
    }

    hasTests() {
        return true
    }

    async run() {
        WDIOJestEnvironmentBridge.sendGlobals(global)
        await Jest.run([
            '--config',
            JSON.stringify(this._jestOpts)
        ])
    }

    onJestEvent (event:Circus.AsyncEvent | Circus.SyncEvent, state: Circus.State) {
        switch (event.name) {
        case 'hook_start': {
            this.emit('hook:start', { hook: event.hook })
            return
        }
        case 'hook_success': {
            this.emit('hook:end', { hook: event.hook })
            return
        }
        case 'run_describe_start': {
            this._jestSuiteStack.push(state)
            this.emit('suite:start', { describeBlock: event.describeBlock })
            return
        }
        case 'run_describe_finish': {
            this._jestSuiteStack.pop()
            this.emit('suite:end', { describeBlock: event.describeBlock })
            return
        }
        case 'test_start': {
            this.emit('test:start', { test: event.test })
            return
        }
        case 'test_fn_success': {
            this.emit('test:pass', { test: event.test })
            return
        }
        case 'test_fn_failure': {
            this.emit('test:fail', { test: event.test })
            return
        }
        case 'test_done': {
            this.emit('test:end', { test: event.test })
            this._jestTestStack.pop()
            return
        }
        }
    }

    emit (event: string, payload: {test?: Circus.TestEntry, describeBlock?: Circus.DescribeBlock, hook?: Circus.Hook}) {
        this._eventEmitter.emit(event, payload)
    }
}

const adapterFactory: { init?: Function } = {}
adapterFactory.init = async function (...args: any[]) {
    // @ts-ignore pass along parameters
    const adapter = new JestAdapter(...args)
    const instance = await adapter.init()
    return instance
}

export default adapterFactory
export { JestAdapter, adapterFactory }

declare global {
    namespace WebdriverIO {
        interface JestOpts extends JestConfig.DefaultOptions {}
    }
}