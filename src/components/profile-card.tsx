import { CardBody, CardContainer, CardItem } from './ui/3d-card'
import { Button } from './ui/button'
import LetterGlitch from './ui/letter-glitch'

export function ProfileCard() {
  return (
    <CardContainer class="w-72 h-130 shadow-[0_0_4px_5px_rgba(241,116,116,0.10),0_0_10px_5px_#2E0505] pb-0 relative pt-10 group">
      <div class="absolute inset-0">
        <LetterGlitch
          glitchColors={[
            'var(--color-primary)',
            'var(--color-secondary)',
            'var(--color-accent)',
          ]}
          updateFrequency={0.05}
          glitchSpeed={100}
          gridColumns={10}
          centerVignette={true}
          outerVignette
        />
      </div>
      <CardBody class="flex flex-col justify-center items-center w-full h-full px-0">
        <CardItem
          translateZ={50}
          class="bg-background/20 backdrop-blur-xs p-2 rounded-full group-hover:bg-primary/20 group-focus:bg-primary/20 focus:bg-primary/20 mx-5"
        >
          <p class="text-lg text-center font-light text-pretty">
            Full-Stack Developer for Ambitious Businesses
          </p>
        </CardItem>
        <div class="h-full w-full relative ">
          <CardItem
            translateZ={50}
            translateX={-20}
            class="absolute bottom-0 left-0 w-full h-full"
          >
            <img
              src="/cioky.png"
              alt="cioky"
              class="object-cover object-bottom w-full h-full"
            />
          </CardItem>
          <CardItem
            translateZ={90}
            className="absolute bottom-[40px] left-0 w-full flex items-center px-2 gap-2"
          >
            <div class="flex items-center w-full gap-2">
              <div class="size-10 aspect-square bg-accent rounded-md" />
              <Button class="w-full ">Let's build together !</Button>
              <div class="size-10 aspect-square bg-accent rounded-md" />
            </div>
          </CardItem>
        </div>
      </CardBody>
    </CardContainer>
  )
}
