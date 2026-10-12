# PRODUCT REQUIREMENTS DOCUMENT (PRD)

# OneKINRA --- Single Digital Gateway KINRA

**Document ID:** PRD-ONEKINRA-001\
**Version:** 1.0\
**Status:** Draft for AI Agent Development\
**Product Owner:** PT Kawasan Industri Nusantara (KINRA)\
**Product Type:** Internal and Tenant Digital Portal\
**Primary Language:** Bahasa Indonesia\
**Target Domain:** `one.kinra.co.id` (proposed; availability and DNS
configuration must be verified)

------------------------------------------------------------------------

## 1. Executive Summary

OneKINRA is a unified digital gateway for PT Kawasan Industri Nusantara
(KINRA), designed to provide employees, management, administrators, and
industrial-estate tenants with one entry point to authorized digital
applications and services.

The product is not intended to replace every existing application with
one monolithic application. It is a portal and identity-aware
application launcher that connects users to applications that may remain
independently deployed. Where supported, Single Sign-On (SSO) should
allow users to move between integrated applications without repeatedly
authenticating.

**Product principle:** One Gateway. One Identity. Connected Services.

OneKINRA should reduce the need to remember multiple application
domains, improve user experience, establish consistent access
governance, and provide a scalable foundation for KINRA's digital
services.

## 2. Business Context and Problem Statement

KINRA's digital services may be delivered through multiple applications,
each with its own URL, login mechanism, user interface, and
access-management model. This can cause:

-   Users having to remember multiple domains and bookmarks.
-   Repeated logins across applications.
-   Inconsistent user onboarding and offboarding.
-   Difficulty enforcing consistent authorization and auditability.
-   Fragmented user experience for internal staff and tenant
    organizations.
-   Increased support effort when users cannot locate the right service.

OneKINRA addresses these issues through a common portal, centralized
identity integration, role-aware workspaces, and a curated application
catalogue.

## 3. Product Vision and Objectives

### 3.1 Vision

Make OneKINRA the default digital entry point for KINRA employees and
tenant organizations accessing KINRA's digital services.

### 3.2 Objectives

1.  Provide one memorable primary URL for access to KINRA digital
    services.
2.  Present applications based on the user's identity, organization, and
    permissions.
3.  Support a centralized identity and SSO architecture.
4.  Separate internal KINRA access from tenant access.
5.  Provide an extensible application catalogue that can include
    current, future, and third-party applications.
6.  Improve application discoverability and reduce avoidable
    access-support requests.
7.  Establish auditable access, administrative actions, and security
    controls.
8.  Enable phased delivery without requiring all applications to be
    rebuilt.

### 3.3 Success Metrics

Initial targets are proposed and must be confirmed by the Product Owner
after baseline measurement.

  -----------------------------------------------------------------------
  Metric                                                  Proposed Target
  ------------------------------ ----------------------------------------
  Users who can find and open an            ≥ 95% in pilot usability test
  assigned application from      
  OneKINRA                       

  Portal availability             ≥ 99.5% monthly for initial production;
                                       higher target may be adopted after
                                                                   sizing

  Applications in the catalogue                                      100%
  with an accountable owner and  
  support contact                

  Applications displaying for                               0 known cases
  unauthorized roles             

  Tenant A users able to access                                         0
  Tenant B restricted data       

  Administrative and                              100% of in-scope events
  authentication events logged   

  Successful SSO handoff for                  ≥ 95% in acceptance testing
  integrated applications        

  User onboarding/offboarding                            SLA to be agreed
  processed within approved      
  operational SLA                
  -----------------------------------------------------------------------

Metrics must be measurable and should not be represented as achieved
until supported by production telemetry or test evidence.

## 4. Scope

### 4.1 In Scope --- MVP

-   Responsive OneKINRA portal web application.
-   Login and logout experience.
-   Integration-ready identity layer; use an interim authentication
    method only if enterprise IAM is not yet deployed.
-   Role- and organization-aware workspace routing.
-   Internal KINRA and Tenant workspaces.
-   Application catalogue with categories, descriptions, icons, links,
    ownership, and status.
-   Application visibility based on permissions.
-   Search and filtering of authorized applications.
-   Application launch and SSO handoff for integrated applications.
-   User profile and basic account information.
-   Administrative management of application catalogue entries.
-   Basic user, organization, role, and permission administration,
    subject to the selected IAM design.
-   Audit trail for authentication-related events, administrative
    changes, and application launches where technically observable.
