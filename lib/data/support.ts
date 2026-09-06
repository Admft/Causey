import "server-only";

import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getSessionUser } from "@/lib/auth/session";
import { getServiceRoleClient } from "@/lib/supabase/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  SUPPORT_ATTACHMENT_BUCKET,
  type SupportMessageAuthorRole,
  type SupportReportStatus,
} from "@/lib/support";

export type SupportReportMessage = {
  id: string;
  authorRole: SupportMessageAuthorRole;
  authorId: string | null;
  body: string;
  createdAt: string;
};

export type SupportReportRecord = {
  id: string;
  reporterUserId: string | null;
  reporterEmail: string;
  body: string;
  pageLabel: string | null;
  attachmentPath: string | null;
  attachmentUrl: string | null;
  status: SupportReportStatus;
  createdAt: string;
  updatedAt: string;
  messages: SupportReportMessage[];
};

type ReportRow = {
  id: string;
  reporter_user_id: string | null;
  reporter_email: string;
  body: string;
  page_label: string | null;
  attachment_path: string | null;
  status: SupportReportStatus;
  created_at: string;
  updated_at: string;
  support_report_messages?: {
    id: string;
    author_role: SupportMessageAuthorRole;
    author_id: string | null;
    body: string;
    created_at: string;
  }[];
};

const REPORT_SELECT =
  "id, reporter_user_id, reporter_email, body, page_label, attachment_path, status, created_at, updated_at, support_report_messages ( id, author_role, author_id, body, created_at )";

const REPORT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function adminSupportClient() {
  const admin = await getPlatformAdminUser();
  if (!admin) return null;
  return getServiceRoleClient() ?? (await createServerSupabaseClient());
}

const STATUS_RANK: Record<SupportReportStatus, number> = {
  open: 0,
  replied: 1,
  closed: 2,
};

async function signedAttachmentUrl(
  path: string | null
): Promise<string | null> {
  if (!path) return null;
  const service = getServiceRoleClient();
  if (!service) return null;
  const { data, error } = await service.storage
    .from(SUPPORT_ATTACHMENT_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function mapReport(row: ReportRow, attachmentUrl: string | null): SupportReportRecord {
  const messages = [...(row.support_report_messages ?? [])]
    .sort((left, right) => left.created_at.localeCompare(right.created_at))
    .map((message) => ({
      id: message.id,
      authorRole: message.author_role,
      authorId: message.author_id,
      body: message.body,
      createdAt: message.created_at,
    }));

  return {
    id: row.id,
    reporterUserId: row.reporter_user_id,
    reporterEmail: row.reporter_email,
    body: row.body,
    pageLabel: row.page_label,
    attachmentPath: row.attachment_path,
    attachmentUrl,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages,
  };
}

function sortReports(rows: SupportReportRecord[]): SupportReportRecord[] {
  return [...rows].sort((left, right) => {
    const status = STATUS_RANK[left.status] - STATUS_RANK[right.status];
    if (status !== 0) return status;
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export async function getMySupportReports(): Promise<{
  reports: SupportReportRecord[];
  error: string | null;
}> {
  const user = await getSessionUser();
  if (!user) return { reports: [], error: null };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("support_reports")
    .select(REPORT_SELECT)
    .eq("reporter_user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return {
      reports: [],
      error: "Problem reports could not be loaded.",
    };
  }
  const mapped = await Promise.all(
    ((data ?? []) as ReportRow[]).map(async (row) =>
      mapReport(row, await signedAttachmentUrl(row.attachment_path))
    )
  );
  return { reports: sortReports(mapped), error: null };
}

export async function getAdminSupportReports(): Promise<{
  reports: SupportReportRecord[];
  error: string | null;
}> {
  const supabase = await adminSupportClient();
  if (!supabase) {
    return { reports: [], error: "Platform administrator access required." };
  }
  const { data, error } = await supabase
    .from("support_reports")
    .select(REPORT_SELECT)
    .order("created_at", { ascending: false });
  if (error) {
    return {
      reports: [],
      error: "Problem reports could not be loaded.",
    };
  }
  const mapped = ((data ?? []) as ReportRow[]).map((row) =>
    mapReport(row, null)
  );
  return { reports: sortReports(mapped), error: null };
}

export async function getAdminSupportReport(
  reportId: string
): Promise<{ report: SupportReportRecord | null; error: string | null }> {
  if (!REPORT_ID.test(reportId)) {
    return { report: null, error: "That report was not found." };
  }
  const supabase = await adminSupportClient();
  if (!supabase) {
    return { report: null, error: "Platform administrator access required." };
  }
  const { data, error } = await supabase
    .from("support_reports")
    .select(REPORT_SELECT)
    .eq("id", reportId)
    .maybeSingle();
  if (error) {
    return { report: null, error: "That report could not be loaded." };
  }
  if (!data) return { report: null, error: "That report was not found." };
  const row = data as ReportRow;
  return {
    report: mapReport(row, await signedAttachmentUrl(row.attachment_path)),
    error: null,
  };
}

export async function countSupportReportsByStatus(): Promise<{
  open: number | null;
  replied: number | null;
  closed: number | null;
}> {
  const supabase = await createServerSupabaseClient();
  const countStatus = async (status: SupportReportStatus) => {
    const { count, error } = await supabase
      .from("support_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", status);
    if (error) return null;
    return count ?? 0;
  };
  const [open, replied, closed] = await Promise.all([
    countStatus("open"),
    countStatus("replied"),
    countStatus("closed"),
  ]);
  return { open, replied, closed };
}
