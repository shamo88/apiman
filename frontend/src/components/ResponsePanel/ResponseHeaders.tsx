import React from 'react';

interface ResponseHeadersProps {
  headers: Record<string, string>;
}

export const ResponseHeaders: React.FC<ResponseHeadersProps> = ({ headers }) => {
  return (
    <div className="response-headers">
      <table className="headers-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(headers).map(([name, value]) => (
            <tr key={name}>
              <td className="header-name">{name}</td>
              <td className="header-value">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