-   Responsive desktop, tablet, and mobile layouts.
-   Basic operational monitoring, error handling, and health checks.
-   Seed data for development and demonstration.
-   Documentation for deployment, configuration, testing, and
    operations.

### 4.2 In Scope --- Subsequent Releases

-   Personalized favorites and recently used applications.
-   Announcements and service notifications.
-   Links to IT service requests or Tenant Service Center.
-   Usage analytics and application adoption dashboard.
-   Tenant administrator self-service, subject to governance approval.
-   Multi-language support if justified by user research.
-   Enterprise search across applications only where secure APIs and
    authorization-aware search are available.
-   Deeper integration with API gateway and observability platform.
-   Progressive Web App capabilities if supported by business need.

### 4.3 Out of Scope for MVP

-   Rebuilding ERP, HRIS, GIS, Risk, PMO, document management, or
    tenant-service applications inside the portal.
-   Replacing the system of record for finance, HR, contracts, land,
    utilities, or other operational data.
-   Creating a custom identity provider from scratch for production use.
-   Automatically granting access to every application to every
    authenticated user.
-   Cross-tenant data sharing unless explicitly approved and designed.
-   Full enterprise document management.
-   A complete API management platform.
-   Native iOS or Android applications.
-   Business processes that belong inside the destination applications
    rather than the portal.

## 5. Users, Organizations, and Roles

### 5.1 User Groups

1.  **KINRA Executive:** May access executive dashboards and approved
    management applications.
2.  **KINRA Employee:** Accesses applications assigned to their
    organizational role.
3.  **KINRA IT Administrator:** Manages portal configuration, catalogue
    entries, and authorized technical administration.
4.  **KINRA Application Owner:** Maintains metadata for applications
    they own, if delegated administration is enabled.
5.  **Tenant Organization Administrator:** Manages approved users
    belonging only to their tenant organization, if enabled.
6.  **Tenant User:** Accesses services and applications authorized for
    their tenant and assigned role.
7.  **Auditor / Read-only Reviewer:** Receives explicitly scoped
    read-only access where required.

Roles are logical product roles. The implementation must map them to the
chosen IAM provider and avoid assuming that a display role alone is
sufficient for authorization.

### 5.2 Organization Model

The data and identity model must support at least:

-   KINRA as the platform-owning organization.
-   Multiple tenant organizations.
-   Users associated with one or more approved organizations, if
    required.
-   Organization-specific roles and entitlements.
-   Application access grants scoped by organization.
-   A tenant administrator restricted to their own organization.

A user who has multiple approved organization memberships must select or
switch context explicitly where that affects authorization. The active
organization context must be visible in the UI.

### 5.3 Authorization Rules

-   Apply least privilege and deny-by-default.
-   Authentication establishes identity; authorization separately
    determines access.
-   Every protected server-side route and API must validate permissions
    server-side.
-   Hiding an application tile in the frontend is not an authorization
    control.
-   Tenant data must be isolated by organization at every relevant
    data-access boundary.
-   Admin privileges must be limited to the minimum set required for
    assigned duties.
-   Emergency or break-glass access, if implemented, must be explicitly
    approved, time-bound where feasible, and audited.
-   Never trust organization IDs, role names, or entitlement claims
    supplied by the browser without server-side validation.

## 6. Application Catalogue

### 6.1 Proposed Initial Categories

**Internal KINRA workspace:** - ERP / Finance / Procurement - HRIS and
Employee Services - IT Service Management - Risk, Compliance, and
Assurance - PMO / Project Management - GIS / Land Management - Utility
Management - Executive Command Center - Document Management - Other
approved internal applications

**Tenant workspace:** - Tenant Service Center - Contracts and Land
Information - Service Requests and Complaints - Billing and Payments -
Utilities and Metering - Operational Permits and Approvals - HSE
Reporting - Connectivity and Digital Services - Estate Announcements and
Information

These are catalogue categories and future-state examples, not a claim
that each application currently exists. Catalogue entries must have an
implementation status such as `Available`, `Pilot`, `Planned`, or
`Unavailable`.

### 6.2 Application Metadata

Each catalogue entry should support:

-   Unique application ID.
-   Application name.
-   Short description.
-   Icon or approved image.
-   Category.
-   Target URL.
-   Application owner.
-   Business owner or service owner.
-   Support contact or support route.
-   Intended audience: internal, tenant, or both.
-   Required roles / entitlements.
-   Organization scope.
-   Integration mode: SSO, authenticated deep link, or external link.
-   Status: available, pilot, planned, maintenance, or retired.
-   Environment: production, staging, or development; non-production
    links must not be exposed to ordinary production users.
