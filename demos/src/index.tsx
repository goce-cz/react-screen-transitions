import React from 'react'
import ReactDOM from 'react-dom'
import { Demo } from './Demo'
import { initializeDiagnostics } from './diagnostics'

initializeDiagnostics()

ReactDOM.render(<Demo/>, document.getElementById('root'))
