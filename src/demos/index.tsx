import React, { FunctionComponent, useMemo, useState } from 'react'
import { Route, RouteSwitch } from '../lib'

import './index.css'

export const Demo: FunctionComponent = () => {
  const [routeName, setRouteName] = useState('a')
  const routeData = useMemo(() => ({ name: routeName, params: {} }), [routeName])
  return (
    <div>
      <div>Current route: {routeName}</div>
      <RouteSwitch activeRouteName={routeName} activeRouteData={routeData} keepMounted>
        <Route name='a'>Route A</Route>
        <Route name='a.1'>Route A.1</Route>
        <Route name='a.1.x'>Route A.1.X</Route>
        <Route name='b'>Route B</Route>
        <Route name='c' partial>
          <div>
            <div>{Date.now()}</div>
            <RouteSwitch activeRouteName={routeName} activeRouteData={routeData}>
              <Route name='c.1'>Route C.1</Route>
              <Route name='c.2'>Route C.2</Route>
            </RouteSwitch>
            <button onClick={() => setRouteName('c.1')}>C.1</button>
            <button onClick={() => setRouteName('c.2')}>C.2</button>
          </div>
        </Route>
      </RouteSwitch>
      <button onClick={() => setRouteName('a')}>A</button>
      <button onClick={() => setRouteName('a.1')}>A.1</button>
      <button onClick={() => setRouteName('a.1.x')}>A.1.X</button>
      <button onClick={() => setRouteName('b')}>B</button>
      <button onClick={() => setRouteName('c.1')}>C</button>
    </div>
  )
}