-   Display order and featured flag.
-   Created/updated metadata.
-   Optional health/status indicator only if supported by a trustworthy
    health endpoint.

### 6.3 Catalogue Behaviour

-   Users see only applications they are authorized to access.
-   Search and category filters operate only on the user's authorized
    catalogue.
-   Opening an application uses a validated URL from trusted server-side
    configuration.
-   External links must be clearly identified and opened safely.
-   Avoid exposing internal-only hostnames, test links, secrets, or
    infrastructure details.
-   A failed application launch must show a helpful error and a support
    route.
-   A maintenance status must not be inferred unless supplied by a
    reliable source.
-   Retired applications must not be launchable by ordinary users.

## 7. Functional Requirements

Priority convention: **P0 = mandatory for MVP**, **P1 = important next
release**, **P2 = optional/future**.

### FR-01 --- Portal Landing Page (P0)

The system shall display a branded OneKINRA landing page with a clear
login state, workspace context, application catalogue, and responsive
navigation.

**Acceptance criteria** - An unauthenticated user sees the approved
public/login entry state. - An authenticated user sees only their
authorized workspace and applications. - The layout works at common
desktop, tablet, and mobile viewport sizes. - The page displays a clear
product identity and does not expose restricted application metadata.

### FR-02 --- Authentication (P0)

The system shall authenticate users through the configured identity
provider.

**Acceptance criteria** - Login, logout, session expiry, and
unauthorized access are handled consistently. - Authentication secrets
and tokens are never written to application logs. - Failed login does
not reveal whether an arbitrary account exists beyond what the identity
provider safely discloses. - Production authentication uses HTTPS. - If
enterprise IAM is not ready, any interim authentication must be
documented as temporary and designed for migration; do not build a
bespoke production identity platform.

### FR-03 --- SSO / Identity Provider Integration (P0)

The portal shall be designed to integrate with a standards-based
identity provider. Preferred protocols are OpenID Connect (OIDC) and
OAuth 2.0; SAML 2.0 may be required for compatible enterprise
applications.

**Preferred IAM candidate:** ZITADEL, subject to a proof of concept and
architecture/security review. Keycloak is an alternative for evaluation.
The PRD does not mandate a final vendor choice.

**Acceptance criteria** - Identity-provider integration uses supported
SDKs and validated protocol flows. - OAuth/OIDC authorization code flow
with PKCE is used for browser-based public clients where applicable. -
Tokens are validated by issuer, audience, signature, expiry, and other
required claims. - The portal never stores a user's identity-provider
password. - Application SSO is considered complete only when the
destination application is separately configured and tested. -
Applications without SSO support may be opened as links, but the UI must
not claim that seamless SSO is available.

### FR-04 --- Workspace Routing (P0)

The system shall direct authorized users to the appropriate workspace
based on organization membership and entitlements.

**Acceptance criteria** - KINRA users see the internal workspace when
authorized. - Tenant users see the tenant workspace and only the
services granted to their tenant. - A user with multiple approved
contexts can select the active context, if enabled. - Direct URL access
cannot bypass workspace or application authorization.

### FR-05 --- Application Catalogue (P0)

The system shall display authorized applications as cards or list
entries with name, icon, description, category, and launch action.

**Acceptance criteria** - Each entry is sourced from controlled
application metadata. - The catalogue supports search and category
filtering. - Empty states and no-result states are understandable. -
Entries with status `Planned`, `Maintenance`, or `Retired` follow
configured launch rules. - Broken or invalid target URLs are rejected
during administration and cannot execute scripts.

### FR-06 --- Application Launch (P0)

The system shall open the configured destination application safely.

**Acceptance criteria** - Only administrator-approved URL schemes and
hosts are allowed. - Open redirects and user-controlled arbitrary URLs
are prevented. - Launch events record user reference, organization
context, application ID, timestamp, and result where available, without
logging secrets. - The system handles external applications and new-tab
behaviour consistently. - The portal does not claim to proxy or embed an
application unless that integration is explicitly implemented and
security-reviewed.

### FR-07 --- User Profile (P0)

The portal shall show basic profile details obtained from the identity
provider or approved user directory.

**Acceptance criteria** - Display name, user identifier, organization
context, and role summary are shown only as appropriate. - Users cannot
change authoritative organization membership or privileged roles through
the profile page. - Profile edits, if later enabled, must define the
authoritative source of each field.

### FR-08 --- Portal Administration (P0)

