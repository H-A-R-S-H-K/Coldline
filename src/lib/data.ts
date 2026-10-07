import "server-only";
import { createClient } from "./supabase/server";
import type { Activity, Customer, Job } from "./types";
import { ACTIVE_STATUSES } from "./types";

const JOB_SELECT = "*, customer:customers(id, name, phone)";

function normalize(row: Record<string, unknown>): Job {
  const job = row as unknown as Job;
  return {
    ...job,
    estimated_value: job.estimated_value === null ? null : Number(job.estimated_value),
  };
}

export async function getActiveJobs(): Promise<Job[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("jobs").select(JOB_SELECT).in("status", ACTIVE_STATUSES);
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalize);
}

export async function getAllJobs(): Promise<Job[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .order("last_updated_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map(normalize);
}

export async function getJob(id: string): Promise<{ job: Job; activities: Activity[] } | null> {
  const supabase = await createClient();
  const [{ data: job, error }, { data: activities }] = await Promise.all([
    supabase.from("jobs").select(JOB_SELECT).eq("id", id).maybeSingle(),
    supabase.from("activities").select("*").eq("job_id", id).order("created_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  if (!job) return null;
  return { job: normalize(job), activities: (activities ?? []) as Activity[] };
}

export async function getCustomers(): Promise<Customer[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("id, name, phone").order("name");
  return (data ?? []) as Customer[];
}
