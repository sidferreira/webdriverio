// import url from 'node:url'
import path from 'node:path'
import type { EventEmitter } from 'node:events'
import flattenDeep from 'lodash.flattendeep'
import type { Circus, Config as JestConfig } from '@jest/types'

// import Jasmine from 'jasmine'
// import logger from '@wdio/logger'
// import { wrapGlobalTestMethod, executeHooksWithArgs } from '@wdio/utils'
// import { expect } from 'expect-webdriverio'
// import { _setGlobal } from '@wdio/globals'
import type { Options, Services, Capabilities } from '@wdio/types'

import Jest from 'jest'
import WDIOJestEnvironmentBridge from './wdio-jest-environment-bridge.js'

// import JasmineReporter from './reporter.js'
// import type {
//     JasmineOpts as jasmineNodeOpts, ResultHandlerPayload, FrameworkMessage, FormattedMessage, TestEvent
// } from './types.js'

// const INTERFACES = {
//     bdd: ['beforeAll', 'beforeEach', 'it', 'xit', 'fit', 'afterEach', 'afterAll']
// }

const useJasmine = false

// const TEST_INTERFACES = ['it', 'fit', 'xit']
// const NOOP = function noop() { }
// const DEFAULT_TIMEOUT_INTERVAL = 60000
// const FILE_PROTOCOL = 'file://'

// const log = logger('@wdio/jasmine-framework')

type HooksArray = {
    [K in keyof Required<Services.HookFunctions>]: Required<Services.HookFunctions>[K][]
}

interface WebdriverIOJestConfig extends Omit<Options.Testrunner, keyof HooksArray>, HooksArray {
    jestOpts?: JestConfig.DefaultOptions
}

// const _jestCliOpts = [
//     // "--watch",
//     '--runInBand',
//     '--config',
//     JSON.stringify({
//         roots: ['<rootDir>/src'],
//         collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}', '!src/**/*.d.ts'],
//         setupFiles: [
//             '/Users/sidney.ferreira/dev/wealthsimple/tests/my-app-ts/node_modules/react-app-polyfill/jsdom.js',
//         ],
//         setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
//         testMatch: [
//             '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
//             '<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}',
//         ],
//         testEnvironment: 'jsdom',
//         transform: {
//             '^.+.(js|jsx|mjs|cjs|ts|tsx)$':
//           '/Users/sidney.ferreira/dev/wealthsimple/tests/my-app-ts/node_modules/react-scripts/config/jest/babelTransform.js',
//             '^.+.css$':
//           '/Users/sidney.ferreira/dev/wealthsimple/tests/my-app-ts/node_modules/react-scripts/config/jest/cssTransform.js',
//             '^(?!.*.(js|jsx|mjs|cjs|ts|tsx|css|json)$)':
//           '/Users/sidney.ferreira/dev/wealthsimple/tests/my-app-ts/node_modules/react-scripts/config/jest/fileTransform.js',
//         },
//         transformIgnorePatterns: [
//             '[/]node_modules[/].+.(js|jsx|mjs|cjs|ts|tsx)$',
//             '^.+.module.(css|sass|scss)$',
//         ],
//         modulePaths: [],
//         moduleNameMapper: {
//             '^react-native$': 'react-native-web',
//             '^.+.module.(css|sass|scss)$': 'identity-obj-proxy',
//         },
//         moduleFileExtensions: [
//             'web.js',
//             'js',
//             'web.ts',
//             'ts',
//             'web.tsx',
//             'tsx',
//             'json',
//             'web.jsx',
//             'jsx',
//             'node',
//         ],
//         watchPlugins: [
//             'jest-watch-typeahead/filename',
//             'jest-watch-typeahead/testname',
//         ],
//         resetMocks: true,
//         verbose: true,
//         rootDir: '/Users/sidney.ferreira/dev/wealthsimple/tests/my-app-ts',
//     }),
//     // "",
//     '--env',
//     '/Users/sidney.ferreira/dev/wealthsimple/tests/my-app-ts/src/reporter/jest-environment-wdio.js',
// ]

/**
 * Jasmine runner
 */
class JestAdapter {
    private _jestOpts: JestConfig.InitialOptions
    private _jestSuiteStack:any[] = []
    private _jestTestStack:any[] = []
    private _eventEmitter: EventEmitter

    // private _jasmineOpts: jasmineNodeOpts
    // private _reporter: JasmineReporter
    private _totalTests = 0
    private _hasTests = true
    private _lastTest?: any
    private _lastSpec?: any

    // private _jrunner = new Jasmine({})