Authorized administrators shall manage catalogue entries and selected
portal settings.

**Acceptance criteria** - Create, read, update, and retire application
entries are supported. - Admin routes and API endpoints enforce
server-side permissions. - High-impact changes are audited. - Input is
validated server-side. - Destructive actions require confirmation. -
Changes to role or organization assignments are controlled by the
IAM/user-governance model and not casually mixed with catalogue
administration.

### FR-09 --- Organization and Entitlement Management (P0)

The system shall consume or manage organization and entitlement data
according to the approved identity architecture.

**Acceptance criteria** - Every tenant-scoped grant is linked to a
specific tenant organization. - Tenant administrators cannot assign
users to another tenant. - Revoked access becomes effective according to
the defined session/token policy. - The source of truth for users,
organizations, roles, and grants is documented. - Avoid duplicating IAM
data unless a justified cache or mapping is needed.

### FR-10 --- Audit Trail (P0)

The system shall record security-relevant and administrative events.

Events should include, as applicable: - Login success/failure outcome
from available identity-provider events. - Logout or session termination
where observable. - Application launch. - Application catalogue
create/update/retire. - Permission or organization assignment changes
where managed by the portal. - Administrative access and configuration
changes. - Rejected authorization attempts, with suitable rate controls
to prevent log flooding.

Each event should include timestamp, event type, actor or user reference
where available, organization context, target resource, outcome, and
correlation/request ID. Do not log passwords, access tokens, refresh
tokens, session cookies, secrets, or unnecessary sensitive data.

### FR-11 --- Error and Empty States (P0)

The system shall provide actionable error states for session expiry,
insufficient permissions, unavailable applications, and network/API
failures.

### FR-12 --- Favorites and Recent Applications (P1)

Users may pin favorites and view recently launched applications. Data
must be scoped to the correct user and, where relevant, organization.

### FR-13 --- Announcements and Notifications (P1)

Authorized administrators may publish approved announcements to internal
users, tenant users, or selected tenant organizations. Audience
selection must be authorization-checked.

### FR-14 --- Usage Analytics (P1)

The system may show aggregated portal and catalogue usage to authorized
administrators. Analytics must follow data minimization principles and
must not expose individual user activity broadly without a defined
legitimate purpose and access policy.

## 8. UX and Visual Design Requirements

-   Enterprise-grade, modern, clean interface suitable for a state-owned
    industrial-estate company.
-   Use KINRA's approved logo, brand colours, typography, and visual
    guidelines when supplied.
-   Do not invent or alter the official logo.
-   Prioritize fast application discovery over decorative content.
-   Show distinct but consistent Internal and Tenant workspaces.
-   Use responsive application cards, clear category filters, and
    prominent search.
-   Support keyboard navigation, visible focus indicators, semantic
    HTML, and accessible labels.
-   Provide loading, empty, error, and access-denied states.
-   Use Bahasa Indonesia as the initial interface language.
-   Avoid excessive animation and large decorative elements that reduce
    task efficiency.
-   Provide a clear logout action and show active user/organization
    context.

## 9. Technical Architecture and Stack

### 9.1 Architectural Principles

-   Modular architecture; do not create a monolith containing every
    business application.
-   API-first integration where appropriate.
-   Standards-based authentication.
-   Least privilege and deny-by-default authorization.
-   Tenant isolation at both identity and data layers.
-   Environment separation for development, staging, and production.
-   Configuration and secrets must be managed outside source code.
-   Observability and secure operations are part of the MVP, not
    post-launch extras.
-   The portal must remain usable when optional analytics or noncritical
    integrations are unavailable.

### 9.2 Preferred Stack

Use the following as the default unless the repository or explicit
technical direction specifies otherwise:

-   **Frontend:** Next.js App Router, React, TypeScript with strict
    mode.
-   **UI:** Tailwind CSS and shadcn/ui/Radix UI, following accessible
    component practices.
-   **Backend:** Next.js server-side handlers/server actions where
    appropriate, with a clearly defined service/data access layer.
-   **Database:** PostgreSQL only for portal-owned metadata or mappings
    that cannot reasonably remain in the IAM provider. Do not duplicate
    authoritative identity records unnecessarily.
-   **ORM/data access:** Choose and document one consistent approach
    based on the existing repository; do not introduce multiple
    overlapping data layers.
-   **Identity:** OIDC integration with the selected IAM provider;
    ZITADEL is the leading candidate for evaluation, Keycloak an
    alternative.
