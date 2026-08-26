"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminDistrictSchoolBulkVerify } from "@/components/AdminDistrictSchoolBulkVerify";
import { AdminOrganizationForm } from "@/components/AdminOrganizationForm";
import { AdminOrganizationReviewActions } from "@/components/AdminOrganizationReviewActions";
import type { AdminOrganizationRow } from "@/lib/data/admin";
import {
  getDistrictReadinessSummary,
  type DistrictPilotReadiness,
  type DistrictReadResult,
} from "@/lib/district-readiness";

type Status = AdminOrganizationRow["verification_status"];
type StatusFilter = Status | "all";
type DistrictReadinessById = Record<
  string,
  DistrictReadResult<DistrictPilotReadiness>
>;

const TYPE_LABELS: Record<AdminOrganizationRow["type"], string> = {
  district: "District",
  school: "School",
  club: "Club",
  team: "Team",
};

const STATUS_META: Record<
  Status,
  { label: string; dot: string; badge: string }
> = {
  pending: {
    label: "Needs review",
    dot: "bg-brand-red",
    badge: "border-brand-red/30 bg-accent-soft text-brand-red",
  },
  rejected: {
    label: "Correction requested",
    dot: "border border-brand-red/60 bg-transparent",
    badge: "border-line bg-surface text-muted-strong",
  },
  verified: {
    label: "Verified",
    dot: "bg-brand-blue",
    badge: "border-brand-blue/30 bg-brand-blue-soft text-brand-blue-strong",
  },
};

