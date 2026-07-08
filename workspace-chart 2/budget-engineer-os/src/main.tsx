import React from 'react'
import ReactDOM from 'react-dom/client'
import Dashboard from './routes/Dashboard'
import './index.css'
import { seedDemoProject } from './demo/seedDemo'

seedDemoProject()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>,
)
