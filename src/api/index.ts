import {
  Middleware,
  ServeCreator,
  mergeDuplicateRequests,
  processCache,
  core
} from 'chery-fetch'
import tokenRefreshMiddleware from "./middleware/token"

const middleware = new Middleware<API.Context<any>>([
  processCache,
  mergeDuplicateRequests,
  core
])

const prefixURL = '/api' // process.env.NODE_ENV === "development" ? "" : process.env.VUE_APP_SERVER_CONFIG;

const serve = ServeCreator<{
  data: any
  status: boolean
  msg: string
}>(prefixURL, 'POST', { middleware })

const tmiddleware = new Middleware([tokenRefreshMiddleware, core])

export const tServe = ServeCreator(prefixURL, 'POST', {
  middleware: tmiddleware
})

export default serve
