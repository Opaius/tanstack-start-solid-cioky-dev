import { createMemo, createSignal } from "solid-js";
import { createGsapScroll } from "../lib/createGSAPscroll";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { CardNav } from "./ui/card-nav";

export function HeaderNav() {
  const scroll = createGsapScroll();
  const items = [
    {
      label: "About",
      bg: "var(--color-primary)",
      textColor: "#fff",
      links: [
        {
          label: "My Job Experience",
          ariaLabel: "About Job Experience",
          href: "/#job-experience",
        },
        {
          label: "My Skills",
          ariaLabel: "My Skills",
          href: "/#skills",
        },
        {
          label: "My Tools",
          ariaLabel: "My Tools",
          href: "/#tools",
        },
      ],
    },
    {
      label: "Projects",
      bg: "var(--color-secondary)",
      textColor: "#fff",
      links: [
        {
          label: "My Projects",
          ariaLabel: "My Projects",
          href: "/projects",
        },
      ],
    },
    {
      label: "Contact",
      bg: "var(--color-accent)",
      textColor: "var(--color-text)",
      links: [
        {
          label: "Email",
          ariaLabel: "Email me",
          href: "mailto:ciocan.sebastian45@gmail.com",
        },
        {
          label: "Instagram",
          ariaLabel: "Instagram",
          href: "https://instagram.com/ciokydev",
        },
        {
          label: "LinkedIn",
          ariaLabel: "LinkedIn",
          href: "https://www.linkedin.com/in/sebastian-ciocan-a5aa5138b",
        },
      ],
    },
  ];
  const [isOpen, setIsOpen] = createSignal(false);
  const additionalClassName = createMemo(() => {
    if (scroll.progress == 0 && !isOpen())
      return "bg-transparent w-[80%] max-w-full shadow-none  ";
    if (scroll.progress == 0 && isOpen()) return "bg-card w-[80%] max-w-full ";
    return undefined;
  });
  return (
    <CardNav
      logo="cioky.dev"
      class={cn(
        "transition-[background-color,width,max-width] duration-500",
        additionalClassName(),
        "hover:bg-card", // This will inherit the transition from transition-all
      )}
      button={<Button>Contact me</Button>}
      items={items}
      isOpen={isOpen}
      onIsOpenChange={setIsOpen}
    />
  );
}
