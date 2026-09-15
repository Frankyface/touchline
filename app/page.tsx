import Notebook from "@/components/touchline/notebook";
import { requireChatGPTUser } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  await requireChatGPTUser("/");
  return <Notebook />;
}
