import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
    const location = useLocation();

    const navStyle = {
        backgroundColor: '#1a1a2e',
        padding: '15px 30px',
        display: 'flex',
        alignItems: 'center',
        gap: '30px'
    };

    const titleStyle = {
        color: '#e94560',
        fontWeight: 'bold',
        fontSize: '18px',
        marginRight: 'auto'
    };

    const linkStyle = (path) => ({
        color: location.pathname === path ? '#e94560' : '#ffffff',
        textDecoration: 'none',
        fontWeight: location.pathname === path ? 'bold' : 'normal'
    });

    return (
        <nav style={navStyle}>
            <span style={titleStyle}>Honeypot Dashboard</span>
            <Link to="/attacks" style={linkStyle('/attacks')}>Attacks</Link>
            <Link to="/auth-logs" style={linkStyle('/auth-logs')}>Auth Logs</Link>
            <Link to="/command-logs" style={linkStyle('/command-logs')}>Command Logs</Link>
        </nav>
    );
}

export default Navbar;