# Release Checklist Tool — Implementation Plan

## 1. Project Overview & Requirements Analysis

### Goal
Build a modern, responsive Single-Page Application (SPA) release checklist tool that helps developers manage software releases. The application allows tracking releases, completing standard release steps, automatically deriving release statuses, and editing release details.

### Key Functional Requirements
- **Release Model**:
  - `id`: Unique identifier (UUID).
  - `name`: Text, mandatory (e.g., "Version 1.0.1", "Version 2 (beta)").
  - `date`: DateTime / Date, mandatory (due date / release date).
  - `status`: Auto-computed enum (`PLANNED` | `ONGOING` | `DONE`).
    - **No step completed**: `PLANNED`
    - **1 to N-1 steps completed**: `ONGOING`
    - **All steps completed**: `DONE`
  - `additionalInfo`: Text, optional (release notes, remarks).
  - `completedSteps`: List of completed step IDs (Step state: on/off).
- **Checklist Steps**:
  - Consistent across all releases (7 steps from mockup):
    1. `step-1`: "All relevant GitHub pull requests have been merged"
    2. `step-2`: "CHANGELOG.md files have been updated"
    3. `step-3`: "All tests are passing"
    4. `step-4`: "Releases in Github created"
    5. `step-5`: "Deployed in demo"
    6. `step-6`: "Tested thoroughly in demo"
    7. `step-7`: "Deployed in production"
- **Features**:
  - View list of all releases (table with Name, Date, Status badge, View action, Delete action).
  - Create a new release with name, date, and optional additional info.
  - View & edit a release (breadcrumb navigation `All releases > [Release Name]`).
  - Check / uncheck individual steps (auto-updates status).
  - Update release additional information / notes.
  - Delete a release (with confirmation dialog).
  - Single-Page Application (smooth client-side state / view transitions).
- **Technical & Architecture Constraints**:
  - Single repository containing frontend and backend.
  - Database: PostgreSQL (Docker for local dev, cloud-hosted for production like Neon/Render/Supabase).
  - API layer: **GraphQL** (Query & Mutation).
  - Docker: Backend & Database runnable via `Dockerfile` and `docker-compose.yaml`.
  - Automated tests: Resolver/service logic tests and status computation unit tests.
  - Responsive design matching the provided mockup aesthetics.
  - Comprehensive documentation in `README.md` (local setup, API schema, DB schema, design decisions).

---

## 2. Architecture & Tech Stack

| Layer | Selection | Justification |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | Blazing fast SPA development, type-safe GraphQL integration, zero-config bundling. |
| **API Client** | Apollo Client (`@apollo/client` + `graphql`) | First-class GraphQL client with caching, query hooks, and optimistic UI updates. |
| **Styling** | Vanilla CSS / CSS Modules | Clean, modern design matching mockup without heavy framework overhead. Responsive layout. |
| **Backend** | Node.js + TypeScript + Apollo Server / GraphQL Yoga | Standard, battle-tested GraphQL server environment. |
| **Database & ORM** | PostgreSQL + Prisma ORM | Type-safe schema definition, automated migrations, high-performance querying. |
| **Testing** | Vitest + Supertest | Rapid unit and integration tests for GraphQL resolvers and status computation. |
| **Containerization**| Docker & Docker Compose | Reproducible local development (`docker compose up`) with Postgres and Node backend. |
| **Deployment** | Render / Railway / Vercel + Neon Postgres | Seamless free-tier online deployment. |

---

## 3. Database Schema Design (Prisma)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum ReleaseStatus {
  PLANNED
  ONGOING
  DONE
}

model Release {
  id              String        @id @default(uuid())
  name            String
  date            DateTime
  status          ReleaseStatus @default(PLANNED)
  additionalInfo  String?       @db.Text
  completedSteps  String[]      @default([])
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@map("releases")
}
```

### Status Calculation Function
```typescript
export function computeReleaseStatus(completedSteps: string[], totalStepsCount: number = 7): 'PLANNED' | 'ONGOING' | 'DONE' {
  if (!completedSteps || completedSteps.length === 0) {
    return 'PLANNED';
  }
  if (completedSteps.length >= totalStepsCount) {
    return 'DONE';
  }
  return 'ONGOING';
}
```

---

## 4. GraphQL API Schema

```graphql
enum ReleaseStatus {
  PLANNED
  ONGOING
  DONE
}

type Step {
  id: ID!
  title: String!
}

type Release {
  id: ID!
  name: String!
  date: String!
  status: ReleaseStatus!
  additionalInfo: String
  completedSteps: [String!]!
  createdAt: String!
  updatedAt: String!
}

input CreateReleaseInput {
  name: String!
  date: String!
  additionalInfo: String
  completedSteps: [String!]
}

input UpdateReleaseInput {
  name: String
  date: String
  additionalInfo: String
  completedSteps: [String!]
}

type Query {
  releases: [Release!]!
  release(id: ID!): Release
  steps: [Step!]!
}

type Mutation {
  createRelease(input: CreateReleaseInput!): Release!
  updateRelease(id: ID!, input: UpdateReleaseInput!): Release!
  toggleStep(id: ID!, stepId: String!, completed: Boolean!): Release!
  deleteRelease(id: ID!): Boolean!
}
```

---

## 5. UI / UX Design & Flow (Matching Mockup)

### 1. Header
- **Title**: `ReleaseCheck`
- **Subtitle**: `Your all-in-one release checklist tool`

### 2. View A: Releases List
- Card container with subtle border and box-shadow.
- Top navigation bar inside card:
  - Left: **All releases**
  - Right: **New release +** button (primary purple `#6366f1`).
