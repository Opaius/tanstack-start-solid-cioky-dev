import {
  LucideBot, // Added for AI alternative
  LucideBrain, // Added for AI
  LucideCloud,
  LucideDatabase,
  LucideDollarSign,
  LucideGlobe,
  LucidePalette,
  LucideShieldCheck,
  LucideSparkles,
  LucideTrendingUp,
  LucideUsers,
  LucideZap,
} from "lucide-solid";
import { cn } from "../lib/utils";
import { MorphCards } from "./ui/morph-cards";
import type { MorphCard } from "./ui/morph-cards";

export function CardDemo() {
  const cards: Array<MorphCard> = [
    {
      // --- Card 1: Cost-Effective Growth ---
      header: ({ isActive }) => (
        <div
          class={cn(
            "flex items-center gap-3 transition-all duration-300",
            isActive() ? "text-emerald-400" : "text-slate-400",
          )}
        >
          <div
            class={cn(
              "rounded-full p-2 transition-colors",
              isActive()
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-slate-800 text-slate-500",
            )}
          >
            <LucideDollarSign class="size-5" />
          </div>
          <div>
            <h3
              class={cn(
                "leading-tight font-semibold",
                isActive() ? "text-xl text-slate-100" : "text-base",
              )}
            >
              Value
            </h3>
            <p
              class={cn(
                "text-xs text-slate-500",
                isActive() ? "block" : "hidden",
              )}
            >
              Maximum ROI
            </p>
          </div>
        </div>
      ),
      content: () => (
        <div class="relative flex h-full flex-col justify-between">
          <div class="relative z-10 space-y-4 md:pr-32">
            <h2 class="text-3xl font-bold text-white">
              More Customers, Less Spend
            </h2>
            <p class="leading-relaxed text-slate-400">
              Why pay enterprise prices for startup results? I deliver{" "}
              <span class="font-semibold text-emerald-400">
                high-converting experiences
              </span>{" "}
              at a fraction of the cost—no bloated agencies, just efficient
              development that scales with your growth.
            </p>

            <div class="flex items-center gap-2 text-sm font-medium text-emerald-400">
              <LucideUsers class="size-4" />
              <span>3x Better Conversion Rates</span>
            </div>
          </div>

          {/* Visual element - Responsive Positioning */}
          <div class="absolute -right-4 bottom-0 flex h-24 w-24 items-center justify-center opacity-20 md:top-0 md:-right-4 md:h-32 md:w-32">
            <div class="relative h-full w-full">
              <div class="absolute inset-0 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600" />
              <div class="absolute inset-4 flex items-center justify-center rounded-full bg-emerald-500/30 text-4xl font-bold text-emerald-300">
                $
              </div>
            </div>
          </div>
        </div>
      ),
      mainColor: "#065f46",
    },
    {
      // --- Card 2: SolidJS (Performance/Conversion) ---
      header: ({ isActive }) => (
        <div
          class={cn(
            "flex items-center gap-3 transition-all duration-300",
            isActive() ? "text-blue-400" : "text-slate-400",
          )}
        >
          <div
            class={cn(
              "rounded-full p-2 transition-colors",
              isActive()
                ? "bg-blue-500/20 text-blue-400"
                : "bg-slate-800 text-slate-500",
            )}
          >
            <LucideZap class="size-5" />
          </div>
          <div>
            <h3
              class={cn(
                "leading-tight font-semibold",
                isActive() ? "text-xl text-slate-100" : "text-base",
              )}
            >
              Performance
            </h3>
            <p
              class={cn(
                "text-xs text-slate-500",
                isActive() ? "block" : "hidden",
              )}
            >
              Powered by SolidJS
            </p>
          </div>
        </div>
      ),
      content: () => (
        <div class="relative flex h-full flex-col justify-between">
          <div class="relative z-10 space-y-4 md:pr-32">
            <h2 class="text-3xl font-bold text-white">
              Lightning-Fast Experiences
            </h2>
            <p class="leading-relaxed text-slate-400">
              Zero compromise on speed. I use{" "}
              <span class="font-semibold text-blue-400">SolidJS</span> to
              deliver instant interactions with fine-grained reactivity—no
              virtual DOM overhead, just pure performance that keeps users
              engaged.
            </p>

            <div class="flex items-center gap-2 text-sm font-medium text-blue-400">
              <LucideTrendingUp class="size-4" />
              <span>98+ Core Web Vitals Score</span>
            </div>
          </div>

          <img
            class="absolute -right-4 -bottom-4 h-24 w-24 object-contain opacity-10 invert transition-all duration-500 hover:opacity-100 focus:opacity-100 md:top-0 md:-right-4 md:h-32 md:w-32"
            src="https://cdn.simpleicons.org/solid/3b82f6"
            alt="SolidJS Logo"
          />
        </div>
      ),
      mainColor: "#1e3a8a",
    },
    {
      // --- Card 3: Tailwind (Design/Time-to-Market) ---
      header: ({ isActive }) => (
        <div
          class={cn(
            "flex items-center gap-3 transition-all duration-300",
            isActive() ? "text-cyan-400" : "text-slate-400",
          )}
        >
          <div
            class={cn(
              "rounded-full p-2 transition-colors",
              isActive()
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-slate-800 text-slate-500",
            )}
          >
            <LucidePalette class="size-5" />
          </div>
          <div>
            <h3
              class={cn(
                "leading-tight font-semibold",
                isActive() ? "text-xl text-slate-100" : "text-base",
              )}
            >
              Design
            </h3>
            <p
              class={cn(
                "text-xs text-slate-500",
                isActive() ? "block" : "hidden",
              )}
            >
              Styled with Tailwind
            </p>
          </div>
        </div>
      ),
      content: () => (
        <div class="relative flex h-full flex-col justify-between">
          <div class="relative z-10 space-y-4 md:pr-32">
            <h2 class="text-3xl font-bold text-white">
              Pixel-Perfect, Every Time
            </h2>
            <p class="leading-relaxed text-slate-400">
              Your brand deserves precision. With{" "}
              <span class="font-semibold text-cyan-400">Tailwind CSS</span>, I
              craft responsive, accessible interfaces that look flawless across
              all devices— and iterate quickly without sacrificing quality.
            </p>
            <div class="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-900/20 px-3 py-1.5 text-xs font-medium text-cyan-300">
              <LucideSparkles class="size-3" />
              Rapid Prototyping
            </div>
          </div>

          <img
            class="absolute -right-4 -bottom-4 h-24 w-24 object-contain opacity-10 transition-all duration-500 hover:opacity-100 focus:opacity-100 md:top-0 md:-right-4 md:h-32 md:w-32"
            src="https://cdn.simpleicons.org/tailwindcss/22d3ee"
            alt="Tailwind Logo"
          />
        </div>
      ),
      mainColor: "#155e75",
    },
    {
      // --- Card 4: TanStack Start (SEO/Scale) ---
      header: ({ isActive }) => (
        <div
          class={cn(
            "flex items-center gap-3 transition-all duration-300",
            isActive() ? "text-rose-400" : "text-slate-400",
          )}
        >
          <div
            class={cn(
              "rounded-full p-2 transition-colors",
              isActive()
                ? "bg-rose-500/20 text-rose-400"
                : "bg-slate-800 text-slate-500",
            )}
          >
            <LucideGlobe class="size-5" />
          </div>
          <div>
            <h3
              class={cn(
                "leading-tight font-semibold",
                isActive() ? "text-xl text-slate-100" : "text-base",
              )}
            >
              Discoverability
            </h3>
            <p
              class={cn(
                "text-xs text-slate-500",
                isActive() ? "block" : "hidden",
              )}
            >
              Built on TanStack
            </p>
          </div>
        </div>
      ),
      content: () => (
        <div class="relative flex h-full flex-col justify-between">
          <div class="relative z-10 space-y-4 md:pr-32">
            <h2 class="text-3xl font-bold text-white">
              Rank Higher, Grow Faster
            </h2>
            <p class="leading-relaxed text-slate-400">
              Visibility drives growth. Using{" "}
              <span class="font-semibold text-rose-400">TanStack Start</span>, I
              build SEO-optimized apps with server-side rendering that get
              indexed immediately and deliver the performance search engines
              reward.
            </p>
            <div class="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-900/20 px-3 py-1.5 text-xs font-medium text-rose-300">
              <LucideGlobe class="size-3" />
              SEO-First Architecture
            </div>
          </div>

          <img
            class="absolute -right-4 -bottom-4 h-24 w-24 object-contain opacity-10 transition-all duration-500 hover:opacity-100 focus:opacity-100 md:top-0 md:-right-4 md:h-32 md:w-32"
            src="https://tanstack.com/images/logos/logo-white.svg"
            alt="TanStack Logo"
          />
        </div>
      ),
      mainColor: "#881337",
    },
    {
      // --- Card 5: Convex (Backend/Realtime) ---
      header: ({ isActive }) => (
        <div
          class={cn(
            "flex items-center gap-3 transition-all duration-300",
            isActive() ? "text-orange-400" : "text-slate-400",
          )}
        >
          <div
            class={cn(
              "rounded-full p-2 transition-colors",
              isActive()
                ? "bg-orange-500/20 text-orange-400"
                : "bg-slate-800 text-slate-500",
            )}
          >
            <LucideDatabase class="size-5" />
          </div>
          <div>
            <h3
              class={cn(
                "leading-tight font-semibold",
                isActive() ? "text-xl text-slate-100" : "text-base",
              )}
            >
              Real-time
            </h3>
            <p
              class={cn(
                "text-xs text-slate-500",
                isActive() ? "block" : "hidden",
              )}
            >
              Powered by Convex
            </p>
          </div>
        </div>
      ),
      content: () => (
        <div class="relative flex h-full flex-col justify-between">
          <div class="relative z-10 space-y-4 md:pr-32">
            <h2 class="text-3xl font-bold text-white">
              Sync State, Not Stress
            </h2>
            <p class="leading-relaxed text-slate-400">
              Modern apps need to be alive. I use{" "}
              <span class="font-semibold text-orange-400">Convex</span> to build
              real-time, reactive backends that sync data instantly to every
              user—eliminating complex glue code and ensuring your app feels
              instantaneous.
            </p>
            <div class="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-900/20 px-3 py-1.5 text-xs font-medium text-orange-300">
              <LucideDatabase class="size-3" />
              End-to-End Type Safe
            </div>
          </div>

          <img
            class="absolute -right-4 -bottom-4 h-24 w-24 object-contain opacity-10 invert transition-all duration-500 hover:opacity-100 focus:opacity-100 md:top-0 md:-right-4 md:h-32 md:w-32"
            src="/convex-logo-white.svg"
            alt="Convex Logo"
          />
        </div>
      ),
      mainColor: "#9a3412",
    },
    {
      // --- Card 6: Hosting (Coolify + Cloudflare) ---
      header: ({ isActive }) => (
        <div
          class={cn(
            "flex items-center gap-3 transition-all duration-300",
            isActive() ? "text-indigo-400" : "text-slate-400",
          )}
        >
          <div
            class={cn(
              "rounded-full p-2 transition-colors",
              isActive()
                ? "bg-indigo-500/20 text-indigo-400"
                : "bg-slate-800 text-slate-500",
            )}
          >
            <LucideCloud class="size-5" />
          </div>
          <div>
            <h3
              class={cn(
                "leading-tight font-semibold",
                isActive() ? "text-xl text-slate-100" : "text-base",
              )}
            >
              Infrastructure
            </h3>
            <p
              class={cn(
                "text-xs text-slate-500",
                isActive() ? "block" : "hidden",
              )}
            >
              Coolify & Cloudflare
            </p>
          </div>
        </div>
      ),
      content: () => (
        <div class="relative flex h-full flex-col justify-between">
          <div class="relative z-10 space-y-4 md:pr-32">
            <h2 class="text-3xl font-bold text-white">
              Secure & Self-Sovereign
            </h2>
            <p class="leading-relaxed text-slate-400">
              Own your data. I deploy robust infrastructure using{" "}
              <span class="font-semibold text-indigo-400">Coolify</span> for
              flexible self-hosting, shielded by{" "}
              <span class="font-semibold text-orange-400">Cloudflare DNS</span>{" "}
              for enterprise-grade security, speed, and reliability.
            </p>
            <div class="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-900/20 px-3 py-1.5 text-xs font-medium text-indigo-300">
              <LucideShieldCheck class="size-3" />
              DDoS Protected & Fast
            </div>
          </div>

          <img
            class="absolute -right-4 -bottom-4 h-24 w-24 object-contain opacity-10 transition-all duration-500 hover:opacity-100 focus:opacity-100 md:top-0 md:-right-4 md:h-32 md:w-32"
            src="https://cdn.simpleicons.org/cloudflare/F38020"
            alt="Cloudflare Logo"
          />
        </div>
      ),
      mainColor: "#312e81",
    },
    {
      // --- Card 7: AI Integration (Future Proof) ---
      header: ({ isActive }) => (
        <div
          class={cn(
            "flex items-center gap-3 transition-all duration-300",
            isActive() ? "text-violet-400" : "text-slate-400",
          )}
        >
          <div
            class={cn(
              "rounded-full p-2 transition-colors",
              isActive()
                ? "bg-violet-500/20 text-violet-400"
                : "bg-slate-800 text-slate-500",
            )}
          >
            <LucideBrain class="size-5" />
          </div>
          <div>
            <h3
              class={cn(
                "leading-tight font-semibold",
                isActive() ? "text-xl text-slate-100" : "text-base",
              )}
            >
              Intelligence
            </h3>
            <p
              class={cn(
                "text-xs text-slate-500",
                isActive() ? "block" : "hidden",
              )}
            >
              AI-Native Experiences
            </p>
          </div>
        </div>
      ),
      content: () => (
        <div class="relative flex h-full flex-col justify-between">
          <div class="relative z-10 space-y-4 md:pr-32">
            <h2 class="text-3xl font-bold text-white">Smarter Applications</h2>
            <p class="leading-relaxed text-slate-400">
              Stay ahead of the curve. I integrate{" "}
              <span class="font-semibold text-violet-400">Cutting-edge AI</span>{" "}
              models directly into your workflow, automating complex tasks and
              providing personalized user experiences that traditional apps
              can't match.
            </p>
            <div class="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-900/20 px-3 py-1.5 text-xs font-medium text-violet-300">
              <LucideBot class="size-3" />
              LLM Integration Ready
            </div>
          </div>

          <img
            class="absolute -right-4 -bottom-4 h-24 w-24 object-contain opacity-10 invert transition-all duration-500 hover:opacity-100 focus:opacity-100 md:top-0 md:-right-4 md:h-32 md:w-32"
            src="https://cdn.simpleicons.org/openai/ffffff"
            alt="OpenAI Logo"
          />
        </div>
      ),
      mainColor: "#5b21b6", // violet-900
    },
  ];

  return (
    <div class="flex flex-col items-center justify-center">
      <div class="mx-20 mb-12 max-w-2xl text-center">
        <h1 class="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Built to Perform
        </h1>
        <p class="mt-3 text-lg text-slate-400">
          Modern stack, measurable results—crafted for your competitive
          advantage.
        </p>
      </div>
      <MorphCards items={cards} />
    </div>
  );
}
