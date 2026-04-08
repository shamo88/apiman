import React from 'react';

interface ResponseHeadersProps {
  headers: Record<string, string> | null;
}

export const ResponseHeaders: React.FC<ResponseHeadersProps> = ({ headers }) => {
  return (
    <div className="response-headers">
      {headers && Object.entries(headers).map(([key, value]) => (
        <div key={key} className="response-header-item">
          <span className="header-key">{key}</span>
          <span className="header-value">{value}</span>
        </div>
      ))}
    </div>
  );
};