import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { typeDefs } from "./schema/typeDefs.js";
import { resolvers } from "./schema/resolvers.js";
import { prisma } from "./db.js";

dotenv.config();

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const PORT = parseInt(process.env.PORT || "4000", 10);

export async function createServer() {
  const app = express();
  const httpServer = http.createServer(app);
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 66000;

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/metrics", async (_req, res) => {
    try {
      res.setHeader("Content-Type", "text/plain; version=0.0.4");
      const prismaProm = await (prisma as any).$metrics?.prometheus();
      const mem = process.memoryUsage();
      const customMetrics = [
        `# HELP process_resident_memory_bytes Resident memory size in bytes.`,
        `# TYPE process_resident_memory_bytes gauge`,
        `process_resident_memory_bytes ${mem.rss}`,
        `# HELP nodejs_heap_size_total_bytes Process heap size from V8 in bytes.`,
        `# TYPE nodejs_heap_size_total_bytes gauge`,
        `nodejs_heap_size_total_bytes ${mem.heapTotal}`,
        `# HELP nodejs_heap_size_used_bytes Process heap size used from V8 in bytes.`,
        `# TYPE nodejs_heap_size_used_bytes gauge`,
        `nodejs_heap_size_used_bytes ${mem.heapUsed}`,
        `# HELP process_uptime_seconds Process uptime in seconds.`,
        `# TYPE process_uptime_seconds gauge`,
        `process_uptime_seconds ${process.uptime()}`,
      ].join("\n");

      res.send(`${prismaProm || ""}\n${customMetrics}\n`);
    } catch (err: any) {
      res.status(500).send(`Error collecting metrics: ${err.message}`);
    }
  });

  app.get("/diagnostics", async (_req, res) => {
    try {
      const mem = process.memoryUsage();
      const processMetrics = {
        rssMb: +(mem.rss / 1024 / 1024).toFixed(2),
        heapTotalMb: +(mem.heapTotal / 1024 / 1024).toFixed(2),
        heapUsedMb: +(mem.heapUsed / 1024 / 1024).toFixed(2),
        uptimeSec: Math.floor(process.uptime()),
      };

      // 1. Prisma Connection Pool Metrics (gauges, queries waiting, idle/busy)
      let prismaMetrics = null;
      try {
        prismaMetrics = await (prisma as any).$metrics?.json();
      } catch (e: any) {
        prismaMetrics = { error: e.message };
      }

      // 2. PostgreSQL Active Queries & Connections
      let activeQueries: any[] = [];
      try {
        activeQueries = await prisma.$queryRawUnsafe(`
          SELECT pid, usename, state, wait_event_type, wait_event,
                 ROUND(EXTRACT(EPOCH FROM (now() - query_start))::numeric, 3) AS duration_seconds,
                 LEFT(query, 120) AS query_snippet
          FROM pg_stat_activity
          WHERE state != 'idle' AND pid <> pg_backend_pid()
          ORDER BY duration_seconds DESC
          LIMIT 10;
        `);
      } catch (e: any) {
        activeQueries = [{ error: e.message }];
      }

      // 3. PostgreSQL Lock Waits
      let lockWaits: any[] = [];
      try {
        lockWaits = await prisma.$queryRawUnsafe(`
          SELECT blocked_locks.pid AS blocked_pid,
                 blocked_activity.usename AS blocked_user,
                 blocking_locks.pid AS blocking_pid,
                 blocking_activity.usename AS blocking_user,
                 LEFT(blocked_activity.query, 100) AS blocked_statement,
                 LEFT(blocking_activity.query, 100) AS current_statement_in_blocking_process
          FROM pg_catalog.pg_locks blocked_locks
          JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
          JOIN pg_catalog.pg_locks blocking_locks 
              ON blocking_locks.locktype = blocked_locks.locktype
              AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
              AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
              AND blocking_locks.pid != blocked_locks.pid
          JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
          WHERE NOT blocked_locks.granted;
        `);
      } catch (e: any) {
        lockWaits = [{ error: e.message }];
      }

      // 4. Slow Queries via pg_stat_statements
      let slowQueries: any[] = [];
      try {
        slowQueries = await prisma.$queryRawUnsafe(`
          SELECT calls, 
                 ROUND(total_exec_time::numeric, 2) AS total_time_ms,
                 ROUND(mean_exec_time::numeric, 2) AS mean_time_ms,
                 rows,
                 LEFT(query, 120) AS query
          FROM pg_stat_statements
          ORDER BY mean_exec_time DESC
          LIMIT 5;
        `);
      } catch (e: any) {
        slowQueries = [{ error: e.message }];
      }

      res.json({
        timestamp: new Date().toISOString(),
        process: processMetrics,
        prismaPool: prismaMetrics,
        activeQueries,
        lockWaits,
        slowQueries,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => ({ req }),
    })
  );

  return { app, httpServer, server };
}

async function start() {
  try {
    const { httpServer } = await createServer();
    httpServer.listen(PORT, () => {
      console.log(`🚀 GraphQL Server ready at http://localhost:${PORT}/graphql`);
      console.log(`🩺 Health check ready at http://localhost:${PORT}/health`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

// Only start immediately if this file is executed directly
if (process.env.NODE_ENV !== "test") {
  start();
}
