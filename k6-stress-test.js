import http from 'k6/http';
import { check, sleep } from 'k6';
import { generateHtmlReport, generateTextSummary } from './test-reporter.js';

export const options = {
  stages: [
      
  { duration: '30s', target: 500 },
  { duration: '30s', target: 850 },
  // { duration: '30s', target: 1000 },
  // { duration: '30s', target: 1200 },
  { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<1500'],
  },
};

export default function () {
  const response = http.post(
    'http://localhost:4000/graphql',
    JSON.stringify({
      query: '{ releases { id name status } }',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(response, {
    'HTTP status is 200': (r) => r.status === 200,
    'GraphQL response has no errors': (r) => {
      try {
        return !r.json('errors');
      } catch {
        return false;
      }
    },
  });

  sleep(0.1);
}

export function handleSummary(data) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

  const html = generateHtmlReport(data, timestamp);
  const summary = generateTextSummary(data, timestamp);

  return {
    stdout: summary,
    [`test-results/history/summary-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`test-results/history/report-${timestamp}.html`]: html,
    'test-results/latest-summary.json': JSON.stringify(data, null, 2),
    'test-results/latest-report.html': html,
  };
}
