import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'
import App from './App'

const container = document.getElementById('root')

if (!container) {
    document.body.innerHTML = '<div style="padding: 50px; text-align: center; font-family: Arial;">❌ Root element not found</div>'
    throw new Error('Root element not found')
}

console.log('🚀 Apiman starting...')
console.log('📦 Root container:', container)

window.onerror = function (message, source, lineno, colno, error) {
    console.error('❌ JavaScript Error:', message, 'at', source, ':', lineno, ':', colno)
    console.error('Error stack:', error?.stack)
    return false
}

window.onunhandledrejection = function (event) {
    console.error('❌ Unhandled Promise Rejection:', event.reason)
}

const root = createRoot(container)

console.log('✅ React root created, rendering App...')

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
)

console.log('✅ App component rendered')