-   **Deployment:** Use the existing approved KINRA hosting environment.
    Do not assume Vercel or a public cloud is approved for production
    data.
-   **Monitoring:** Structured application logs, error tracking,
    uptime/health checks, and security-event integration appropriate to
    the hosting environment.

The AI agent must inspect the existing repository, package manager,
deployment conventions, and environment configuration before choosing
versions or replacing dependencies.

### 9.3 Logical Components

1.  Portal UI and workspace navigation.
2.  Authentication/session integration.
3.  Authorization and organization-context service.
4.  Application catalogue service.
5.  Administration interface.
6.  Audit-event service.
7.  Integration adapters for IAM and destination applications.
8.  Operational health and telemetry.

### 9.4 Domain and Routing Proposal

-   `kinra.co.id`: corporate public website.
-   `one.kinra.co.id`: primary OneKINRA portal.
-   `iam.kinra.co.id`: proposed identity endpoint, if supported by the
    selected deployment.
-   `api.kinra.co.id`: proposed API endpoint if a separate API gateway
    is justified.
-   `tenant.kinra.co.id`: optional alias or tenant entry point; it may
    redirect to the OneKINRA tenant workspace.

All are proposed hostnames and must be validated before configuration.
Users should normally need to remember only `one.kinra.co.id`.

## 10. Data Model --- Logical

The AI agent should adapt this model to the selected identity provider
and existing codebase. It is not a requirement to store every entity in
the portal database.

### 10.1 Application

-   `id` --- UUID or stable identifier.
-   `slug` --- unique stable slug.
-   `name`.
-   `description`.
-   `icon_key` or approved icon reference.
-   `category_id`.
-   `target_url`.
-   `audience` --- internal, tenant, or both.
-   `integration_mode` --- oidc_sso, saml_sso, authenticated_link,
    external_link.
-   `status` --- available, pilot, planned, maintenance, retired.
-   `owner_org_id` where applicable.
-   `support_contact`.
-   `display_order`.
-   `created_at`, `updated_at`, `created_by`, `updated_by`.

### 10.2 Category

-   `id`.
-   `name`.
-   `slug`.
-   `description`.
-   `display_order`.
-   `audience_scope`.

### 10.3 Organization Mapping

Only create a local mapping if the IAM provider's organization
identifiers need to be mapped to portal metadata. - `id`. -
`external_org_id`. - `display_name`. - `org_type` --- kinra or tenant. -
`status`. - `created_at`, `updated_at`.

### 10.4 Application Entitlement

Only create local entitlements if not managed authoritatively in IAM. -
`id`. - `application_id`. - `external_org_id` or organization mapping
reference. - `role_or_entitlement_key`. - `created_at`, `updated_at`.

### 10.5 User Preferences (P1)

-   `id`.
-   `external_user_id`.
-   `organization_context_id`, if required.
-   `favorite_application_ids` or normalized preference records.
-   `recent_application_ids` or normalized activity references.
-   `updated_at`.

### 10.6 Audit Event

Audit events may reside in a central logging platform instead of the
application database. - `id`. - `occurred_at`. - `actor_id` where
available. - `organization_id` where relevant. - `event_type`. -
`resource_type`. - `resource_id`. - `outcome`. - `correlation_id`. -
`metadata` containing only approved nonsecret attributes.

### 10.7 Data Integrity

-   Use unique constraints for slugs and relevant external identifiers.
-   Validate application URLs server-side.
-   Use migrations for schema changes.
-   Do not store plaintext passwords or identity-provider tokens in
    application tables.
-   Use soft retirement for catalogue entries where an audit history is
    needed.
-   Define retention and deletion policies for user preferences and
    audit records.
-   Apply database-level access controls and row-level policies where
    supported and appropriate.

## 11. Security, Privacy, and Compliance Requirements

1.  Enforce HTTPS in all environments that handle credentials or user
    sessions.
2.  Use secure, HttpOnly, and appropriately SameSite session cookies
    where applicable.
3.  Apply CSRF protections where relevant to the chosen session
    architecture.
4.  Implement Content Security Policy and appropriate security headers.
5.  Validate and sanitize all user-controlled inputs.
6.  Prevent SQL injection, XSS, open redirects, broken access control,
    and SSRF.
7.  Rate-limit sensitive endpoints and protect authentication flows.
8.  Apply MFA according to KINRA policy and IAM capability, especially
    for administrators.
9.  Use secure secret storage and rotate credentials according to
    policy.
10. Maintain dependency scanning and patching practices.
11. Ensure audit logs are access-controlled and protected against
    unauthorized modification.
