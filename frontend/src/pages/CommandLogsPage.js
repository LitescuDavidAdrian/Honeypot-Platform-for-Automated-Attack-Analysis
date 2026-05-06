import React, { useEffect, useState, useCallback } from 'react';
import { getCommandLogs, searchCommandLogs } from '../services/api';

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB');
};

function CommandLogsPage() {
    const [logs, setLogs] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState({ command: '', dateFrom: '', dateTo: '' });

    const fetchData = useCallback((currentPage) => {
        const hasSearch = search.command || search.dateFrom || search.dateTo;
        const params = {
            page: currentPage,
            size: 20
        };
        if (search.command) params.command = search.command;
        if (search.dateFrom) params.dateFrom = `${search.dateFrom}T00:00:00`;
        if (search.dateTo) params.dateTo = `${search.dateTo}T23:59:59`;
        if (hasSearch) {
            searchCommandLogs(params).then(res => {
                setLogs(res.data.content);
                setTotalPages(res.data.totalPages);
            });
        } else {
            getCommandLogs(currentPage).then(res => {
                setLogs(res.data.content);
                setTotalPages(res.data.totalPages);
            });
        }
    }, [search]);

    const handleClear = () => {
        setSearch({ command: '', dateFrom: '', dateTo: '' });
        setPage(0);
    };

    useEffect(() => { fetchData(page); }, [page, fetchData]);

    useEffect(() => { setPage(0); }, [search]);

    useEffect(() => {
        const eventSource = new EventSource('http://localhost:8080/sse/subscribe');
        eventSource.addEventListener('command_logs', () => {
            fetchData(page);
        });
        return () => eventSource.close();
    }, [page, search, fetchData]);

    return (
        <div>
            <h2 style={{ color: '#e94560' }}>Command Logs</h2>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                <input
                    placeholder="Command"
                    value={search.command}
                    onChange={e => setSearch({ ...search, command: e.target.value })}
                />
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
                        <th>Command</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td>{formatDate(l.timestamp)}</td>
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