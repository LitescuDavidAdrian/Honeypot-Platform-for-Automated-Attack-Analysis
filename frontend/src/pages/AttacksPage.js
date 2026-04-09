import React, { useEffect, useState } from 'react';
import { getAttacks, searchAttacks } from '../services/api';

function AttacksPage() {
    const [attacks, setAttacks] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [search, setSearch] = useState({ endpoint: '', ip: '', status: '' });

    const fetchAttacks = () => {
        getAttacks(page).then(res => {
            setAttacks(res.data.content);
            setTotalPages(res.data.totalPages);
        });
    };

    const handleSearch = () => {
        const params = {};
        if (search.endpoint) params.endpoint = search.endpoint;
        if (search.ip) params.ip = search.ip;
        if (search.status) params.status = parseInt(search.status);
        searchAttacks(params).then(res => setAttacks(res.data));
    };

    const handleClear = () => {
        setSearch({ endpoint: '', ip: '', status: '' });
        setPage(0);
        fetchAttacks();
    };

    useEffect(() => { fetchAttacks(); }, [page]);

    return (
        <div>
            <h2 style={{ color: '#e94560' }}>Attacks</h2>
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
                <input placeholder="Endpoint" value={search.endpoint} 
                    onChange={e => setSearch({ ...search, endpoint: e.target.value })} />
                <input placeholder="IP Address" value={search.ip} 
                    onChange={e => setSearch({ ...search, ip: e.target.value })} />
                <input placeholder="Status Code" value={search.status} 
                    onChange={e => setSearch({ ...search, status: e.target.value })} />    
                <button onClick={handleSearch}>Search</button>
                <button onClick={handleClear}>Clear</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ backgroundColor: '#1a1a2e', color: '#ffffff' }}>
                        <th>Timestamp</th>
                        <th>Attacker</th>
                        <th>Method</th>
                        <th>Endpoint</th>
                        <th>Status</th>
                        <th>User Agent</th>
                    </tr>
                </thead>
                <tbody>
                    {attacks.map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #ddd' }}>
                            <td>{a.timestamp}</td>
                            <td>{a.attackerIp}</td>
                            <td>{a.httpMethod}</td>
                            <td>{a.endpoint}</td>
                            <td>{a.statusCode}</td>
                            <td>{a.userAgent}</td>
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

export default AttacksPage;