12. Apply data minimization and documented retention policies.
13. Do not expose one tenant's data, application grants, or
    administrative functions to another tenant.
14. Do not place sensitive business data in URLs, browser logs,
    analytics payloads, or error messages.
15. Perform security review and tenant-isolation testing before
    production.
16. Define backup, restore, incident response, and disaster recovery
    requirements with the hosting owner.

The product team must validate applicable Indonesian personal-data and
electronic-system obligations with KINRA's legal, security, and
compliance stakeholders. This PRD is not a legal opinion.

## 12. Non-Functional Requirements

### Performance

-   Target initial portal content rendering within 2.5 seconds at the
    75th percentile under the agreed pilot network and test conditions,
    excluding external identity-provider and destination-application
    latency.
-   Search/filter interactions should feel immediate for the expected
    catalogue size; paginate or virtualize if needed.
-   Avoid blocking the whole portal on optional integrations.

### Availability and Resilience

-   Initial target: 99.5% monthly portal availability, subject to
    hosting capability and business approval.
-   Provide health checks for the portal and critical dependencies.
-   Show graceful error states if the IAM provider or a destination
    application is unavailable.
-   The portal must not report an application as healthy unless it has a
    reliable health signal.

### Scalability

-   Design for multiple tenant organizations and growing application
    counts.
-   Avoid hard-coded assumptions about a single tenant or a fixed number
    of applications.
-   Load-test with an agreed expected concurrency before production
    launch.

### Accessibility and Compatibility

-   Responsive support for current mainstream browsers used by KINRA.
-   Follow WCAG 2.1 AA principles where practical.
-   Ensure keyboard operation and readable contrast.

### Maintainability

-   TypeScript strict mode.
-   Consistent linting and formatting.
-   Unit, integration, and end-to-end tests for critical flows.
-   Document architecture decisions, environment variables, deployment,
    rollback, and support procedures.

## 13. Integrations

### 13.1 Identity Provider

-   OIDC first choice for new integrations.
-   SAML 2.0 where required by legacy/enterprise applications.
-   Define claims, role mapping, organization context, session lifetime,
    logout expectations, MFA, and deprovisioning behaviour.
-   Do not assume single logout works across every application; test and
    document actual behaviour.

### 13.2 Destination Applications

For each application, record: - Business and technical owner. - Target
URL and environment. - Authentication method. - Supported SSO
protocol. - Required claims/roles. - Tenant isolation model. - Support
contact and service criticality. - Health endpoint or status source, if
available.

Applications should be onboarded through a repeatable checklist. An
application may be visible as a normal link before full SSO integration,
provided its access controls remain secure and the UI accurately
describes the experience.

### 13.3 API Gateway

A separate API gateway is not mandatory for the first portal release.
Introduce one when justified by the number of APIs, security
requirements, traffic management, or integration complexity. Do not
build an unnecessary gateway merely to satisfy an architectural diagram.

## 14. Administration and Governance

-   KINRA must assign a product owner and a technical owner.
-   Each catalogue application must have a named business owner and
    technical/support contact.
-   Only authorized administrators can publish or retire catalogue
    entries.
-   Application owners should not grant themselves IAM privileges
    through catalogue metadata.
-   Establish a request-and-approval process for onboarding applications
    and granting access.
-   Define ownership of user lifecycle, tenant onboarding, tenant
    offboarding, and emergency access.
-   Maintain an application inventory with owner, data classification,
    SSO readiness, and lifecycle status.
-   Review access grants periodically and remove access when no longer
    justified.

## 15. MVP Screens

1.  **Login / Access Entry:** Identity-provider sign-in entry and
    helpful error handling.
2.  **Home / Workspace:** Greeting, active organization, search,
    category navigation, application cards.
3.  **Application Catalogue:** Searchable and filterable catalogue of
    authorized applications.
4.  **Application Details (optional for MVP):** Description,
    owner/support information, access requirements, launch action.
5.  **User Profile:** Basic profile and active organization context.
6.  **Admin --- Application Catalogue:** Create/edit/retire application
    metadata and control publication status.
7.  **Admin --- Access Overview:** Read-only display of effective access
    and IAM source, unless approved IAM administration is explicitly in
    scope.
8.  **Access Denied / Session Expired:** Clear recovery action.
9.  **System Error / Application Unavailable:** Helpful explanation and
    support route.

## 16. Acceptance Test Scenarios

### AT-01 --- Internal User