- Table view:
  - `Release`: Name of release
  - `Date`: Formatted date (e.g., "September 20, 2022")
  - `Status`: Styled pill badge (Planned: Gray/Amber, Ongoing: Blue/Indigo, Done: Green/Teal)
  - `View`: Eye icon button navigating to View B
  - `Delete`: Trash icon button with delete confirmation
- Empty state: Clean illustrated prompt to create the first release when empty.

### 3. View B: Add / Update Release
- Breadcrumb navigation: `All releases` > `[Release Name or 'New Release']` (clicking "All releases" navigates back).
- Top Right: `Delete` button (when editing existing release).
- Form inputs:
  - `Release`: text input for release name.
  - `Date`: date picker input.
- Checklist group (7 static steps):
  - Checkboxes with labels.
  - Real-time status update or toggle sync.
- Additional remarks / tasks:
  - Textarea with placeholder: *"Please enter any other important notes for the release"*.
- Bottom Right:
  - `Save ✓` primary button.

---

## 6. Monorepo Directory Structure

```
cactro-checklist/
├── PLAN.md                     # This plan
├── README.md                   # Setup guide, API documentation, DB schema, design decisions
├── docker-compose.yaml         # Orchestrates PostgreSQL + Backend locally
├── mockup.png                  # Reference UI mockup
├── client/                     # Vite + React 19 + TypeScript frontend
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx             # SPA state & view switching
│       ├── apollo.ts           # Apollo Client configuration
│       ├── graphql/            # GraphQL queries & mutations
│       │   ├── queries.ts
│       │   └── mutations.ts
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── ReleaseList.tsx
│       │   ├── ReleaseDetail.tsx
│       │   └── StatusBadge.tsx
│       ├── types/
│       └── styles/             # Modular, responsive CSS
└── server/                     # Node.js + TypeScript + Apollo Server backend
    ├── package.json
    ├── tsconfig.json
    ├── Dockerfile
    ├── prisma/
    │   ├── schema.prisma
    │   └── seed.ts             # Initial seed data from mockup
    ├── src/
    │   ├── index.ts            # Server entrypoint
    │   ├── db.ts               # Prisma client
    │   ├── config/steps.ts     # Definition of standard 7 checklist steps
    │   ├── utils/status.ts     # Status calculation logic
    │   └── schema/
    │       ├── typeDefs.ts
    │       └── resolvers.ts
    └── tests/
        ├── status.test.ts      # Unit tests for status computation
        └── resolvers.test.ts   # GraphQL API integration tests
```

---

## 7. Step-by-Step Implementation Roadmap

### Phase 1: Backend Setup & Core Logic
1. Initialize `server/` with TypeScript, Prisma, GraphQL Yoga / Apollo Server, and Express.
2. Define Prisma schema (`Release` model) and generate client.
3. Implement `computeReleaseStatus` utility function with all edge cases.
4. Implement GraphQL TypeDefs and Resolvers:
   - `releases`: Fetch list sorted by date descending.
   - `release(id)`: Fetch single release.
   - `steps`: Return standard 7 release checklist steps.
   - `createRelease`: Validate, compute status, persist.
   - `updateRelease`: Update fields, recalculate status, persist.
   - `toggleStep`: Atomically add/remove step ID, recalculate status.
   - `deleteRelease`: Remove release by ID.
5. Add seed script `prisma/seed.ts` containing the releases shown in the mockup:
   - Version 1.0.1 (Done)
   - Version 1.0.2 (Done)
   - Version 1.1.0 (Ongoing)
   - Version 2 (beta) (Planned)

### Phase 2: Automated Testing
1. Configure Vitest in `server/`.
2. Write unit tests for `computeReleaseStatus`:
   - Empty completed steps $\to$ `PLANNED`.
   - Partial completed steps ($1 \le count < 7$) $\to$ `ONGOING`.
   - All completed steps ($count = 7$) $\to$ `DONE`.
   - Out of bounds or duplicate step IDs handling.
3. Write integration tests for GraphQL queries and mutations.

### Phase 3: Docker & Local Environment
1. Write `server/Dockerfile` (multi-stage Node build).
2. Write root `docker-compose.yaml` with:
   - Service `postgres`: PostgreSQL 16 image with persistent volume and healthcheck.
   - Service `backend`: Node backend connected to postgres with auto-migration.
3. Test `docker compose up` to ensure zero-setup local execution.

### Phase 4: Frontend Implementation (React SPA)
1. Install Apollo Client (`@apollo/client`, `graphql`) in `client/`.
2. Configure Apollo Client to connect to `VITE_GRAPHQL_URL` (defaults to `http://localhost:4000/graphql`).
3. Define GraphQL query and mutation documents.
4. Implement UI components:
   - `Header`: Clean brand header with subtitle.
   - `ReleaseList`: Table view matching mockup, with status badge, view action, delete action, and "New release +" button.
   - `ReleaseDetail`: Create and Edit views with breadcrumb navigation, name input, date picker, 7 checklist steps, additional remarks textarea, and save button.
   - Responsive CSS: Mobile-friendly card, responsive table, accessible form controls, clean purple theme (`#6366f1`).

### Phase 5: Online Deployment
1. Provision cloud database (Neon PostgreSQL or Supabase).
2. Deploy backend service (Render / Railway) with environment variables.
3. Deploy frontend SPA (Vercel / Netlify / Render) connected to deployed GraphQL endpoint.
4. Verify live online operations end-to-end.

### Phase 6: Documentation & Deliverables
1. Write complete `README.md`:
   - Live demo link.
   - Architecture & design decisions rationale.
   - Database schema documentation.
   - GraphQL API documentation (all queries, mutations, types, and sample payloads).
   - Local setup instructions (with Docker and without Docker).
   - Testing instructions (`npm test`).
