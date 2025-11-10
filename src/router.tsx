import { createRouter } from '@tanstack/solid-router'
import { deLocalizeUrl, localizeUrl } from './paraglide/runtime'
// Import the generated route tree
import { routeTree } from './routeTree.gen'

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    rewrite: {
      input: ({ url }) => deLocalizeUrl(url),
      output: ({ url }) => localizeUrl(url),
    },
    scrollRestoration: true,
  })
  return router
}
