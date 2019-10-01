import React from 'react'
import ReactDOM from 'react-dom'
import { Demo } from './demos'
import { initializeDiagnostics } from './lib/diagnostics'

initializeDiagnostics()

ReactDOM.render(<Demo/>, document.getElementById('root'))
