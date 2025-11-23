import { createFileRoute } from "@tanstack/solid-router";
import { onMount } from "solid-js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { LucideBrain } from "lucide-solid";
import Particles from "../components/ui/particle-background";
import { ProfileCard } from "../components/profile-card";
import {
  BgContainer,
  BgController,
} from "../components/ui/background-gradient-switch";
import "solid-devtools";
import { HeaderNav } from "../components/header-nav";
import SplitTextComponent from "../components/ui/split-text";
import GradientText from "../components/ui/gradient-text";
import { CardDemo } from "../components/cards-demo";

export const Route = createFileRoute("/")({ component: App });

function App() {
  onMount(() => {
    gsap.registerPlugin(ScrollTrigger);
    gsap.registerPlugin(SplitText);
    gsap.registerPlugin(Flip);
  });
  return (
    <div class="w-full">
      <HeaderNav />
      <div class="relative h-full w-full md:h-screen">
        <div class="absolute inset-0 h-full w-full">
          <Particles
            particleColors={[
              "var(--color-secondary)",
              "var(--color-primary)",
              "var(--color-accent)",
            ]}
            particleCount={1000}
            particleSpread={10}
            speed={0.1}
            particleBaseSize={100}
            moveParticlesOnHover={true}
            alphaParticles={false}
            disableRotation={false}
          />
        </div>
        <div class="mt-30 grid h-full w-full auto-rows-auto place-items-center gap-10 md:mt-10 md:grid-cols-2">
          <SplitTextComponent
            splitType="lines"
            class="mx-4 max-w-md self-center text-4xl md:justify-self-end-safe"
            ease="back.out(1.7)"
            duration={2}
            delay={400}
          >
            Custom apps for your{" "}
            <span>
              <GradientText
                class="inline-block font-black"
                colors={[
                  "var(--primary)",
                  "var(--secondary)",
                  "var(--accent)",
                  "var(--primary)",
                  "var(--secondary)",
                  "var(--accent)",
                ]}
              >
                Business
              </GradientText>
            </span>{" "}
            without the headaches{" "}
            <div class="text-primary inline-flex">
              <LucideBrain />
            </div>
          </SplitTextComponent>
          <div class="md:justify-self-start">
            <ProfileCard />
          </div>
        </div>
      </div>
      <BgController
        options={{
          start: "top 70%",
          end: "top 69.9%",
          duration: 0.4,
          ease: "power1.inOut",
        }}
      >
        {/* <BgContainer as="section" bgEnd="var(--color-accent)">
          <WhoAmIPills />
        </BgContainer> */}
        {/* <BgContainer
          bgEnd="var(--color-primary)"
          class="w-full h-full flex items-center justify-center"
          as="section"
        >
          <ToolsCloud />
        </BgContainer> */}

        <BgContainer
          bgEnd="var(--color-accent-800)"
          class="grid h-full place-items-center"
        >
          <CardDemo />
        </BgContainer>
        <div class="min-h-screen"></div>
      </BgController>
    </div>
  );
}
