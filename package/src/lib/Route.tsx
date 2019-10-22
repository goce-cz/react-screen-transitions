import React, {
  FunctionComponent,
  isValidElement,
  memo,
  ReactElement,
  ReactNode
} from 'react'
import { RouteProps, RouteTransitionDetails, RouteTransitionState } from './model'
import { useBehaviorSubject, TransitionDetailsContext, RouteStateContext, useTheSameObject } from './hooks'

const ROUTE_SYMBOL = Symbol('route-definition')

export const isValidRouteDefinition = (element: ReactNode): element is ReactElement<RouteProps> => !!(isValidElement(element) && element.type && (element.type as any)[ROUTE_SYMBOL])

export const Route: FunctionComponent<RouteProps> = memo(({ transitionState, transitionFrom, transitionTo, onTransitionEnded, routeState, children }) => {
    const transitionDetails = useTheSameObject(
      {
        transitionState,
        transitionFrom,
        transitionTo,
        onTransitionEnded,
        entering:
          transitionState === RouteTransitionState.pushing ||
          transitionState === RouteTransitionState.unstacking ||
          transitionState === RouteTransitionState.restoring,
        leaving:
          transitionState === RouteTransitionState.popping ||
          transitionState === RouteTransitionState.stacking ||
          transitionState === RouteTransitionState.abandoning
      },
      (prev, next) =>
        prev.transitionState === next.transitionState &&
        prev.transitionFrom === next.transitionFrom &&
        prev.transitionTo === next.transitionTo &&
        prev.onTransitionEnded === next.onTransitionEnded
    )
    const transitionDetails$ = useBehaviorSubject<RouteTransitionDetails>(transitionDetails)

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
