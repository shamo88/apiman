import React from 'react';

interface Cookie {
    name: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: string;
    http_only?: boolean;
    secure?: boolean;
}

interface ResponseCookiesProps {
    cookies: Cookie[];
    height: number | string;
}

export const ResponseCookies: React.FC<ResponseCookiesProps> = ({ cookies, height }) => {
    if (!cookies || cookies.length === 0) {
        return (
            <div className="response-body" style={{ height }}>
                <div className="response-empty">No cookies in response</div>
            </div>
        );
    }

    return (
        <div className="response-body" style={{ height }}>
            <div className="response-cookies">
                <table className="cookie-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Value</th>
                            <th>Domain</th>
                            <th>Path</th>
                            <th>Expires</th>
                            <th>Flags</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cookies.map((cookie, index) => (
                            <tr key={index}>
                                <td className="cookie-name-cell">{cookie.name}</td>
                                <td className="cookie-value-cell">{cookie.value}</td>
                                <td>{cookie.domain || '-'}</td>
                                <td>{cookie.path || '-'}</td>
                                <td className="cookie-expires-cell">
                                    {cookie.expires && cookie.expires !== '0001-01-01 00:00:00 +0000 UTC'
                                        ? new Date(cookie.expires).toLocaleString()
                                        : 'Session'}
                                </td>
                                <td>
                                    <div className="cookie-flags">
                                        {cookie.http_only && <span className="cookie-flag http-only">HttpOnly</span>}
                                        {cookie.secure && <span className="cookie-flag secure">Secure</span>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
