export function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        alert('No data to export.');
        return;
    }

    // Get headers from the keys of the first object
    const headers = Object.keys(data[0]);

    // Build CSV rows
    const csvRows = [
        headers.join(','),  // header row
        ...data.map(row => 
            headers.map(field => {
                const value = row[field] ?? '';
                // Escape quotes and wrap fields containing commas/quotes/newlines
                const escaped = String(value).replace(/"/g, '""');
                return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
            }).join(',')
        )
    ];

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}