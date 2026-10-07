import { getCustomers } from "@/lib/data";
import { AddJobForm } from "./AddJobForm";

export const metadata = { title: "New job" };
export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const customers = await getCustomers();
  return <AddJobForm customers={customers} />;
}
