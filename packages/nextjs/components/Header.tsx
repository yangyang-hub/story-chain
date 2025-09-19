"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bars3Icon, BookOpenIcon, PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { LanguageSwitcher } from "~~/components/LanguageSwitcher";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useLanguage } from "~~/contexts/LanguageContext";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { isLocalNetwork } from "~~/utils/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  labelKey: string;
  href: string;
  icon?: React.ReactNode;
};

const menuLinksConfig: HeaderMenuLink[] = [
  {
    label: "Home",
    labelKey: "nav.home",
    href: "/",
  },
  {
    label: "Create Story",
    labelKey: "nav.create",
    href: "/create",
    icon: <PlusIcon className="h-4 w-4" />,
  },
  {
    label: "Explore",
    labelKey: "nav.explore",
    href: "/explore",
    icon: <BookOpenIcon className="h-4 w-4" />,
  },
  // {
  //   label: "Chain Data",
  //   labelKey: "nav.chaindata",
  //   href: "/chain-data",
  //   icon: <ChartBarIcon className="h-4 w-4" />,
  // },
  {
    label: "Profile",
    labelKey: "nav.profile",
    href: "/profile",
    icon: <UserIcon className="h-4 w-4" />,
  },
  // {
  //   label: "Debug Contracts",
  //   labelKey: "nav.debug",
  //   href: "/debug",
  //   icon: <BugAntIcon className="h-4 w-4" />,
  // },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <>
      {menuLinksConfig.map(({ labelKey, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`${
                isActive ? "bg-secondary shadow-md" : ""
              } hover:bg-secondary hover:shadow-md focus:!bg-secondary active:!text-neutral py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col`}
            >
              {icon}
              <span>{t(labelKey)}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const { t } = useLanguage();
  const isLocalChain = isLocalNetwork(targetNetwork.id);

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 navbar bg-base-100 min-h-0 shrink-0 justify-between z-20 shadow-md shadow-secondary px-0 sm:px-2">
      <div className="navbar-start w-auto lg:w-1/2">
        <details className="dropdown" ref={burgerMenuRef}>
          <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent">
            <Bars3Icon className="h-1/2" />
          </summary>
          <ul
            className="menu menu-compact dropdown-content mt-3 p-2 shadow-sm bg-base-100 rounded-box w-52"
            onClick={() => {
              burgerMenuRef?.current?.removeAttribute("open");
            }}
          >
            <HeaderMenuLinks />
          </ul>
        </details>
        <Link href="/" passHref className="hidden lg:flex items-center gap-2 ml-4 mr-6 shrink-0">
          <div className="flex relative w-10 h-10">
            <Image alt="StoryChain logo" className="cursor-pointer" fill src="/story-chain-logo.png" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-tight">{t("site.title")}</span>
            <span className="text-xs">{t("site.subtitle")}</span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end grow mr-4 flex items-center gap-2">
        <SwitchTheme />
        <LanguageSwitcher />
        <RainbowKitCustomConnectButton />
        {isLocalChain && <FaucetButton />}
      </div>
    </div>
  );
};
