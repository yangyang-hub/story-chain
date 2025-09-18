"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BookOpenIcon, PlusIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useLanguage } from "~~/contexts/LanguageContext";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const { t } = useLanguage();

  return (
    <>
      <div className="flex items-center flex-col grow pt-10">
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-2xl mb-2">{t("welcome.to")}</span>
            <span className="block text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t("welcome.title")}
            </span>
            <span className="block text-xl mt-2 text-base-content/70">{t("welcome.subtitle")}</span>
          </h1>

          <p className="text-center text-lg mt-6 max-w-2xl mx-auto text-base-content/80">{t("welcome.description")}</p>

          {connectedAddress && (
            <div className="flex justify-center items-center space-x-2 flex-col mt-6">
              <p className="my-2 font-medium">{t("welcome.connected_address")}:</p>
              <Address address={connectedAddress} />
            </div>
          )}

          <div className="flex justify-center mt-8 gap-4">
            <Link href="/create" className="btn btn-primary btn-lg gap-2 hover:scale-105 transition-transform">
              <PlusIcon className="h-5 w-5" />
              {t("welcome.get_started")}
            </Link>
            <Link href="/explore" className="btn btn-outline btn-lg gap-2 hover:scale-105 transition-transform">
              <BookOpenIcon className="h-5 w-5" />
              {t("welcome.explore_stories")}
            </Link>
          </div>
        </div>

        <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col md:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl hover:shadow-lg transition-shadow">
              <PlusIcon className="h-8 w-8 fill-secondary" />
              <h3 className="text-lg font-bold mt-4 mb-2">{t("story.create")}</h3>
              <p className="text-sm text-base-content/70">{t("home.feature1.title")}</p>
            </div>

            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl hover:shadow-lg transition-shadow">
              <BookOpenIcon className="h-8 w-8 fill-secondary" />
              <h3 className="text-lg font-bold mt-4 mb-2">{t("nav.explore")}</h3>
              <p className="text-sm text-base-content/70">{t("home.feature2.title")}</p>
            </div>

            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl hover:shadow-lg transition-shadow">
              <SparklesIcon className="h-8 w-8 fill-secondary" />
              <h3 className="text-lg font-bold mt-4 mb-2">{t("story.fork_story")}</h3>
              <p className="text-sm text-base-content/70">{t("home.feature3.title")}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
