import { BipperGaulixPanel } from "@components/PageComponents/Settings/Bipper/BipperGaulixPanel.tsx";
import { User } from "@components/PageComponents/Settings/User.tsx";
import { Spinner } from "@components/UI/Spinner.tsx";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { useBipperPager } from "@core/hooks/useBipperPager.ts";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { Suspense } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface ConfigProps {
  onFormInit: <T extends object>(methods: UseFormReturn<T>) => void;
}

export const BipperConfig = ({ onFormInit }: ConfigProps) => {
  const { t } = useTranslation("bipper");
  const { isBipperHardware, connected } = useBipperPager();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Heading as="h2">{t("page.title")}</Heading>
        <Subtle className="mt-1">{t("page.description")}</Subtle>
        {connected && !isBipperHardware && (
          <Subtle className="mt-2 text-amber-600 dark:text-amber-400">
            {t("page.notBipperWarning")}
          </Subtle>
        )}
      </div>

      <Tabs defaultValue="identity">
        <TabsList className="w-full dark:bg-slate-700 flex-wrap h-auto">
          <TabsTrigger value="identity">{t("page.tabIdentity")}</TabsTrigger>
          <TabsTrigger value="gaulix">{t("page.tabGaulix")}</TabsTrigger>
        </TabsList>

        <TabsContent value="identity">
          <Suspense fallback={<Spinner size="lg" className="my-5" />}>
            <User onFormInit={onFormInit} />
          </Suspense>
        </TabsContent>
        <TabsContent value="gaulix">
          <BipperGaulixPanel />
        </TabsContent>
      </Tabs>

      <Subtle className="text-xs border-t pt-3">{t("page.saveHint")}</Subtle>
    </div>
  );
};