    constructor(
        private _cid: string,
        private _config: WebdriverIOJestConfig,
        private _specs: string[],
        private _capabilities: Capabilities.RemoteCapabilities,
        reporter: EventEmitter
    ) {
        if (!this._config.rootDir || !this._config.specs) {
            throw new Error('Missing config')
        }

        const pwd = process.env.PWD || ''
        const rootDir = this._config.rootDir

        const testMatch = (flattenDeep(this._config.specs) as string[])
            .map(specPath =>
                path.resolve(path.join(rootDir, specPath)).replace(pwd, '<rootDir>'))

        this._eventEmitter = reporter

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

        // this._jestConfig = {
        //     testMatch,
        //     testEnvironment: './node_modules/@wdio/jest-framework/build/wdio-jest-environment.js',
        //     setupFilesAfterEnv: ['./node_modules/@wdio/jest-framework/build/wdio-jest-setup-after-env.js'],

        //     // roots: [`${this._config.rootDir}/..`],
        //     // testMatch: this._config.specs as string[],
        //     // testMatch: ['/Users/sidney.ferreira/dev/wealthsimple/tests/wdiojest/e2e/tests/specs/app.forms.spec.ts'],

        //     // //fixing?
        //     preset: 'react-native',
        //     transformIgnorePatterns: [
        //         'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expect-webdriverio|@wdio/jest-framework)/)',
        //     ],
        // }
        // console.log(`this._jestConfig`, this._jestConfig)

        // this._reporter = new JasmineReporter(reporter, {
        //     cid: this._cid,
        //     specs: this._specs,
        //     cleanStack: this._jasmineOpts.cleanStack
        // })
        this._hasTests = true
        // this._jrunner.exitOnCompletion = false
        // console.log('process.env', process.env)
        // console.log('__filename', __filename)
    }

    async init() {
        // if (useJasmine) {
        //     const self = this

        //     const { jasmine } = this._jrunner
        //     // @ts-ignore outdated
        //     const jasmineEnv = jasmine.getEnv()
        //     this._specs.forEach((spec) => this._jrunner.addSpecFile(
        //         /**
        //          * as Jasmine doesn't support file:// formats yet we have to
        //          * remove it before adding it to Jasmine
        //          */
        //         spec.startsWith(FILE_PROTOCOL)
        //             ? url.fileURLToPath(spec)
        //             : spec
        //     ))

        //     // @ts-ignore only way to hack timeout into jasmine
        //     jasmine.DEFAULT_TIMEOUT_INTERVAL = this._jasmineOpts.defaultTimeoutInterval || DEFAULT_TIMEOUT_INTERVAL
        //     jasmineEnv.addReporter(this._reporter)

        //     /**
        //      * Filter specs to run based on jasmineOpts.grep and jasmineOpts.invert
        //      */
        //     jasmineEnv.configure({
        //         specFilter: this._jasmineOpts.specFilter || this.customSpecFilter.bind(this),
        //         stopOnSpecFailure: Boolean(this._jasmineOpts.stopOnSpecFailure),
        //         failSpecWithNoExpectations: Boolean(this._jasmineOpts.failSpecWithNoExpectations),
        //         failFast: this._jasmineOpts.failFast,
        //         random: Boolean(this._jasmineOpts.random),
        //         seed: Boolean(this._jasmineOpts.seed),
        //         oneFailurePerSpec: Boolean(
        //             // depcrecated old property
        //             this._jasmineOpts.stopSpecOnExpectationFailure ||
        //             this._jasmineOpts.oneFailurePerSpec
        //         )
        //     })

        //     /**
        //      * enable expectHandler
        //      */
        //     jasmine.Spec.prototype.addExpectationResult = this.getExpectationResultHandler(jasmine)

        //     const hookArgsFn = (context: unknown): [unknown, unknown] => [{ ...(self._lastTest || {}) }, context]

        //     const emitHookEvent = (
        //         fnName: string,
        //         eventType: string
        //     ) => (
        //         _test: never,
        //         _context: never,
        //         { error }: { error?: jasmine.FailedExpectation } = {}
        //     ) => {
        //         console.log('>>>emitHookEvent', { fnName, eventType, error })
        //         const title = `"${fnName === 'beforeAll' ? 'before' : 'after'} all" hook`
        //         const hook = {
        //             id: '',
        //             start: new Date(),
        //             type: 'hook' as const,
        //             description: title,
        //             fullName: title,
        //             duration: null,
        //             properties: {},
        //             passedExpectations: [],
        //             pendingReason: '',
        //             failedExpectations: [],
        //             deprecationWarnings: [],
        //             status: '',
        //             debugLogs: null,
        //             ...(error ? { error } : {})
        //         }

        //         this._reporter.emit('hook:' + eventType, hook)
        //     }

        //     /**
        //      * wrap commands
        //      */
        //     INTERFACES.bdd.forEach((fnName) => {
        //         const isTest = TEST_INTERFACES.includes(fnName)
        //         const beforeHook = [...this._config.beforeHook]
        //         const afterHook = [...this._config.afterHook]

        //         /**
        //          * add beforeAll and afterAll hooks to reporter
        //          */
        //         if (fnName.includes('All')) {
        //             beforeHook.push(emitHookEvent(fnName, 'start'))
        //             afterHook.push(emitHookEvent(fnName, 'end'))
        //         }

        //         wrapGlobalTestMethod(
        //             isTest,
        //             isTest ? this._config.beforeTest : beforeHook,
        //             hookArgsFn,
        //             isTest ? this._config.afterTest : afterHook,
        //             hookArgsFn,
        //             fnName,
        //             this._cid
        //         )
        //     })

        //     /**
        //      * for a clean stdout we need to avoid that Jasmine initialises the
        //      * default reporter
        //      */
        //     Jasmine.prototype.configureDefaultReporter = NOOP

        //     /**
        //      * wrap Suite and Spec prototypes to get access to their data
        //      */
        //     // @ts-ignore
        //     const beforeAllMock = jasmine.Suite.prototype.beforeAll
        //     // @ts-ignore
        //     jasmine.Suite.prototype.beforeAll = function (...args) {
        //         self._lastSpec = this.result
        //         beforeAllMock.apply(this, args)
        //     }
        //     const executeMock = jasmine.Spec.prototype.execute
        //     jasmine.Spec.prototype.execute = function (...args: any[]) {
        //         self._lastTest = this.result
        //         // @ts-ignore overwrite existing type
        //         self._lastTest.start = new Date().getTime()
        //         executeMock.apply(this, args)
        //     }

        //     await this._loadFiles()
        //     /**
        //      * overwrite Jasmine global expect with WebdriverIOs expect
        //      */
        //     _setGlobal('expect', expect, this._config.injectGlobals)

        // }
        WDIOJestEnvironmentBridge.setReceiver((a:any, b:any ) => {
            this.onJestEvent(a, b)
        })

        return this
    }

