import React, { useEffect, useState } from 'react';
import { getAuthLogs, searchAuthLogs } from '../services/api';

function AuthLogsPage() {
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState({ username: '', ip: '', status: '' });

    const fetchLogs = () => {
        getAuthLogs(page).then(res => {
            setLogs(res.data.content);
            setTotalPages(res.data.totalPages);
        });
    };

    const handleSearch = () => {
        const params = {};
        if (search.username) params.username = search.username;
        if (search.ip) params.ip = search.ip;
        if (search.status) params.status = search.status;
        searchAuthLogs(params).then(res => setLogs(res.data));
    };

    const handleClear = () => {
        setSearch({ username: '', ip: '', status: '' });
        setPage(0);
        fetchLogs();
    };

    useEffect(() => { fetchLogs(); }, [page]);

    return (
        <div>
            <h2 style={{ color: '#e94560' }}>Auth Logs</h2>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                <input placeholder="Username" value={search.username}
                    onChange={e => setSearch({ ...search, username: e.target.value })} />
                <input placeholder="IP Address" value={search.ip}
                    onChange={e => setSearch({ ...search, ip: e.target.value })} />
                <input placeholder="Status" value={search.status}
                    onChange={e => setSearch({ ...search, status: e.target.value })} />
                <button onClick={handleSearch}>Search</button>
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
                            <td>{l.timestamp}</td>
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