Given an authenticated KINRA employee with assigned internal
entitlements, when the user opens OneKINRA, then the portal shows the
internal workspace and only authorized applications.

### AT-02 --- Tenant User

Given an authenticated user belonging to Tenant A, when the user opens
OneKINRA, then the portal shows tenant services authorized for Tenant A
and does not show internal-only applications.

### AT-03 --- Cross-Tenant Isolation

Given a user belonging only to Tenant A, when the user attempts to
access Tenant B's protected resources by changing a URL, identifier, or
request payload, then the request is denied server-side and the attempt
is logged where appropriate.

### AT-04 --- Unauthorized Application Launch

Given a user without entitlement to Application X, when the user guesses
or directly visits the portal launch route for Application X, then the
portal denies the launch and does not disclose restricted metadata.

### AT-05 --- SSO-Enabled Application

Given a destination application correctly integrated with the same
identity provider, when an authorized user launches it, then the user
reaches the application without a second credential prompt under the
configured session policy.

### AT-06 --- Non-SSO Application

Given an approved application that does not support SSO, when a user
launches it, then the portal opens the approved URL and does not falsely
claim seamless SSO.

### AT-07 --- Retired Application

Given an application marked retired, when an ordinary user searches or
attempts to launch it, then it is not available for launch.

### AT-08 --- Catalogue Administration

Given an authorized portal administrator, when they update an
application's metadata, then validation runs, the change is persisted,
and an audit event is created.

### AT-09 --- Unauthorized Administration

Given an ordinary user, when they call an administrative API directly,
then the server denies the request even if the user manipulates the UI.

### AT-10 --- Session Expiry

Given an expired session, when a user attempts to open a protected
portal page, then the portal safely redirects to authentication or shows
a clear recovery flow without exposing protected data.

### AT-11 --- Unsafe URL

Given an administrator enters a disallowed scheme or unapproved URL,
when they save the application entry, then the system rejects the URL
with a useful validation message.

### AT-12 --- Audit Secret Hygiene

Given authentication and application launch events, when audit records
are inspected, then passwords, tokens, cookies, and secrets are absent.

### AT-13 --- Mobile Layout

Given a user on a supported mobile viewport, when they search and launch
an application, then the core workflow remains usable without horizontal
overflow.

### AT-14 --- IAM Unavailable

Given the identity provider is unavailable, when an unauthenticated user
opens the portal, then the portal displays a controlled error state and
does not bypass authentication.

## 17. Delivery Plan

### Phase 0 --- Repository and Architecture Discovery

-   Inspect the current repository and identify existing conventions.
-   Confirm framework, package manager, deployment target, and current
    authentication.
-   Inventory known applications and their SSO capability.
-   Identify the approved IAM decision and hosting constraints.
-   Produce a short architecture decision record before implementation.

### Phase 1 --- MVP Foundation

-   Implement portal shell, responsive layout, workspace model,
    catalogue, and search.
-   Integrate with the selected IAM provider in a development
    environment.
-   Implement authorization checks, catalogue administration, audit
    events, and tests.
-   Add seeded demo data clearly marked as non-production.

### Phase 2 --- Internal Pilot

-   Configure a small set of internal applications.
-   Test SSO with at least one compatible application.
-   Run role-based access tests, security checks, usability tests, and
    operational monitoring.
-   Collect pilot feedback and fix priority issues.

### Phase 3 --- Tenant Pilot

-   Configure tenant organization mappings and tenant workspace.
-   Test onboarding, tenant administrator boundaries if enabled,
    cross-tenant isolation, and deprovisioning.
-   Obtain security and business approval before inviting real tenant
    users.

### Phase 4 --- Production Readiness and Scale

-   Complete security review, backup/restore validation, monitoring,
    runbooks, and rollback plan.
-   Confirm service levels and support ownership.
-   Add applications through a controlled onboarding process.
-   Measure adoption and prioritize enhancements based on evidence.

## 18. Required Deliverables from the AI Agent

The AI development agent must produce:

1.  Working source code in the existing repository or a clearly
    documented new repository.
2.  A concise architecture decision record covering IAM, session model,
    authorization, data storage, and deployment.
3.  `.env.example` with names and explanations only; never commit real
    secrets.
4.  Database schema and versioned migrations if a portal database is
    required.
5.  Seed/demo data for application categories and clearly labelled
    sample applications.
6.  Unit and integration tests for authentication integration, access
    decisions, catalogue management, and URL validation.
7.  End-to-end tests for internal, tenant, unauthorized, and
    session-expiry flows.
