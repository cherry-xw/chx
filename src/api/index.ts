import {
  Middleware,
  ServeCreator,
  mergeSame,
  processCache,
  processFetchInputAndOutput
} from './request'

const middleware = new Middleware<API.Context<any>>([
  processCache,
  mergeSame,
  processFetchInputAndOutput
])

const prefixURL = '/api' // process.env.NODE_ENV === "development" ? "" : process.env.VUE_APP_SERVER_CONFIG;

const serve = ServeCreator<{
  data: any
  status: boolean
  msg: string
}>(prefixURL, 'POST', { middleware })

export default serve
