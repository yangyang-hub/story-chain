import ChainDataBrowser from "../../components/ChainDataBrowser";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "链上数据监控 | Story Chain",
  description: "监控和查看Story Chain智能合约的链上数据",
};

export default function ChainDataPage() {
  return (
    <main className="min-h-screen bg-base-100">
      <ChainDataBrowser />
    </main>
  );
}