import { PageLayout } from "@components/PageLayout.tsx";
import { Sidebar } from "@components/Sidebar.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@components/UI/Tabs.tsx";
import { Heading } from "@components/UI/Typography/Heading.tsx";
import { Subtle } from "@components/UI/Typography/Subtle.tsx";
import { usePagerAckIngest } from "@core/hooks/usePagerAckIngest.ts";
import { AckTab } from "./AckTab.tsx";
import { AlertsTab } from "./AlertsTab.tsx";
import { MessageTab } from "./MessageTab.tsx";
import { ReportTab } from "./ReportTab.tsx";
import { useTranslation } from "react-i18next";

export default function BipperSendPage() {
  const { t } = useTranslation("bipper");
  usePagerAckIngest();

  return (
    <PageLayout label={t("manager.pageTitle")} leftBar={<Sidebar />}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
        <div>
          <Heading as="h2">{t("manager.pageTitle")}</Heading>
          <Subtle className="mt-1">{t("manager.pageDescription")}</Subtle>
        </div>

        <Tabs defaultValue="report">
          <TabsList className="w-full dark:bg-slate-700 flex-wrap h-auto">
            <TabsTrigger value="report">{t("manager.tabs.report")}</TabsTrigger>
            <TabsTrigger value="message">
              {t("manager.tabs.message")}
            </TabsTrigger>
            <TabsTrigger value="alerts">{t("manager.tabs.alerts")}</TabsTrigger>
            <TabsTrigger value="acks">{t("manager.tabs.acks")}</TabsTrigger>
          </TabsList>

          <TabsContent value="report" className="border-0 p-0 mt-4">
            <ReportTab />
          </TabsContent>
          <TabsContent value="message" className="border-0 p-0 mt-4">
            <MessageTab />
          </TabsContent>
          <TabsContent value="alerts" className="border-0 p-0 mt-4">
            <AlertsTab />
          </TabsContent>
          <TabsContent value="acks" className="border-0 p-0 mt-4">
            <AckTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
