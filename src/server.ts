import handler from '@tanstack/solid-start/server-entry'
import { paraglideMiddleware } from './paraglide/server.js'

export default {
  fetch(req: Request): Promise<Response> {
    return paraglideMiddleware(req, ({ request }) => handler.fetch(request))
  },
}
