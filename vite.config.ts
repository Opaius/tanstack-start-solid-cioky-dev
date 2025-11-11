import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

import { tanstackStart } from '@tanstack/solid-start/plugin/vite'
import solidPlugin from 'vite-plugin-solid'
import { nitroV2Plugin } from '@tanstack/nitro-v2-vite-plugin'

export default defineConfig({
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
    }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    nitroV2Plugin({ preset: 'bun' }),
    tailwindcss(),
    tanstackStart(),
    solidPlugin({ ssr: true }),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      outputStructure: 'message-modules',
      cookieName: 'PARAGLIDE_LOCALE',
      strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale'],
      urlPatterns: [
        {
          pattern: '/:path(.*)?',
          localized: [
            ['en', '/en/:path(.*)?'],
            ['ro', '/ro/:path(.*)?'],
          ],
        },
      ],
    }),
  ],
})
