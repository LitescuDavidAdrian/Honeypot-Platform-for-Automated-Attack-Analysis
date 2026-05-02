import React, { useEffect, useState, useCallback } from 'react';
import { getAttacks, searchAttacks } from '../services/api';

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB');
};

function AttacksPage() {
    const [attacks, setAttacks] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState({ endpoint: '', ip: '', status: '' });
    const [selectedAttack, setSelectedAttack] = useState(null);

    const fetchData = useCallback((currentPage) => {
        const hasSearch = search.endpoint || search.ip || search.status;
        const params = {
            page: currentPage,
            size: 20
        };
        if (search.endpoint) params.endpoint = search.endpoint;
        if (search.ip) params.ip = search.ip;
        if (search.status) params.status = parseInt(search.status);

        if (hasSearch) {
            searchAttacks(params).then(res => {
                setAttacks(res.data.content);
                setTotalPages(res.data.totalPages);
            });
        } else {
            getAttacks(currentPage).then(res => {
                setAttacks(res.data.content);
                setTotalPages(res.data.totalPages);
            });
        }
    }, [search]);

    const handleClear = () => {
        setSearch({ endpoint: '', ip: '', status: '' });
        setPage(0);
    };

    useEffect(() => { fetchData(page); }, [page, fetchData]);

    useEffect(() => { setPage(0); }, [search]);

    useEffect(() => {
        const eventSource = new EventSource('http://localhost:8080/sse/subscribe');
        eventSource.addEventListener('attacks', () => {
            fetchData(page);
        });
        return () => eventSource.close();
    }, [page, search, fetchData]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') setSelectedAttack(null);
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    return (
        <div>
            <h2 style={{ color: '#e94560' }}>Attacks</h2>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                <input
                    placeholder="Endpoint"
                    value={search.endpoint}
                    onChange={e => setSearch({ ...search, endpoint: e.target.value })}
                />
                <input
                    placeholder="IP Address"
                    value={search.ip}
                    onChange={e => setSearch({ ...search, ip: e.target.value })}
                />
                <input
                    placeholder="Status Code"
                    value={search.status}
                    onChange={e => setSearch({ ...search, status: e.target.value })}
                />
                <button onClick={handleClear}>Clear</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>
                        <th>Timestamp</th>
                        <th>Attacker IP</th>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Status</th>
                        <th>User Agent</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    {attacks.map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td>{formatDate(a.timestamp)}</td>
                            <td>{a.attackerIp}</td>
                            <td>{a.httpMethod}</td>
                            <td>{a.endpoint}</td>
                            <td>{a.statusCode}</td>
                            <td>{a.userAgent}</td>
                            <td>
                                <button onClick={() => setSelectedAttack(a)}>View</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={() => setPage(p => Math.max(p - 1, 0))} disabled={page === 0}>Previous</button>
                <span>Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))} disabled={page === totalPages - 1}>Next</button>
            </div>

            {selectedAttack && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#ffffff', padding: '30px', borderRadius: '8px',
                        maxWidth: '700px', width: '90%', maxHeight: '80vh', overflowY: 'auto'
                    }}>
                        <h3 style={{ color: '#1a1a2e', marginTop: 0 }}>Attack Details</h3>

                        <h4 style={{ color: '#1a1a2e', marginBottom: '5px' }}>Raw Log</h4>
                        <pre style={{
                            backgroundColor: '#f4f4f4', padding: '15px', borderRadius: '4px',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '13px'
                        }}>
                            {selectedAttack.rawLog}
                        </pre>

                        <h4 style={{ color: '#1a1a2e', marginBottom: '5px' }}>Payload</h4>
                        <pre style={{
                            backgroundColor: '#f4f4f4', padding: '15px', borderRadius: '4px',
                            whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '13px'
                        }}>
                            {selectedAttack.payload || '(no payload - likely a GET request)'}
                        </pre>

                        <button onClick={() => setSelectedAttack(null)}
                            style={{ marginTop: '15px', backgroundColor: '#e94560', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AttacksPage;