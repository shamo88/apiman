import React from 'react';

interface ResponseHeadersProps {
    headers: Record<string, string[]> | null;
    height: number | string;
}

export const ResponseHeaders: React.FC<ResponseHeadersProps> = ({ headers, height }) => {
    return (
        <div className="response-body" style={{ height }}>
            <div className="response-headers">
                {headers && Object.entries(headers).map(([key, values]) => {
                    if (key.toLowerCase() === 'set-cookie') {
                        return values.map((cookie: string, i: number) => (
                            <div key={`${key}-${i}`} className="response-header-item">
                                <span className="header-key">{i === 0 ? key : ''}</span>
                                <span className="header-value set-cookie-value">{cookie}</span>
                            </div>
                        ));
                    }
                    return values.map((value: string, i: number) => (
                        <div key={`${key}-${i}`} className="response-header-item">
                            <span className="header-key">{i === 0 ? key : ''}</span>
                            <span className="header-value">{value}</span>
                        </div>
                    ));
                })}
            </div>
        </div>
    );
};
