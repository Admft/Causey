"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminDistrictProvisionForm } from "@/components/AdminDistrictProvisionForm";
import { AdminDistrictSchoolBulkVerify } from "@/components/AdminDistrictSchoolBulkVerify";
import { AdminOrganizationReviewActions } from "@/components/AdminOrganizationReviewActions";
import { AdminSchoolProvisionForm } from "@/components/AdminSchoolProvisionForm";
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

function schoolTypeLine(org: AdminOrganizationRow): string {
  if (org.type !== "school") {
    return [
      TYPE_LABELS[org.type],
      org.state,
      org.parent?.name,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const parts = [
    "School account",
    org.state,
    org.parent ? `part of ${org.parent.name}` : "not under a district",
  ];
  return parts.join(" · ");
}

function schoolAdminLine(org: AdminOrganizationRow): string | null {
  if (org.type !== "school") return null;
  if (!org.schoolAdminStaffing) return null;
  if (!org.schoolAdminStaffing.ok) {
    return "School administrator status unavailable";
  }
  return org.schoolAdminStaffing.label;
}

function orgMatchesFilters(
  org: AdminOrganizationRow,
  query: string,
  statusFilter: StatusFilter,
  typeFilter: string,
  options?: { ignoreType?: boolean }
): boolean {
  if (
    statusFilter !== "all" &&
    org.verification_status !== statusFilter
  ) {
    return false;
  }
  if (!options?.ignoreType && typeFilter !== "all" && org.type !== typeFilter) {
    return false;
  }
  if (!query) return true;
  return (
    org.name.toLowerCase().includes(query) ||
    (org.state ?? "").toLowerCase().includes(query) ||
    (org.parent?.name ?? "").toLowerCase().includes(query)
  );
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
        {org.type === "school" ? (
          <Fact label="School administrator">
            {org.schoolAdminStaffing == null
              ? "—"
              : org.schoolAdminStaffing.ok
                ? org.schoolAdminStaffing.label
                : "Unavailable"}
          </Fact>
        ) : null}
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
  canProvisionDistrict = false,
}: {
  organizations: AdminOrganizationRow[];
  districtReadinessById: DistrictReadinessById;
  initialStatus?: StatusFilter;
  /** District creation is reserved for founder super admins. */
  canProvisionDistrict?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [provisionKind, setProvisionKind] = useState<
    null | "district" | "school"
  >(null);

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

  const districts = useMemo(
    () =>
      organizations
        .filter((org) => org.type === "district")
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((org) => ({
          id: org.id,
          name: org.name,
          state: org.state,
        })),
    [organizations]
  );

  const directory = useMemo(() => {
    const q = query.trim().toLowerCase();
    type DirectoryItem = {
      org: AdminOrganizationRow;
      nested: boolean;
    };
    const items: DirectoryItem[] = [];
    const nestedSchoolIds = new Set<string>();
    const useTree = typeFilter === "all" || typeFilter === "district";

    if (useTree) {
      const districtsInScope = organizations
        .filter((org) => org.type === "district")
        .slice()
        .sort(
          (a, b) =>
            STATUS_ORDER[a.verification_status] -
              STATUS_ORDER[b.verification_status] ||
            a.name.localeCompare(b.name)
        );

      for (const district of districtsInScope) {
        const childSchools = (schoolsByDistrict.get(district.id) ?? [])
          .filter((school) =>
            orgMatchesFilters(school, q, statusFilter, typeFilter, {
              ignoreType: typeFilter === "district",
            })
          )
          .sort(
            (a, b) =>
              STATUS_ORDER[a.verification_status] -
                STATUS_ORDER[b.verification_status] ||
              a.name.localeCompare(b.name)
          );
        const districtMatches = orgMatchesFilters(
          district,
          q,
          statusFilter,
          typeFilter
        );
        if (!districtMatches && !childSchools.length) continue;
        items.push({ org: district, nested: false });
        for (const school of childSchools) {
          nestedSchoolIds.add(school.id);
          items.push({ org: school, nested: true });
        }
      }
    }

    const leaves = organizations
      .filter((org) => {
        if (nestedSchoolIds.has(org.id)) return false;
        if (useTree && org.type === "district") return false;
        if (useTree && org.type === "school" && org.parent_org_id) return false;
        return orgMatchesFilters(org, q, statusFilter, typeFilter);
      })
      .sort(
        (a, b) =>
          STATUS_ORDER[a.verification_status] -
            STATUS_ORDER[b.verification_status] || a.name.localeCompare(b.name)
      );
    for (const org of leaves) {
      items.push({ org, nested: false });
    }
    return items;
  }, [organizations, query, schoolsByDistrict, statusFilter, typeFilter]);

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
        {canProvisionDistrict ? (
          <>
            <button
              type="button"
              onClick={() =>
                setProvisionKind((kind) =>
                  kind === "district" ? null : "district"
                )
              }
              aria-expanded={provisionKind === "district"}
              className="cta-enabled"
            >
              {provisionKind === "district" ? "Close form" : "Provision district"}
            </button>
            <button
              type="button"
              onClick={() =>
                setProvisionKind((kind) =>
                  kind === "school" ? null : "school"
                )
              }
              aria-expanded={provisionKind === "school"}
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground hover:border-brand-red/35 hover:text-brand-red"
            >
              {provisionKind === "school" ? "Close form" : "Provision school"}
            </button>
          </>
        ) : null}
      </div>

      {provisionKind === "district" && canProvisionDistrict ? (
        <section
          aria-label="Provision a district"
          className="rounded-xl border border-line bg-surface p-5"
        >
          <h2 className="text-sm font-semibold text-foreground">
            Provision a district after the contract lands
          </h2>
          <p className="mt-1 text-xs text-muted">
            Creates the district, invites its first administrator, and gives you
            a claim link and a code to read over the phone. Add schools under
            it next — from here or from the district office.
          </p>
          <div className="mt-4">
            <AdminDistrictProvisionForm />
          </div>
        </section>
      ) : null}

      {provisionKind === "school" && canProvisionDistrict ? (
        <section
          aria-label="Provision a school"
          className="rounded-xl border border-line bg-surface p-5"
        >
          <h2 className="text-sm font-semibold text-foreground">
            Provision a school under a district
          </h2>
          <p className="mt-1 text-xs text-muted">
            Creates a school account as a child of the district and invites its
            named administrator. Students join that school, never the district
            office.
          </p>
          <div className="mt-4">
            <AdminSchoolProvisionForm districts={districts} />
          </div>
        </section>
      ) : null}

      {!organizations.length ? (
        <div className="rounded-xl border border-line bg-surface px-5 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">
            No organizations yet
          </p>
          <p className="mt-1 text-sm text-muted">
            {canProvisionDistrict
              ? "Provision the first district after the contract lands, then add its schools."
              : "Districts and schools are created by founder super admins. Clubs and teams are started by their coaches."}
          </p>
          {canProvisionDistrict ? (
            <button
              type="button"
              onClick={() => setProvisionKind("district")}
              className="cta-enabled mt-4"
            >
              Provision district
            </button>
          ) : null}
        </div>
      ) : !directory.length ? (
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
          {directory.map(({ org, nested }) => {
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
            const adminLine = schoolAdminLine(org);
            return (
              <li key={`${nested ? "nested" : "root"}-${org.id}`}>
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : org.id)}
                  aria-expanded={open}
                  className={`flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-surface-soft sm:px-5 ${
                    nested ? "bg-surface-soft/60 pl-8 pr-4 sm:pl-12" : "px-4"
                  }`}
                >
                  <StatusDot status={org.verification_status} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {org.name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {schoolTypeLine(org)}
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
                    {adminLine ? (
                      <span className="mt-1 block truncate text-xs font-semibold text-muted-strong">
                        {adminLine}
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
