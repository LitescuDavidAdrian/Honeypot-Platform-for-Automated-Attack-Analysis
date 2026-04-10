import React, { useEffect, useState } from 'react';
import { getCommandLogs, searchCommandLogs } from '../services/api';

function CommandLogsPage() {
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState({ command: '' });

    const fetchLogs = () => {
        getCommandLogs(page).then(res => {
            setLogs(res.data.content);
            setTotalPages(res.data.totalPages);
        });
    };

    const handleSearch = () => {
        const params = {};
        if (search.command) params.command = search.command;
        searchCommandLogs(params).then(res => setLogs(res.data));
    };

    const handleClear = () => {
        setSearch({ command: '' });
        setPage(0);
        fetchLogs();
    };

    useEffect(() => { fetchLogs(); }, [page]);

    return (
        <div>
            <h2 style={{ color: '#e94560' }}>Command Logs</h2>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                <input placeholder="Command" value={search.command}
                    onChange={e => setSearch({ ...search, command: e.target.value })} />
                <button onClick={handleSearch}>Search</button>
                <button onClick={handleClear}>Clear</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>
                        <th>Timestamp</th>
                        <th>Command</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td>{l.timestamp}</td>
                            <td>{l.command}</td>
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

export default CommandLogsPage;