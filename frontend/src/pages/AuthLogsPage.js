import React, { useEffect, useState,  useCallback } from 'react';
import { getAuthLogs, searchAuthLogs } from '../services/api';

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB');
};

const STATUSES = ['FAILED', 'INVALID_USER', 'SUCCESS', 'DISCONNECTED', 'OTHER'];

function AuthLogsPage() {
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState({ username: '', ip: '', status: '', dateFrom: '', dateTo: '' });

    const fetchData = useCallback((currentPage) => {
        const hasSearch = search.username || search.ip || search.status || search.dateFrom || search.dateTo;
        const params = {
            page: currentPage,
            size: 20
        };
        if (search.username) params.username = search.username;
        if (search.ip) params.ip = search.ip;
        if (search.status) params.status = search.status;
        if (search.dateFrom) params.dateFrom = `${search.dateFrom}T00:00:00`;
        if (search.dateTo) params.dateTo = `${search.dateTo}T23:59:59`;

        if (hasSearch) {
            searchAuthLogs(params).then(res => {
                setLogs(res.data.content);
                setTotalPages(res.data.totalPages);
            });
        } else {
            getAuthLogs(currentPage).then(res => {
                setLogs(res.data.content);
                setTotalPages(res.data.totalPages);
            });
        }
    }, [search]);

    const handleClear = () => {
        setSearch({ username: '', ip: '', status: '', dateFrom: '', dateTo: '' });
        setPage(0);
    };

    useEffect(() => { fetchData(page); }, [page, fetchData]);

    useEffect(() => { setPage(0); }, [search]);

    useEffect(() => {
        const eventSource = new EventSource('http://localhost:8080/sse/subscribe');
        eventSource.addEventListener('auth_logs', () => {
            fetchData(page);
        });
        return () => eventSource.close();
    }, [page, search, fetchData]);

    return (
        <div>
            <h2 style={{ color: '#e94560' }}>Auth Logs</h2>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                <input
                    placeholder="Username"
                    value={search.username}
                    onChange={e => setSearch({ ...search, username: e.target.value })}
                />
                <input
                    placeholder="IP Address"
                    value={search.ip}
                    onChange={e => setSearch({ ...search, ip: e.target.value })}
                />
                <select
                    value={search.status}
                    onChange={e => setSearch({ ...search, status: e.target.value })}
                >
                    <option value="">Any Status</option>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                    type="date"
                    value={search.dateFrom}
                    onChange={e => setSearch({ ...search, dateFrom: e.target.value })}
                    title="Date From"
                />
                <input
                    type="date"
                    value={search.dateTo}
                    onChange={e => setSearch({ ...search, dateTo: e.target.value })}
                    title="Date To"
                />
                <button onClick={handleClear}>Clear</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>
                        <th>Timestamp</th>
                        <th>Username</th>
                        <th>Source IP</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td>{formatDate(l.timestamp)}</td>
                            <td>{l.username}</td>
                            <td>{l.sourceIp}</td>
                            <td>{l.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={() => setPage(p => Math.max(p - 1, 0))} disabled={page === 0}>Previous</button>
                <span>Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))} disabled={page === totalPages - 1}>Next</button>
            </div>
        </div>
    );
}

export default AuthLogsPage;