const STATUS_ORDER: Record<Status, number> = {
  pending: 0,
  rejected: 1,
  verified: 2,
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusDot({ status, className = "" }: { status: Status; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-2 shrink-0 rounded-full ${STATUS_META[status].dot} ${className}`}
    />
  );
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-2xs font-semibold ${STATUS_META[status].badge}`}
    >
      {STATUS_META[status].label}
    </span>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

function OrganizationPanel({
  org,
  schools,
  readinessResult,
}: {
  org: AdminOrganizationRow;
  schools: AdminOrganizationRow[];
  readinessResult:
    | DistrictReadResult<DistrictPilotReadiness>
    | undefined;
}) {
  const review = org.organization_verification_reviews[0] ?? null;
  const pendingSchools = schools.filter(
    (school) => school.verification_status === "pending"
  );
  const isDistrict = org.type === "district";
  const readiness =
    readinessResult?.ok === true
      ? getDistrictReadinessSummary(readinessResult.data)
      : null;
  const parentPending =
    org.type === "school" && org.parent?.verification_status === "pending";

  return (
    <div className="grid gap-5 border-t border-line px-4 py-5 sm:px-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Fact label="Type">{TYPE_LABELS[org.type]}</Fact>
        <Fact label="State">{org.state ?? "—"}</Fact>
        <Fact label="Members">{org.member_count}</Fact>
        <Fact label="Tournaments">{org.tournament_count}</Fact>
        <Fact label="Added">{formatDate(org.created_at)}</Fact>
        <Fact label="Verified">
          {org.verification_status === "verified"
            ? formatDate(org.verified_at)
            : "—"}
        </Fact>
        {org.parent ? <Fact label="Part of">{org.parent.name}</Fact> : null}
        {review ? (
          <Fact label="Last reviewed">{formatDate(review.reviewed_at)}</Fact>
        ) : null}
      </dl>

      {isDistrict ? (
        readiness ? (
          <div className="border-t border-line pt-4">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted">
              Pilot readiness
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {readiness.readySchools} of {readiness.totalSchools}{" "}
              {readiness.totalSchools === 1 ? "school" : "schools"} ready
            </p>
            <p className="mt-1 text-xs text-muted">
              Next: {readiness.nextAction.title}.{" "}
              <Link
                href={readiness.nextAction.href}
                className="font-semibold text-brand-red hover:underline"
              >
                {readiness.nextAction.label}
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="border-t border-line pt-4" role="alert">
            <p className="text-sm font-semibold text-foreground">
              Pilot readiness unavailable
            </p>
            <p className="mt-1 text-xs text-muted">
              Do not treat this district as empty or ready.{" "}
              <Link
                href="/admin/organizations?retry=readiness"
                className="font-semibold text-brand-red hover:underline"
              >
                Retry organization readiness
              </Link>
              .
            </p>
          </div>
        )
      ) : null}

      {org.verification_status === "rejected" && review?.note ? (
        <p className="rounded-lg border border-brand-red/30 bg-accent-soft px-3 py-2 text-sm text-muted-strong">
          <strong className="font-semibold text-foreground">
            Correction requested:
          </strong>{" "}
          {review.note}
        </p>
      ) : null}

      {parentPending ? (
        <p className="text-xs text-muted">
          Tip: verify {org.parent?.name} first — school verification builds on
          a verified district.
        </p>
      ) : null}

      <AdminOrganizationReviewActions
        orgId={org.id}
        orgSlug={org.slug}
        orgName={org.name}
        initialStatus={org.verification_status}
        initialNote={review?.note ?? null}
      />

      {isDistrict && org.verification_status === "verified" ? (
        <AdminDistrictSchoolBulkVerify
          districtId={org.id}
          districtSlug={org.slug}
          districtName={org.name}
          schools={pendingSchools.map((school) => ({
            id: school.id,
            name: school.name,
          }))}
        />
      ) : null}

      {isDistrict && schools.length ? (
        <div>
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted">
            Schools in this district
          </p>
          <ul className="mt-2 grid gap-1.5">
            {schools.map((school) => (
              <li
                key={school.id}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <StatusDot status={school.verification_status} />
                <span className="min-w-0 flex-1 truncate">{school.name}</span>
                <span className="text-xs text-muted">
                  {STATUS_META[school.verification_status].label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-xs">
        <Link
          href={`/orgs/${org.slug}`}
          className="font-semibold text-muted-strong hover:text-brand-red"
        >
          Open workspace
        </Link>
        <Link
          href={`/admin/tournaments/new?org=${org.id}`}
          className="font-semibold text-muted-strong hover:text-brand-red"
        >
          Add tournament draft
        </Link>
      </div>
    </div>
  );
}

export function AdminOrganizationsExplorer({
  organizations,
  districtReadinessById,
  initialStatus = "all",
}: {
  organizations: AdminOrganizationRow[];
  districtReadinessById: DistrictReadinessById;
  initialStatus?: StatusFilter;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const schoolsByDistrict = useMemo(() => {
    const map = new Map<string, AdminOrganizationRow[]>();
    for (const org of organizations) {
      if (!org.parent_org_id) continue;
      const list = map.get(org.parent_org_id) ?? [];
      list.push(org);
      map.set(org.parent_org_id, list);
    }
    return map;
  }, [organizations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return organizations
      .filter((org) => {
        if (statusFilter !== "all" && org.verification_status !== statusFilter)
          return false;
        if (typeFilter !== "all" && org.type !== typeFilter) return false;
        if (!q) return true;
        return (
          org.name.toLowerCase().includes(q) ||
          (org.state ?? "").toLowerCase().includes(q) ||
          (org.parent?.name ?? "").toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          STATUS_ORDER[a.verification_status] -
            STATUS_ORDER[b.verification_status] || a.name.localeCompare(b.name)
      );
  }, [organizations, query, statusFilter, typeFilter]);

  return (
    <div className="grid gap-6">

      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-52 flex-1">
          <span className="sr-only">Search organizations</span>
          <input
            type="search"
            className="field"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, state, or district…"
          />
        </label>
        <label>
          <span className="sr-only">Filter by type</span>
          <select
            className="field"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All types</option>
            <option value="district">Districts</option>
            <option value="school">Schools</option>
            <option value="club">Clubs</option>
            <option value="team">Teams</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => setCreateOpen((open) => !open)}
          aria-expanded={createOpen}
          className="cta-enabled"
        >
          {createOpen ? "Close form" : "Add organization"}
        </button>
      </div>

      {createOpen ? (
        <section
          aria-label="Add an organization"
          className="rounded-xl border border-line bg-surface p-5"
        >
          <h2 className="text-sm font-semibold text-foreground">
            Add a district or school
          </h2>
          <p className="mt-1 text-xs text-muted">
            New records start as pending — verify them after checking their
            identity. Clubs and teams are started by their own coaches, not
            here.
          </p>
          <div className="mt-4">
            <AdminOrganizationForm />
          </div>
        </section>
      ) : null}

      {!organizations.length ? (
        <div className="rounded-xl border border-line bg-surface px-5 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">
            No organizations yet
          </p>
          <p className="mt-1 text-sm text-muted">
            Add the first district or school to start building the directory.
          </p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="cta-enabled mt-4"
          >
            Add organization
          </button>
        </div>
      ) : !filtered.length ? (
        <div className="rounded-xl border border-line bg-surface px-5 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">
            Nothing matches
          </p>
          <p className="mt-1 text-sm text-muted">
            Try a different search or clear the filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setStatusFilter("all");
              setTypeFilter("all");
              router.replace("/admin/organizations");
            }}
            className="mt-4 rounded-md border border-line px-4 py-2 text-sm font-semibold text-muted-strong transition-colors hover:border-brand-red/40 hover:text-brand-red"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {filtered.map((org) => {
            const open = expandedId === org.id;
            const schools = schoolsByDistrict.get(org.id) ?? [];
            const readinessResult =
              org.type === "district"
                ? districtReadinessById[org.id]
                : undefined;
            const readiness =
              readinessResult?.ok === true
                ? getDistrictReadinessSummary(readinessResult.data)
                : null;
            return (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : org.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-soft sm:px-5"
                >
                  <StatusDot status={org.verification_status} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {org.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {TYPE_LABELS[org.type]}
                      {org.state ? ` · ${org.state}` : ""}
                      {org.parent ? ` · ${org.parent.name}` : ""}
                      {org.type === "district" && schools.length
                        ? ` · ${schools.length} ${
                            schools.length === 1 ? "school" : "schools"
                          }`
                        : ""}
                    </span>
                    {org.type === "district" ? (
                      <span className="mt-1 block truncate text-xs font-semibold text-muted-strong">
                        {readiness
                          ? `${readiness.readySchools} of ${readiness.totalSchools} ${
                              readiness.totalSchools === 1
                                ? "school"
                                : "schools"
                            } ready · ${readiness.nextAction.title}`
                          : "Pilot readiness unavailable · retry before operating"}
                      </span>
                    ) : null}
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted sm:block">
                    Added {formatDate(org.created_at)}
                  </span>
                  <StatusBadge status={org.verification_status} />
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                    className={`size-4 shrink-0 text-muted transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  >
                    <path
                      d="M4 6l4 4 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                {open ? (
                  <OrganizationPanel
                    org={org}
                    schools={schools}
                    readinessResult={readinessResult}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
