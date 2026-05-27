import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    getStatsSummary, getMethodDistribution, getTopEndpoints,
    getTopAttackerIps, getStatusCodeDistribution, getAuthStatusDistribution,
    getTopUsernames, getAttackTimeline, getBruteForceDetection
} from '../services/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#e94560', '#0f3460', '#16213e', '#533483', '#e94560', '#2ecc71', '#f39c12', '#3498db'];

const formatHour = (str) => {
    if (!str) return '';
    const date = new Date(str);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' }) + ' ' +
        date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

function OverviewPage() {
    const [summary, setSummary] = useState({});
    const [methods, setMethods] = useState([]);
    const [topEndpoints, setTopEndpoints] = useState([]);
    const [topIps, setTopIps] = useState([]);
    const [statusCodes, setStatusCodes] = useState([]);
    const [authStatuses, setAuthStatuses] = useState([]);
    const [topUsernames, setTopUsernames] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [bruteForce, setBruteForce] = useState([]);
    const debounceRef = useRef(null);

    const fetchAllStats = useCallback(() => {
        getStatsSummary().then(res => setSummary(res.data));
        getMethodDistribution().then(res => setMethods(res.data));
        getTopEndpoints().then(res => setTopEndpoints(res.data));
        getTopAttackerIps().then(res => setTopIps(res.data));
        getStatusCodeDistribution().then(res => setStatusCodes(res.data));
        getAuthStatusDistribution().then(res => setAuthStatuses(res.data));
        getTopUsernames().then(res => setTopUsernames(res.data));
        getAttackTimeline().then(res => setTimeline(res.data));
        getBruteForceDetection().then(res => setBruteForce(res.data));
    }, []);

    useEffect(() => { fetchAllStats(); }, [fetchAllStats]);

    // SSE with debounce — refresh stats at most every 5 seconds
    useEffect(() => {
        const eventSource = new EventSource('http://localhost:8080/sse/subscribe');
        const handler = () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                fetchAllStats();
            }, 5000);
        };
        eventSource.addEventListener('attacks', handler);
        eventSource.addEventListener('auth_logs', handler);
        eventSource.addEventListener('command_logs', handler);
        return () => eventSource.close();
    }, [fetchAllStats]);

    const cardStyle = {
        backgroundColor: '#1a1a2e', color: '#ffffff', padding: '20px',
        borderRadius: '8px', textAlign: 'center', flex: '1', minWidth: '180px'
    };
    const cardNumber = { fontSize: '32px', fontWeight: 'bold', color: '#e94560' };
    const cardLabel = { fontSize: '14px', marginTop: '5px', color: '#cccccc' };
    const sectionTitle = { color: '#e94560', marginTop: '30px', marginBottom: '15px' };
    const chartContainer = { display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' };
    const chartBox = {
        flex: '1', minWidth: '400px', backgroundColor: '#f9f9f9',
        padding: '15px', borderRadius: '8px'
    };

    const formatDate = (str) => {
        if (!str) return '';
        const date = new Date(str);
        return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB');
    };

    return (
        <div>
            <h2 style={{ color: '#e94560' }}>Overview</h2>

            {/* Summary Cards */}
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div style={cardStyle}>
                    <div style={cardNumber}>{summary.totalAttacks ?? '—'}</div>
                    <div style={cardLabel}>Total Attacks</div>
                </div>
                <div style={cardStyle}>
                    <div style={cardNumber}>{summary.totalAuthLogs ?? '—'}</div>
                    <div style={cardLabel}>Auth Log Entries</div>
                </div>
                <div style={cardStyle}>
                    <div style={cardNumber}>{summary.totalCommandLogs ?? '—'}</div>
                    <div style={cardLabel}>Commands Logged</div>
                </div>
                <div style={cardStyle}>
                    <div style={cardNumber}>{summary.uniqueAttackerIps ?? '—'}</div>
                    <div style={cardLabel}>Unique Attacker IPs</div>
                </div>
            </div>

            {/* Attack Breakdown */}
            <h3 style={sectionTitle}>Attack Breakdown</h3>
            <div style={chartContainer}>
                <div style={chartBox}>
                    <h4 style={{ marginTop: 0 }}>HTTP Method Distribution</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={methods} dataKey="count" nameKey="method" cx="50%" cy="50%"
                                outerRadius={80} label={({ method, count }) => `${method}: ${count}`}>
                                {methods.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div style={chartBox}>
                    <h4 style={{ marginTop: 0 }}>Status Code Distribution</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={statusCodes} dataKey="count" nameKey="statusCode" cx="50%" cy="50%"
                                outerRadius={80} label={({ statusCode, count }) => `${statusCode}: ${count}`}>
                                {statusCodes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div style={chartContainer}>
                <div style={chartBox}>
                    <h4 style={{ marginTop: 0 }}>Top 10 Targeted Endpoints</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topEndpoints} layout="vertical" margin={{ left: 150 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="endpoint" width={140} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#e94560" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div style={chartBox}>
                    <h4 style={{ marginTop: 0 }}>Top 10 Attacker IPs</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topIps}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="ip" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#0f3460" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Auth Logs Breakdown */}
            <h3 style={sectionTitle}>Auth Logs Breakdown</h3>
            <div style={chartContainer}>
                <div style={chartBox}>
                    <h4 style={{ marginTop: 0 }}>Login Attempt Status</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={authStatuses} dataKey="count" nameKey="status" cx="50%" cy="50%"
                                outerRadius={80} label={({ status, count }) => `${status}: ${count}`}>
                                {authStatuses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div style={chartBox}>
                    <h4 style={{ marginTop: 0 }}>Top Attempted Usernames</h4>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={topUsernames}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="username" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#533483" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Attack Timeline */}
            <h3 style={sectionTitle}>Attack Timeline</h3>
            <div style={{ ...chartBox, minWidth: '100%' }}>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fontSize: 11 }} interval="preserveStartEnd" angle={-30} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip labelFormatter={formatHour} />
                        <Legend />
                        <Line type="monotone" dataKey="count" stroke="#e94560" name="Attacks" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Brute Force Detection */}
            <h3 style={sectionTitle}>Detected Brute Force Sources</h3>
            {bruteForce.length === 0 ? (
                <p style={{ color: '#666' }}>No brute force patterns detected (threshold: &gt;5 failed attempts from a single IP).</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Source IP</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Failed Attempts</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>First Seen</th>
                            <th style={{ padding: '10px', textAlign: 'center' }}>Last Seen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bruteForce.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                                <td style={{ padding: '10px', textAlign: 'center' }}>{row.ip}</td>
                                <td style={{ padding: '10px', textAlign: 'center', color: '#e94560', fontWeight: 'bold' }}>{row.failedAttempts}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>{formatDate(row.firstSeen)}</td>
                                <td style={{ padding: '10px', textAlign: 'center' }}>{formatDate(row.lastSeen)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default OverviewPage;