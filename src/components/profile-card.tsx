import { CardBody, CardContainer, CardItem } from './ui/3d-card'
import { Avatar, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import LetterGlitch from './ui/letter-glitch'

export function ProfileCard() {
  return (
    <CardContainer class="w-[320px] h-[500px] md:w-[400px] md:h-[600px] shadow-[0_0_4px_5px_rgba(241,116,116,0.10),0_0_10px_5px_#2E0505] pb-0 relative pt-10 group">
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
          class="bg-background/20 backdrop-blur-xs p-5 rounded-full group-hover:bg-primary/20 group-focus:bg-primary/20"
        >
          <p class="text-xl text-center font-normal">Cioky</p>
          <p class="text-md font-extralight">Fullstack Developer</p>
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
            className="absolute bottom-[40px] left-0 w-full flex items-center px-[30px]"
          >
            <div class="bg-background rounded-md p-[10px] flex gap-[10px] w-full justify-center items-center">
              <Avatar class="size-[50px] bg-primary">
                <AvatarImage src="/cioky.png" class="object-cover" />
              </Avatar>
              <div class="flex flex-col">
                <p class="text-md font-bold">@ciokydev</p>
                <p class="text-md text-green-300">Online</p>
              </div>
              <Button class="text-foreground ml-auto rounded-md">
                Contact me
              </Button>
            </div>
          </CardItem>
        </div>
      </CardBody>
    </CardContainer>
  )
}
