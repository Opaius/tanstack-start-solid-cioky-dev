import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/solid-router'
import { TanStackRouterDevtools } from '@tanstack/solid-router-devtools'
import { HydrationScript } from 'solid-js/web'
import { Suspense } from 'solid-js'
import TanStackQueryProvider from '../integrations/tanstack-query/provider.tsx'
import { getLocale } from '../paraglide/runtime.js'
import styleCss from '../styles.css?url'
import { NotFound } from '../components/not-found.tsx'

export const Route = createRootRouteWithContext()({
  head: () => ({
    links: [{ rel: 'stylesheet', href: styleCss }],
  }),
  shellComponent: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    <html lang={getLocale()}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HydrationScript />
      </head>
      <body class="dark">
        <HeadContent />
        <Suspense>
          <TanStackQueryProvider>
            <Outlet />
            <TanStackRouterDevtools />
          </TanStackQueryProvider>
        </Suspense>
        <Scripts />
      </body>
    </html>
  )
}