    // async _loadFiles() {
    //     // console.log(`JestAdapter::_loadFiles`);
    //     try {
    //         if (Array.isArray(this._jasmineOpts.requires)) {
    //             // @ts-ignore outdated types
    //             this._jrunner.addRequires(this._jasmineOpts.requires)
    //         }
    //         if (Array.isArray(this._jasmineOpts.helpers)) {
    //             // @ts-ignore outdated types
    //             this._jrunner.addHelperFiles(this._jasmineOpts.helpers)
    //         }
    //         // @ts-ignore outdated types
    //         await this._jrunner.loadRequires()
    //         await this._jrunner.loadHelpers()
    //         await this._jrunner.loadSpecs()
    //         // @ts-ignore outdated types
    //         this._grep(this._jrunner.env.topSuite())
    //         this._hasTests = this._totalTests > 0
    //     } catch (err: any) {
    //         log.warn(
    //             'Unable to load spec files quite likely because they rely on `browser` object that is not fully initialised.\n' +
    //             '`browser` object has only `capabilities` and some flags like `isMobile`.\n' +
    //             'Helper files that use other `browser` commands have to be moved to `before` hook.\n' +
    //             `Spec file(s): ${this._specs.join(',')}\n`,
    //             'Error: ', err
    //         )
    //     }
    // }

    // _grep (suite: jasmine.Suite) {
    //     // console.log(`JestAdapter::_grep`);
    //     // @ts-ignore outdated types
    //     suite.children.forEach((child) => {
    //         if (Array.isArray((child as jasmine.Suite).children)) {
    //             return this._grep(child as jasmine.Suite)
    //         }
    //         if (this.customSpecFilter(child)) {
    //             this._totalTests++
    //         }
    //     })
    // }

    hasTests() {
        return this._hasTests
    }

    async run() {
        // console.log('WDIO_GLOBALS', Object.keys(global))
        WDIOJestEnvironmentBridge.sendGlobals(global)
        if (useJasmine) {
            // // @ts-expect-error
            // this._jrunner.env.beforeAll(this.wrapHook('beforeSuite'))
            // // @ts-expect-error
            // this._jrunner.env.afterAll(this.wrapHook('afterSuite'))

            // await this._jrunner.execute()

            // result = this._reporter.getFailedCount()
            // await executeHooksWithArgs('after', this._config.after, [result, this._capabilities, this._specs])
        } else {
            await Jest.run([
                '--config',
                JSON.stringify(this._jestOpts)
            ])
        }
    }

