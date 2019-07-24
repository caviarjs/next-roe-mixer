// Orchestrator
///////////////////////////////////////////////
const NextBlock = require('@caviar/next-block')
const RoeBlock = require('@caviar/roe-block')

const Planner = require('promise-planner')
const {Binder} = require('caviar')

const {middleware2Koa} = NextBlock

const NEXT_ROE_BINDER = 'NextRoeBinder'

// Thinking:
// Should Orchestrator and Block extend the same interface?

module.exports = class NextRoeBinder extends Binder {
  constructor (options) {
    super(options)

    this.blocks = {
      next: {
        from: NextBlock,
        // Use default configMap
        // configMap: {
        //   next: 'next'
        //   nextWebpack: 'nextWebpack'
        // },
        phaseMap: {
          build: 'build'
        }
      },
      server: {
        from: RoeBlock,
        // configMap: {
        //   key: 'server'
        // }
      }
    }
  }

  async orchestrate ({
    next,
    server
  }) {
    next.hooks.created.tap(NEXT_ROE_BINDER, nextApp => {
      // next.hooks.created called first
      server.hooks.created.tap(NEXT_ROE_BINDER, roe => {
        roe.next = nextApp
      })
    })

    const planner = new Planner(
      ['server-ready', 'next-ready'],
      () => next.listen()
      .then(port => {
        // eslint-disable-next-line no-console
        console.log('server started at http://localhost:%s', port)
      })
    )

    planner.catch(() => {
      // eslint-disable-next-line no-console
      console.error('fails to start server')
    })

    server.hooks.loaded.tap(NEXT_ROE_BINDER, app => {
      app.use(middleware2Koa(next.middleware()))
    })

    server.hooks.run.tapPromise(NEXT_ROE_BINDER, () => {
      planner.resolve('server-ready')
    })

    next.hooks.run.tapPromise(NEXT_ROE_BINDER, () => {
      planner.resolve('next-ready')
    })
  }
}
