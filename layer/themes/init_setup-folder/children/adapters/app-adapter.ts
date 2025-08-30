/**
 * App Adapter for converting existing Express/Koa apps to Elysia
 */

import { Elysia } from 'elysia'
import type { Express } from 'express'
import type { Koa } from 'koa'

export class AppAdapter {
  /**
   * Adapt an Express app to Elysia
   */
  static fromExpress(expressApp: Express): Elysia {
    const elysiaApp = new Elysia()
    
    // Get all registered routes from Express
    const routes = this.extractExpressRoutes(expressApp)
    
    // Register routes in Elysia
    routes.forEach(route => {
      const method = route.method.toLowerCase()
      
      if (method === 'get') {
        elysiaApp.get(route.path, async (ctx) => {
          // Proxy to Express handler
          return this.proxyExpressHandler(route.handler, ctx)
        })
      } else if (method === 'post') {
        elysiaApp.post(route.path, async (ctx) => {
          return this.proxyExpressHandler(route.handler, ctx)
        })
      } else if (method === 'put') {
        elysiaApp.put(route.path, async (ctx) => {
          return this.proxyExpressHandler(route.handler, ctx)
        })
      } else if (method === 'delete') {
        elysiaApp.delete(route.path, async (ctx) => {
          return this.proxyExpressHandler(route.handler, ctx)
        })
      }
    })
    
    return elysiaApp
  }

  /**
   * Adapt a Koa app to Elysia
   */
  static fromKoa(koaApp: Koa): Elysia {
    const elysiaApp = new Elysia()
    
    // Koa uses middleware stack, need to convert
    koaApp.middleware.forEach(middleware => {
      elysiaApp.use(async (ctx) => {
        // Create Koa-compatible context
        const koaCtx = this.createKoaContext(ctx)
        await middleware(koaCtx, () => Promise.resolve())
        return koaCtx.body
      })
    })
    
    return elysiaApp
  }

  /**
   * Create a generic adapter for any app with a request handler
   */
  static fromHandler(handler: (req: Request) => Response | Promise<Response>): Elysia {
    const elysiaApp = new Elysia()
    
    elysiaApp.all('/*', async ({ request }) => {
      return await handler(request)
    })
    
    return elysiaApp
  }

  /**
   * Extract routes from Express app
   */
  private static extractExpressRoutes(app: any): any[] {
    const routes: any[] = []
    
    // Express stores routes in app._router.stack
    if (app._router && app._router.stack) {
      app._router.stack.forEach((layer: any) => {
        if (layer.route) {
          const path = layer.route.path
          const methods = Object.keys(layer.route.methods)
          
          methods.forEach(method => {
            routes.push({
              method: method.toUpperCase(),
              path,
              handler: layer.route.stack[0].handle
            })
          })
        }
      })
    }
    
    return routes
  }

  /**
   * Proxy Express handler to Elysia context
   */
  private static async proxyExpressHandler(handler: Function, ctx: any) {
    // Create Express-compatible req/res objects
    const req = {
      method: ctx.request.method,
      url: ctx.request.url,
      headers: ctx.request.headers,
      body: ctx.body,
      params: ctx.params,
      query: ctx.query,
      session: ctx.session
    }
    
    const res = {
      status: (code: number) => {
        ctx.set.status = code
        return res
      },
      json: (data: any) => {
        return ctx.json(data)
      },
      send: (data: any) => {
        return data
      },
      redirect: (url: string) => {
        return Response.redirect(url)
      }
    }
    
    // Call Express handler
    return new Promise((resolve, reject) => {
      const next = (err?: any) => {
        if (err) reject(err)
        else resolve(undefined)
      }
      
      handler(req, res, next)
    })
  }

  /**
   * Create Koa-compatible context
   */
  private static createKoaContext(elysiaCtx: any) {
    return {
      request: {
        method: elysiaCtx.request.method,
        url: elysiaCtx.request.url,
        headers: elysiaCtx.request.headers,
        body: elysiaCtx.body
      },
      response: {
        status: 200,
        body: null,
        headers: {}
      },
      state: {},
      session: elysiaCtx.session,
      cookies: {
        get: (name: string) => elysiaCtx.cookie[name],
        set: (name: string, value: string) => {
          elysiaCtx.cookie[name] = value
        }
      },
      body: null,
      status: 200
    }
  }
}

export default AppAdapter