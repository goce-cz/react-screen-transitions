import React, { createContext, FunctionComponent, memo, useContext } from 'react'
import { Selector, useBehaviorSubject, useObservedValue } from './hooks'
import { identity } from 'rxjs'

export type RoutePattern = string | RegExp

export enum RouteTransitionState {
  head = 'head',
  stacked = 'stacked',
  pushing = 'pushing',
  stacking = 'stacking',
  unstacking = 'unstacking',
  popping = 'popping',
  abandoning = 'abandoning',
  restoring = 'restoring'
}

export interface MountedRouteProps {
  routeData: any
  transitionState: RouteTransitionState
}

export interface RouteInternalProps extends MountedRouteProps {
  // defaults: RouteDefaultProps
}

export interface RouteDefaultProps {
  keepMounted?: boolean
}

export interface RouteExternalProps extends RouteDefaultProps {
  name: string
  partial?: boolean
}

export type RouteProps = Partial<RouteInternalProps> & RouteExternalProps

const TransitionStateContext = createContext(null)
const RouteDataContext = createContext(null)


export function useRouteData<D,V>(
  selector: Selector<D,V> = identity as Selector<D,V>,
  deps: any[]
) {
  const routeData$ = useContext(RouteDataContext)
  return useObservedValue(routeData$, selector, deps)
}

export function useTransitionState() {
  const transitionState$ = useContext(TransitionStateContext)
  return useObservedValue(transitionState$)
}

export const Route: FunctionComponent<RouteProps> = memo(({ transitionState, routeData, children }) => {
  const transitionState$ = useBehaviorSubject(transitionState)
  const routeData$ = useBehaviorSubject(routeData)
  return (
    <div>
      <div>{transitionState}</div>
      <TransitionStateContext.Provider value={transitionState$}>
        <RouteDataContext.Provider value={routeData$}>
          {children}
        </RouteDataContext.Provider>
      </TransitionStateContext.Provider>
    </div>
  )
})
