import React, { FunctionComponent, useMemo, useRef, useState } from 'react'

import './demo.css'
import { CssRouteAnimation, NestedRouteSwitch, Route, RouteSwitch, useBehaviorSubject, RouteState } from 'react-screen-transitions'

const defaultAnimations = {
  stacked: 'stacked',
  pushing: 'pushing',
  popping: 'popping',
  stacking: 'stacking',
  unstacking: 'unstacking',
  abandoning: 'abandoning',
  restoring: 'restoring'
}

function rainbow (numOfSteps: number, step: number) {
  // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
  // Adam Cole, 2011-Sept-14
  // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
  var r, g, b
  var h = step / numOfSteps
  var i = ~~(h * 6)
  var f = h * 6 - i
  var q = 1 - f
  switch (i % 6) {
    case 0:
      r = 1
      g = f
      b = 0
      break
    case 1:
      r = q
      g = 1
      b = 0
      break
    case 2:
      r = 0
      g = 1
      b = f
      break
    case 3:
      r = 0
      g = q
      b = 1
      break
    case 4:
      r = f
      g = 0
      b = 1
      break
    case 5:
      r = 1
      g = 0
      b = q
      break
  }
  var c = '#' + ('00' + (~~(r * 255)).toString(16)).slice(-2) + ('00' + (~~(g * 255)).toString(16)).slice(-2) + ('00' + (~~(b * 255)).toString(16)).slice(-2)
  return (c)
}

interface ScreenProps {
  className?: string
}

let rainbowCount = 0

const Screen: FunctionComponent<ScreenProps> = ({ className, ...props }) => {
  const rainbowIndex = useRef<number>()
  if (rainbowIndex.current == null) {
    rainbowIndex.current = rainbowCount++
  }
  return (
    <CssRouteAnimation
      style={{ background: rainbow(10, rainbowIndex.current) }}
      startClassName='start'
      defaultAnimations={defaultAnimations}
      className={['screen', className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

export const Demo: FunctionComponent = () => {
  const [routeName, setRouteName] = useState('a')
  const routeData = useMemo(() => ({ name: routeName, params: { something: `DATA<${routeName}>` } }) as RouteState, [routeName])

  const activeRouteState$ = useBehaviorSubject(routeData)
  return useMemo(
    () => {
      return (
        <div className='fitParent flexColumn'>
          <div className='container'>
            <RouteSwitch routeState$={activeRouteState$} keepMounted>
              <Route name='a'><Screen>Route A</Screen></Route>
              <Route name='a.1'><Screen> Route A.1 {Date.now()}</Screen></Route>
              <Route name='a.1.x'><Screen>Route A.1.X</Screen></Route>
              <Route name='b'><Screen>Route B</Screen></Route>
              <Route name='c' partial><Screen className='flexColumn'>
                <div className='container'>
                  <NestedRouteSwitch>
                    <Route name='c.1' keepMounted><Screen>Route C.1</Screen></Route>
                    <Route name='c.1.x'><Screen>Route C.1.X</Screen></Route>
                    <Route name='c.2'><Screen>Route C.2</Screen></Route>
                  </NestedRouteSwitch>
                </div>
                <button onClick={() => setRouteName('c.1')}>C.1</button>
                <button onClick={() => setRouteName('c.1.x')}>C.1.X</button>
                <button onClick={() => setRouteName('c.2')}>C.2</button>
              </Screen>
              </Route>
            </RouteSwitch>
          </div>
          <button onClick={() => setRouteName('a')}>A</button>
          <button onClick={() => setRouteName('a.1')}>A.1</button>
          <button onClick={() => setRouteName('a.1.x')}>A.1.X</button>
          <button onClick={() => setRouteName('b')}>B</button>
          <button onClick={() => setRouteName('c')}>C</button>
        </div>
      )
    },
    [activeRouteState$]
  )
}
