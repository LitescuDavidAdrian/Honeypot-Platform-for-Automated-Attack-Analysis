import React, { useState } from "react";
import { searchAttacks, searchAuthLogs, searchCommandLogs } from "../services/api";

const formatDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB');
};

const TYPE_META = {
    WEB: { label: 'WEB', color: '#e94560' },
    AUTH: { label: 'AUTH', color: '#0f3460' },
    CMD: { label: 'CMD', color: '#533483' },
};

function ReplayPage() {
    const [ip, setIp] = useState('');
    const [fromTime, setFromTime] = useState('');
    const [toTime, setToTime] = useState('');
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [timeRange, setTimeRange] = useState(null);

    const buildTimeline = async () => {
        if (!ip.trim()) {
            alert('Please enter an attacker IP address.');
            return;
        }
        setLoading(true);
        setSearched(true);

        try {
            // Build optional date filters for the IP-based searches
            const baseParams = { page: 0, size: 100000, ip: ip.trim() };
            if (fromTime) baseParams.dateFrom = fromTime.length === 16 ? fromTime + ':00' : fromTime;
            if (toTime) baseParams.dateTo = toTime.length === 16 ? toTime + ':59' : toTime;

            const [attackRes, authRes] = await Promise.all([
                searchAttacks(baseParams),
                searchAuthLogs(baseParams),
            ]);

            const attackEvents = attackRes.data.content.map(a => ({
                type: 'WEB',
                timestamp: a.timestamp,
                primary: `${a.httpMethod} ${a.endpoint}`,
                secondary: `Status ${a.statusCode}${a.payload ? ' - payload captured' : ''}`,
            }));

            const authEvents = authRes.data.content.map(l => ({
                type: 'AUTH',
                timestamp: l.timestamp,
                primary: `SSH ${l.status} - user "${l.username}"`,
                secondary: `from ${l.sourceIp}`,
            }));

            const ipEvents = [...attackEvents, ...authEvents];

            let cmdEvents = [];
            let range = null;

            // Determine the command time window:
            // - if the user supplied explicit from/to, use those
            // - otherwise, derive it from this IP's activity window
            let cmdFrom = null, cmdTo = null;

            if (fromTime || toTime) {
                cmdFrom = fromTime ? (fromTime.length === 16 ? fromTime + ':00' : fromTime) : null;
                cmdTo = toTime ? (toTime.length === 16 ? toTime + ':59' : toTime) : null;
                if (ipEvents.length > 0) {
                    const times = ipEvents.map(e => new Date(e.timestamp).getTime());
                    range = { from: new Date(Math.min(...times)), to: new Date(Math.max(...times)) };
                }
            } else if (ipEvents.length > 0) {
                const times = ipEvents.map(e => new Date(e.timestamp).getTime());
                const minTime = new Date(Math.min(...times));
                const maxTime = new Date(Math.max(...times));
                range = { from: minTime, to: maxTime };
                const pad = 5 * 60 * 1000; // 5-minute padding
                cmdFrom = new Date(minTime.getTime() - pad).toISOString().slice(0, 19);
                cmdTo = new Date(maxTime.getTime() + pad).toISOString().slice(0, 19);
            }

            // Fetch commands within the chosen window (command_logs has no IP)
            if (cmdFrom || cmdTo) {
                const cmdParams = { page: 0, size: 100000 };
                if (cmdFrom) cmdParams.dateFrom = cmdFrom;
                if (cmdTo) cmdParams.dateTo = cmdTo;
                const cmdRes = await searchCommandLogs(cmdParams);
                cmdEvents = cmdRes.data.content.map(c => ({
                    type: 'CMD',
                    timestamp: c.timestamp,
                    primary: c.command,
                    secondary: 'command executed (matched by time)',
                }));
            }

            const all = [...ipEvents, ...cmdEvents].sort(
                (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
            );

            setEvents(all);
            setTimeRange(range);
        } catch (err) {
            console.error('Replay build failed:', err);
            alert('Failed to build the replay. Check the console for details.');
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setFromTime('');
        setToTime('');
    };

    return (
        <div>
            <h2 style={{ color: '#e94560' }}>Attack Replay</h2>
            <p style={{ color: '#555', maxWidth: '800px' }}>
                Reconstruct an attacker's activity as a single chronological timeline.
                Web requests and SSH authentication attempts are matched by IP address.
                Commands are matched by time, as the command log does not record a source IP.
                Optionally restrict the replay to a specific time period using the filters below.
            </p>

            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    placeholder="Attacker IP (e.g. 10.0.2.3)"
                    value={ip}
                    onChange={e => setIp(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && buildTimeline()}
                    style={{ padding: '8px', width: '220px' }}
                />
                <label style={{ fontSize: '13px', color: '#555' }}>
                    From:{' '}
                    <input
                        type="datetime-local"
                        value={fromTime}
                        onChange={e => setFromTime(e.target.value)}
                        style={{ padding: '6px' }}
                    />
                </label>
                <label style={{ fontSize: '13px', color: '#555' }}>
                    To:{' '}
                    <input
                        type="datetime-local"
                        value={toTime}
                        onChange={e => setToTime(e.target.value)}
                        style={{ padding: '6px' }}
                    />
                </label>
                <button
                    onClick={buildTimeline}
                    style={{ backgroundColor: '#e94560', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Build Replay
                </button>
                <button onClick={clearFilters} style={{ padding: '8px 14px' }}>
                    Clear Filters
                </button>
            </div>

            {timeRange && events.length > 0 && (
                <p style={{ color: '#555' }}>
                    Showing {events.length} events from {formatDateTime(timeRange.from)} to {formatDateTime(timeRange.to)}.
                </p>
            )}

            {loading && <p>Building timeline…</p>}

            {!loading && searched && events.length === 0 && (
                <p style={{ color: '#888' }}>No activity found for this IP address in the selected period.</p>
            )}

            <div style={{ position: 'relative', marginTop: '20px' }}>
                {events.map((ev, i) => {
                    const meta = TYPE_META[ev.type];
                    return (
                        <div key={i} style={{ display: 'flex', marginBottom: '15px', alignItems: 'flex-start' }}>
                            <div style={{ minWidth: '90px', textAlign: 'right', paddingRight: '15px' }}>
                                <div style={{
                                    display: 'inline-block', backgroundColor: meta.color, color: '#fff',
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold'
                                }}>
                                    {meta.label}
                                </div>
                            </div>
                            <div style={{
                                flex: 1, backgroundColor: '#f9f9f9', borderLeft: `4px solid ${meta.color}`,
                                padding: '10px 15px', borderRadius: '4px'
                            }}>
                                <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                                    {formatDateTime(ev.timestamp)}
                                </div>
                                <div style={{ fontWeight: 'bold', color: '#1a1a2e', wordBreak: 'break-all' }}>
                                    {ev.primary}
                                </div>
                                <div style={{ fontSize: '13px', color: '#555' }}>
                                    {ev.secondary}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ReplayPage;