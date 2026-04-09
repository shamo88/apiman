import React from 'react';

export const AboutSettings: React.FC = () => {
  return (
    <div>
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <img src="/logo.png" alt="Apiman" style={{ width: '200px', marginBottom: '24px' }} />
        <p style={{ color: '#666', margin: '0 0 24px 0', fontSize: 14 }}>API 管理工具</p>
        <div style={{ background: '#f5f5f5', padding: '16px 24px', borderRadius: 8, display: 'inline-block' }}>
          <p style={{ color: '#333', margin: '0 0 8px 0', fontSize: 14 }}>
            <strong>版本</strong>：1.0.0
          </p>
          <p style={{ color: '#333', margin: '0 0 8px 0', fontSize: 14 }}>
            <strong>技术栈</strong>：Wails + React + TypeScript
          </p>
          <p style={{ color: '#333', margin: 0, fontSize: 14 }}>
            <strong>作者</strong>：shamo
          </p>
        </div>
      </div>
    </div>
  );
};
