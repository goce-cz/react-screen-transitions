import React, {
  FunctionComponent,
  isValidElement,
  memo,
  ReactElement,
  ReactNode
} from 'react'
import { RouteProps, RouteTransitionDetails } from './model'
import { useBehaviorSubject, TransitionDetailsContext, RouteStateContext } from './hooks'

const ROUTE_SYMBOL = Symbol('route-definition')

export const isValidRouteDefinition = (element: ReactNode): element is ReactElement<RouteProps> => !!(isValidElement(element) && element.type && (element.type as any)[ROUTE_SYMBOL])

export const Route: FunctionComponent<RouteProps> = memo(({ transitionState, transitionFrom, transitionTo, onTransitionEnded, routeState, children }) => {
  const transitionDetails$ = useBehaviorSubject<RouteTransitionDetails>(
    { transitionState, transitionFrom, transitionTo, onTransitionEnded },
    (prev, next) =>
      prev.transitionState === next.transitionState &&
      prev.transitionFrom === next.transitionFrom &&
      prev.transitionTo === next.transitionTo &&
      prev.onTransitionEnded === next.onTransitionEnded
  )
  const routeData$ = useBehaviorSubject(routeState)
  return (
    <TransitionDetailsContext.Provider value={transitionDetails$}>
      <RouteStateContext.Provider value={routeData$}>
        {children}
      </RouteStateContext.Provider>
    </TransitionDetailsContext.Provider>
  )
})

;(Route as any)[ROUTE_SYMBOL] = true
