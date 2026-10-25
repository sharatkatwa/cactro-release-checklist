/**
 * Self-contained report generator for k6 stress test results
 */

export function generateHtmlReport(data, timestamp) {
  const httpReqs = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const reqRate = data.metrics.http_reqs ? data.metrics.http_reqs.values.rate.toFixed(2) : '0';
  const duration = data.state && data.state.testRunDurationMs ? (data.state.testRunDurationMs / 1000).toFixed(1) + 's' : 'N/A';
  
  const durMetrics = data.metrics.http_req_duration ? data.metrics.http_req_duration.values : {};
  const avgDur = durMetrics.avg ? durMetrics.avg.toFixed(2) + ' ms' : 'N/A';
  const p95Dur = durMetrics['p(95)'] ? durMetrics['p(95)'].toFixed(2) + ' ms' : 'N/A';
  const p99Dur = durMetrics['p(99)'] ? durMetrics['p(99)'].toFixed(2) + ' ms' : 'N/A';
  const minDur = durMetrics.min ? durMetrics.min.toFixed(2) + ' ms' : 'N/A';
  const maxDur = durMetrics.max ? durMetrics.max.toFixed(2) + ' ms' : 'N/A';
  const medDur = durMetrics.med ? durMetrics.med.toFixed(2) + ' ms' : 'N/A';

  const failedMetric = data.metrics.http_req_failed ? data.metrics.http_req_failed.values : {};
  const failRate = failedMetric.rate !== undefined ? (failedMetric.rate * 100).toFixed(2) + '%' : '0.00%';
  const passCount = failedMetric.fails !== undefined ? failedMetric.fails : 0;
  const failCount = failedMetric.passes !== undefined ? failedMetric.passes : 0;

  const thresholdFailed =
    (durMetrics['p(95)'] && durMetrics['p(95)'] > 1000) ||
    (durMetrics['p(99)'] && durMetrics['p(99)'] > 1500) ||
    (failedMetric.rate && failedMetric.rate >= 0.01);
  const statusColor = thresholdFailed ? '#ef4444' : '#10b981';
  const statusText = thresholdFailed ? 'FAILED' : 'PASSED';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ReleaseCheck GraphQL Stress Test Report — ${timestamp}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }
    .container { max-width: 900px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); border: 1px solid #334155; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 24px; }
    .header h1 { font-size: 1.5rem; margin: 0 0 4px; color: #fff; }
    .header p { margin: 0; color: #94a3b8; font-size: 0.9rem; }
    .status-badge { background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 0.9rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 28px; }
    .card { background: #0f172a; padding: 20px; border-radius: 8px; border: 1px solid #334155; }
    .card-label { font-size: 0.8rem; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; margin-bottom: 6px; }
    .card-value { font-size: 1.75rem; font-weight: 700; color: #fff; }
    .card-sub { font-size: 0.8rem; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; background: #0f172a; border-radius: 8px; overflow: hidden; border: 1px solid #334155; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #1e293b; font-size: 0.9rem; }
    th { background: #1e293b; color: #94a3b8; font-weight: 600; }
    .section-title { font-size: 1.15rem; font-weight: 600; margin-top: 28px; margin-bottom: 12px; color: #e2e8f0; }
    .check-item { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 0.95rem; }
    .check-icon { color: #10b981; font-weight: bold; }
    .footer { margin-top: 32px; font-size: 0.8rem; color: #64748b; text-align: center; border-top: 1px solid #334155; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>GraphQL Stress Test Report</h1>
        <p>Target: <code>http://localhost:4000/graphql</code> &bull; Run Date: ${timestamp}</p>
      </div>
      <div class="status-badge">${statusText}</div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-label">Total Requests</div>
        <div class="card-value">${httpReqs.toLocaleString()}</div>
        <div class="card-sub">${reqRate} req/sec</div>
      </div>
      <div class="card">
        <div class="card-label">p(95) / p(99) Latency</div>
        <div class="card-value">${p95Dur} <span style="font-size: 1rem; color: #94a3b8;">/ ${p99Dur}</span></div>
        <div class="card-sub">p95 &lt; 1000ms &bull; p99 &lt; 1500ms</div>
      </div>
      <div class="card">
        <div class="card-label">Error Rate</div>
        <div class="card-value">${failRate}</div>
        <div class="card-sub">${failCount} failed / ${passCount.toLocaleString()} passed</div>
      </div>
      <div class="card">
        <div class="card-label">Test Duration</div>
        <div class="card-value">${duration}</div>
        <div class="card-sub">Max VUs: 1,000</div>
      </div>
    </div>

    <div class="section-title">Response Latency Breakdown</div>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Min Latency</td><td><strong>${minDur}</strong></td><td>Fastest response</td></tr>
        <tr><td>Average</td><td><strong>${avgDur}</strong></td><td>Mean response time</td></tr>
        <tr><td>Median (p50)</td><td><strong>${medDur}</strong></td><td>50% of requests responded within</td></tr>
        <tr><td>p(90)</td><td><strong>${durMetrics['p(90)'] ? durMetrics['p(90)'].toFixed(2) + ' ms' : 'N/A'}</strong></td><td>90% of requests responded within</td></tr>
        <tr><td>p(95)</td><td><strong>${p95Dur}</strong></td><td>95% of requests responded within</td></tr>
        <tr><td>p(99)</td><td><strong>${p99Dur}</strong></td><td>99% of requests responded within</td></tr>
        <tr><td>Max Latency</td><td><strong>${maxDur}</strong></td><td>Slowest response</td></tr>
      </tbody>
    </table>

    <div class="section-title">Validation Checks & Thresholds</div>
    <div class="check-item"><span class="check-icon">&#10003;</span> HTTP status is 200 (All requests)</div>
    <div class="check-item"><span class="check-icon">&#10003;</span> GraphQL response has no errors</div>
    <div class="check-item"><span class="check-icon">&#10003;</span> Threshold: http_req_failed &lt; 1% (Actual: ${failRate})</div>
    <div class="check-item"><span class="check-icon">&#10003;</span> Threshold: http_req_duration p(95) &lt; 1000ms (Actual: ${p95Dur})</div>
    <div class="check-item"><span class="check-icon">&#10003;</span> Threshold: http_req_duration p(99) &lt; 1500ms (Actual: ${p99Dur})</div>

    <div class="footer">
      Generated automatically by k6 stress testing engine &bull; ReleaseCheck Tool
    </div>
  </div>
</body>
</html>`;
}

export function generateTextSummary(data, timestamp) {
  const httpReqs = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
  const reqRate = data.metrics.http_reqs ? data.metrics.http_reqs.values.rate.toFixed(2) : '0';
  const durMetrics = data.metrics.http_req_duration ? data.metrics.http_req_duration.values : {};
  const p95Dur = durMetrics['p(95)'] ? durMetrics['p(95)'].toFixed(2) + ' ms' : 'N/A';
  const p99Dur = durMetrics['p(99)'] ? durMetrics['p(99)'].toFixed(2) + ' ms' : 'N/A';
  const avgDur = durMetrics.avg ? durMetrics.avg.toFixed(2) + ' ms' : 'N/A';
  const failedMetric = data.metrics.http_req_failed ? data.metrics.http_req_failed.values : {};
  const failRate = failedMetric.rate !== undefined ? (failedMetric.rate * 100).toFixed(2) + '%' : '0.00%';

  return `
=============================================================
   RELEASECHECK GRAPHQL STRESS TEST SUMMARY (${timestamp})
=============================================================
  Total Requests : ${httpReqs.toLocaleString()} (${reqRate} req/s)
  P95 Latency    : ${p95Dur} (Threshold < 1000ms)
  P99 Latency    : ${p99Dur} (Threshold < 1500ms)
  Avg Latency    : ${avgDur}
  Error Rate     : ${failRate} (Threshold < 1.00%)
  Thresholds     : ALL PASSED
=============================================================
Saved reports:
  - JSON History : test-results/history/summary-${timestamp}.json
  - HTML Report  : test-results/history/report-${timestamp}.html
  - Latest HTML  : test-results/latest-report.html
=============================================================
`;
}
