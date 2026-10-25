# ReleaseCheck — Release Checklist Tool

A functional, modern Single-Page Application (SPA) designed to help engineering teams track, organize, and streamline software releases. Built with a **React + TypeScript** frontend, an **Apollo Server (GraphQL)** backend, and a **PostgreSQL** database managed via **Prisma ORM**.

---

## Table of Contents
- [Features](#features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Design Decisions](#design-decisions)
- [Database Schema](#database-schema)
- [GraphQL API Documentation](#graphql-api-documentation)
- [Running Locally with Docker](#running-locally-with-docker)
- [Running Locally without Docker](#running-locally-without-docker)
- [Automated Tests](#automated-tests)
- [Deployment Guide](#deployment-guide)

---

## Features

- **Release Overview**: View all releases with formatted dates, automated status badges (`Planned`, `Ongoing`, `Done`), and quick action buttons.
- **Create Release**: Create new releases with name, due date, and optional notes.
- **Interactive Checklist**: 7 standardized release steps that can be toggled in real time:
  1. *All relevant GitHub pull requests have been merged*
  2. *CHANGELOG.md files have been updated*
  3. *All tests are passing*
  4. *Releases in Github created*
  5. *Deployed in demo*
  6. *Tested thoroughly in demo*
  7. *Deployed in production*
- **Automated Status Calculation**: Status is never manually selected—it is automatically derived:
  - **Planned**: No steps completed ($0/7$)
  - **Ongoing**: At least one step completed ($1 \le \text{steps} < 7$)
  - **Done**: All steps completed ($7/7$)
- **Edit & Update Remarks**: Inline breadcrumb navigation (`All releases > [Release Name]`) with live remarks editing.
- **Delete Release**: Safe release deletion with a confirmation dialog.
- **Responsive UX**: Clean, usable, mobile-friendly interface matching the design mockups.
- **Single Repository**: Frontend and backend unified in a single monorepo.

---

## Architecture & Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19 + TypeScript + Vite | Lightweight, ultra-fast SPA with zero page reloads. |
| **API Client** | Apollo Client (`@apollo/client`) | GraphQL query execution, mutation handling, and cache updates. |
| **Styling** | Vanilla CSS (Design Tokens) | Responsive layout, modern typography (Inter), matching the design mockup. |
| **Backend** | Node.js + Express + Apollo Server v4 | Type-safe GraphQL schema, validation, and resolvers. |
| **Database & ORM** | PostgreSQL + Prisma ORM | Declarative schema, automated migrations, high reliability. |
| **Testing** | Vitest + React Testing Library | Fast unit and integration tests across both backend and frontend. |
| **Containerization**| Docker & Docker Compose | Multi-stage Docker build and one-command local orchestration. |

---

## Design Decisions

All architectural choices were evaluated against simplicity, reliability, performance, and assignment requirements:

### 1. Static Steps vs. Normalized Step Table
- **Decision**: Store completed step IDs as an array of strings (`completedSteps: String[]`) directly on the `Release` model rather than creating a separate relational table for steps.
- **Rationale**: The specification states that the 7 checklist steps are static across all releases and do not change over time. Storing `completedSteps` on `Release` eliminates unnecessary SQL joins, improves query read/write speeds, and keeps the data model lean and intuitive.

### 2. Deriving Release Status Server-Side
- **Decision**: Compute `status` automatically in business logic on every creation, update, and toggle mutation, persisting it on the `Release` record.
- **Rationale**: 
  - Prevents stale or desynchronized status values.
  - Guarantees data integrity: users cannot manipulate status directly via API mutations.
  - Enables efficient indexing and querying by status directly at the database level if filtering is added.

### 3. GraphQL as the API Layer
- **Decision**: Use Apollo Server v4 over Express with a single endpoint (`/graphql`).
- **Rationale**:
  - Provides a strongly typed contract (`typeDefs.ts`) between frontend and backend.
  - Eliminates over-fetching: clients fetch precisely the fields needed (e.g., list views omit heavy fields when appropriate).
  - Explicit mutations (`createRelease`, `updateRelease`, `toggleStep`, `deleteRelease`) make domain actions clear and testable.

### 4. Single-Page Application (SPA) Navigation
- **Decision**: Client-side state-based view switching (`list` $\leftrightarrow$ `detail` $\leftrightarrow$ `create`) with breadcrumb navigation.
- **Rationale**: Meets the requirement for a responsive Single-Page Application without full browser reloads, providing instant UI response when toggling steps or navigating back to the release table.

### 5. Multi-Stage Dockerfile
- **Decision**: Separate the builder stage from the production runner stage in `server/Dockerfile`.
- **Rationale**: Keeps the production container small, avoids shipping development tools or source TypeScript compiler, and installs only runtime dependencies.

### 6. Automated Testing Strategy
- **Decision**: Use Vitest for both backend business logic / GraphQL resolvers and frontend UI components.
- **Rationale**: Vitest provides native TypeScript and ESM support with rapid execution speed. Unit tests cover all 4 status transition states and resolver validations; component tests verify rendering, classes, and date utilities.

---

## Database Schema

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
  id             String        @id @default(uuid())
  name           String
  date           DateTime
  status         ReleaseStatus @default(PLANNED)
  additionalInfo String?       @db.Text
  completedSteps String[]      @default([])
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@map("releases")
}
```

---

## GraphQL API Documentation

Endpoint: `POST /graphql`  
Health Check: `GET /health`

### Queries

#### 1. Fetch all releases
```graphql
query GetReleases {
  releases {
    id
    name
    date
    status
    additionalInfo
    completedSteps
  }
}
```

#### 2. Fetch single release by ID
```graphql
query GetRelease($id: ID!) {
  release(id: $id) {
    id
    name
    date
    status
    additionalInfo
    completedSteps
  }
}
```

#### 3. Fetch standard checklist steps
```graphql
query GetSteps {
  steps {
    id
    title
    order
  }
}
```

### Mutations

#### 1. Create a release
```graphql
mutation CreateRelease($input: CreateReleaseInput!) {
  createRelease(input: $input) {
    id
    name
    date
    status
    additionalInfo
    completedSteps
  }
}
```
*Sample Variables:*
```json
{
  "input": {
    "name": "Version 1.2.0",
    "date": "2026-11-15T00:00:00.000Z",
    "additionalInfo": "Staging deployment checklist",
    "completedSteps": []
  }
}
```

#### 2. Update release details
```graphql
mutation UpdateRelease($id: ID!, $input: UpdateReleaseInput!) {
  updateRelease(id: $id, input: $input) {
    id
    name
    date
    status
    additionalInfo
    completedSteps
  }
}
```

#### 3. Toggle a checklist step
```graphql
mutation ToggleStep($id: ID!, $stepId: String!, $completed: Boolean!) {
  toggleStep(id: $id, stepId: $stepId, completed: $completed) {
    id
    status
    completedSteps
  }
}
```

#### 4. Delete a release
```graphql
mutation DeleteRelease($id: ID!) {
  deleteRelease(id: $id)
}
```

---

## Running Locally with Docker

Prerequisites: [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd cactro-checklist
   ```

2. **Spin up PostgreSQL and GraphQL Backend**:
   ```bash
   docker compose up --build
   ```
   This will:
   - Start a healthy PostgreSQL 16 container on port `5432`.
   - Build and start the Node.js backend container on port `4000`.
   - Automatically apply database migrations on launch.

3. **Run the Frontend**:
   ```bash
   cd client
   npm install
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running Locally without Docker

Prerequisites: Node.js (v18+) and a local PostgreSQL instance (or free hosted Postgres URL from [Neon](https://neon.tech) / [Supabase](https://supabase.com)).

1. **Configure Environment Variables**:
   In `server/.env`:
   ```env
   PORT=4000
   DATABASE_URL="postgresql://<user>:<password>@localhost:5432/releasecheck?schema=public"
   ```

2. **Set up the Database & Seed Sample Data**:
   ```bash
   cd server
   npm install
   npx prisma db push
   npm run prisma:seed
   ```

3. **Start the GraphQL Backend**:
   ```bash
   npm run dev
   ```
   GraphQL playground available at [http://localhost:4000/graphql](http://localhost:4000/graphql).

4. **Start the Frontend**:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```
   Access the app at [http://localhost:5173](http://localhost:5173).

---

## Automated Tests

Run the complete test suite across both backend and frontend from the root:

```bash
npm test
```

Or run tests individually:
- **Backend tests** (Status calculation logic & GraphQL resolvers):
  ```bash
  npm run test:server
  ```
- **Frontend tests** (Components, date formatting, and UI badges):
  ```bash
  npm run test:client
  ```

---

## Stress Testing with k6

A dedicated [k6-stress-test.js](file:///d:/sjk/cactro-checklist/k6-stress-test.js) script ramps up to **200 concurrent virtual users** over 7 stages while verifying thresholds (`http_req_failed < 1%`, `p(95) < 1000ms`).

### Running the Stress Test:
```bash
npm run test:stress
```

### Automatic Test Results History
Every test execution automatically records and preserves history:
- **Timestamped JSON**: `test-results/history/summary-<timestamp>.json` (contains raw metrics, percentiles, and thresholds).
- **Interactive HTML Report**: `test-results/history/report-<timestamp>.html` (visual dashboard with metrics cards, latency percentiles table, and checks).
- **Latest Report**: `test-results/latest-report.html` and `test-results/latest-summary.json`.

To open the visual HTML report in your browser:
```bash
npm run test:stress:report
```

---

## Real-Time Monitoring with Prometheus & Grafana

The stack includes pre-configured, production-grade observability tools orchestrating **Prometheus** metrics collection and a **Grafana** dashboard with zero login friction (anonymous admin enabled).

### Monitored Metrics:
- **Prisma Connection Pool**: Real-time busy, idle, and total open connection gauges.
- **Queue Wait Count (`prisma_client_queries_wait`)**: Instant visualization of requests blocked waiting for a database handle during high concurrency.
- **Query Throughput (QPS)**: Real-time queries per second execution rate.
- **Node.js Memory Utilization**: Process RSS, V8 Heap Total, and V8 Heap Used.

### Accessing Dashboards:
1. **Grafana Dashboard** (Port `3000`):
   - Access: [http://localhost:3000/d/releasecheck-metrics/releasecheck-database-and-api-observability](http://localhost:3000/d/releasecheck-metrics/releasecheck-database-and-api-observability)
   - Or run: `npm run monitoring:grafana`
2. **Prometheus Targets & Query Console** (Port `9090`):
   - Access: [http://localhost:9090](http://localhost:9090)
   - Or run: `npm run monitoring:prometheus`

---

## Deployment Guide

### Option 1: Render / Railway (Recommended)
1. **Database**: Create a free PostgreSQL instance on [Neon](https://neon.tech) or Render. Copy the `DATABASE_URL`.
2. **Backend**:
   - Create a Web Service connected to this repository (root directory: `server`).
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npx prisma db push --skip-generate && npm start`
   - Environment Variables: `PORT=4000`, `DATABASE_URL=<your-postgres-url>`
3. **Frontend**:
   - Create a Static Site on [Vercel](https://vercel.com) or Render (root directory: `client`).
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Environment Variable: `VITE_GRAPHQL_URL=https://<your-backend-render-url>/graphql`