    // customSpecFilter (spec: jasmine.Spec) {
    //     // console.log(`JestAdapter::customSpecFilter`);
    //     const { grep, invertGrep } = this._jasmineOpts
    //     const grepMatch = !grep || spec.getFullName().match(new RegExp(grep)) !== null

    //     if (grepMatch === Boolean(invertGrep)) {
    //         // @ts-expect-error internal method
    //         if (typeof spec.pend === 'function') {
    //             // @ts-expect-error internal method
    //             spec.pend('grep')
    //         }
    //         return false
    //     }
    //     return true
    // }

    /**
     * Hooks which are added as true Jasmine hooks need to call done() to notify async
     */
    // wrapHook (hookName: keyof Services.HookFunctions) {
    //     return () => {
    //         console.log('JestAdapter::wrapHook', hookName)
    //         executeHooksWithArgs(
    //             hookName,
    //             this._config[hookName],
    //             [this.prepareMessage(hookName)]
    //         ).catch((e) => {
    //             log.info(`Error in ${hookName} hook: ${e.stack.slice(7)}`)
    //         })
    //     }
    // }

    onJestEvent (event:Circus.AsyncEvent | Circus.SyncEvent, state: Circus.State) {
        switch (event.name) {
        case 'run_start': {
            // this.emit('hook:start', { })
            return
        }

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

    // prepareMessage (hookName: keyof Services.HookFunctions) {
    //     // console.log(`JestAdapter::prepareMessage`);
    //     const params: FrameworkMessage = { type: hookName }

    //     switch (hookName) {
    //     case 'beforeSuite':
    //     case 'afterSuite':
    //         params.payload = Object.assign({
    //             file: this._jrunner?.specFiles[0]
    //         }, this._lastSpec)
    //         break
    //     case 'beforeTest':
    //     case 'afterTest':
    //         params.payload = Object.assign({
    //             file: this._jrunner?.specFiles[0]
    //         }, this._lastTest)
    //         break
    //     }

    //     return this.formatMessage(params)
    // }

    // formatMessage (params: FrameworkMessage) {
    //     // console.log(`JestAdapter::formatMessage`);
    //     const message: FormattedMessage = {
    //         type: params.type
    //     }

    //     if (params.payload) {
    //         message.title = params.payload.description
    //         message.fullName = params.payload.fullName || null
    //         message.file = params.payload.file

    //         if (params.payload.failedExpectations && params.payload.failedExpectations.length) {
    //             message.errors = params.payload.failedExpectations
    //             message.error = params.payload.failedExpectations[0]
    //         }

    //         if (params.payload.id && params.payload.id.startsWith('spec')) {
    //             message.parent = this._lastSpec?.description
    //             message.passed = params.payload.failedExpectations.length === 0
    //         }

    //         if (params.type === 'afterTest') {
    //             message.duration = new Date().getTime() - params.payload.start
    //         }

    //         if (typeof params.payload.duration === 'number') {
    //             message.duration = params.payload.duration
    //         }
    //     }

    //     return message
    // }

    // getExpectationResultHandler (jasmine: jasmine.Jasmine) {
    //     // console.log(`JestAdapter::getExpectationResultHandler`);
    //     const { expectationResultHandler } = this._jasmineOpts
    //     const origHandler = jasmine.Spec.prototype.addExpectationResult

    //     if (typeof expectationResultHandler !== 'function') {
    //         return origHandler
    //     }

    //     return this.expectationResultHandler(origHandler)
    // }

    // expectationResultHandler (origHandler: Function) {
    //     // console.log(`JestAdapter::expectationResultHandler`);
    //     const { expectationResultHandler } = this._jasmineOpts
    //     return function (this: jasmine.Spec, passed: boolean, data: ResultHandlerPayload) {
    //         try {
    //             expectationResultHandler!.call(this, passed, data)
    //         } catch (e: any) {
    //             /**
    //              * propagate expectationResultHandler error if actual assertion passed
    //              * but the custom handler decides to throw
    //              */
    //             if (passed) {
    //                 passed = false
    //                 data = {
    //                     passed,
    //                     message: 'expectationResultHandlerError: ' + e.message,
    //                     error: e
    //                 }
    //             }
    //         }

    //         return origHandler.call(this, passed, data)
    //     }
    // }
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
export * from './types.js'

declare global {
    namespace WebdriverIO {
        interface JestOpts extends JestConfig.DefaultOptions {}
    }
}