8.  README with local setup, test commands, environment variables,
    deployment, and troubleshooting.
9.  Deployment instructions and rollback procedure.
10. Security checklist and known limitations.
11. Application onboarding checklist for future integrations.
12. A list of decisions that require KINRA approval, clearly separated
    from assumptions.

## 19. Instructions to the AI Agent Developer

Follow these instructions in order:

1.  **Inspect before coding.** Examine the existing repository, files,
    dependencies, and deployment setup. Do not overwrite working code or
    configuration without understanding it.
2.  **Create an implementation plan.** Summarize the architecture, key
    files to create/change, risks, and test plan before major changes.
3.  **Identify unresolved decisions.** Do not silently invent production
    IAM endpoints, secrets, DNS records, tenant IDs, official logos,
    production URLs, or security policy.
4.  **Use secure defaults.** Deny access by default, validate
    authorization server-side, and enforce tenant isolation.
5.  **Do not build a bespoke identity provider.** Integrate a supported
    IAM provider. If it is not available in the development environment,
    use a clearly labelled mock adapter for local development only;
    never present the mock as production authentication.
6.  **Do not hard-code access grants.** Use configuration, identity
    claims, or controlled entitlement mappings.
7.  **Keep integrations modular.** A catalogue entry must not imply that
    the destination application's SSO or API integration is complete.
8.  **Build incrementally.** Deliver a functional vertical slice, run
    tests, inspect failures, then proceed.
9.  **Verify every critical flow.** Include direct API access and
    cross-tenant negative tests, not just UI tests.
10. **Do not claim completion without evidence.** Report implemented
    features, tests executed, test results, and known gaps accurately.
11. **Avoid unnecessary dependencies and overengineering.** Choose the
    simplest design that satisfies the requirements.
12. **Ask for approval before irreversible or production-impacting
    actions.** Do not deploy to production, change DNS, rotate live
    credentials, or modify production IAM without explicit
    authorization.

### Expected First Response from the AI Agent

Before coding, the agent should return: - Repository and stack
findings. - Proposed architecture and IAM integration approach. -
Assumptions and unresolved decisions. - Implementation sequence. -
Security and tenant-isolation risks. - Tests it will run.

The agent may then start Phase 1 after identifying any blocking
decisions. Use mock identity only for local development if needed.

## 20. Assumptions and Decisions Requiring KINRA Approval

  -----------------------------------------------------------------------
  Item                    Initial Assumption      Required Action
  ----------------------- ----------------------- -----------------------
  Portal hostname         `one.kinra.co.id`       Verify domain/DNS
                                                  ownership and TLS

  IAM provider            ZITADEL preferred for   Approve after PoC and
                          PoC; Keycloak           security review
                          alternative             

  Production hosting      Approved KINRA          Confirm environment,
                          environment, not        data residency, backup,
                          assumed                 and DR

  User source of truth    IAM provider or         Decide ownership and
                          approved directory      synchronization

  Tenant onboarding       Controlled process;     Define approval and
                          self-service not MVP by verification
                          default                 

  MFA                     Required for privileged Confirm baseline and
                          accounts according to   enforcement
                          policy                  

  Application catalogue   Initially managed by    Assign owners and
                          authorized KINRA admin  operating process

  Audit retention         Per KINRA               Define retention and
                          security/compliance     access policy
                          policy                  

  Availability target     Initial proposal 99.5%  Approve based on
                          monthly                 criticality and hosting

  Branding                Official KINRA brand    Provide approved logo
                          assets supplied by      and design tokens
                          owner                   

  First integrated        To be selected for      Confirm priority
  applications            pilot                   applications and owners
  -----------------------------------------------------------------------

## 21. Definition of Done

The MVP is complete only when:

-   The portal runs in the agreed test environment.
-   Authentication is integrated with the approved development/test
    identity provider, or the mock is explicitly limited to local
    development.
-   Internal and tenant workspaces enforce server-side authorization.
-   Application catalogue CRUD and safe launch work as specified.
-   Tenant-isolation negative tests pass.
-   Critical unit, integration, and end-to-end tests pass.
-   No known critical or high-severity security issue remains unresolved
    without formal risk acceptance.
-   Environment configuration contains no committed secrets.
-   Audit events are generated without secrets or tokens.
-   README, deployment guide, rollback procedure, and application
    onboarding checklist are delivered.
-   Remaining gaps and production prerequisites are documented.
-   KINRA product and technical owners accept the deliverables.

------------------------------------------------------------------------

**End of PRD**
