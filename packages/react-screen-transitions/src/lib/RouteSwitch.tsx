import React, {
  Children,
  cloneElement,
  FunctionComponent,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { isValidRouteDefinition } from './Route'
import { BehaviorSubject } from 'rxjs'
import { RouteProps, RouteSwitchProps, RouteTransitionState } from './model'
import { State } from 'router5'

const getIdleState = (routeName: string, activeRouteName: string) => {
  if (routeName === activeRouteName) {
    return RouteTransitionState.head
  } else {
    return RouteTransitionState.stacked
  }
}

const getTransitionState = (
  routeName: string,
  activeRouteName: string,
  previousRouteName: string | null
) => {
  if (routeName === previousRouteName) {
    const isAncestorOfCurrent = isAncestorRoute(routeName, activeRouteName)
    const isDescendantOfCurrent = isAncestorRoute(activeRouteName, routeName)

    if (isDescendantOfCurrent) {
      return RouteTransitionState.popping
    } else if (isAncestorOfCurrent) {
      return RouteTransitionState.stacking
    } else {
      return RouteTransitionState.abandoning
    }
  } else if (routeName === activeRouteName) {
    const isAncestorOfPrevious = previousRouteName && isAncestorRoute(routeName, previousRouteName)
    const isDescendantOfPrevious = previousRouteName && isAncestorRoute(previousRouteName, routeName)

    if (isDescendantOfPrevious) {
      return RouteTransitionState.pushing
    } else if (isAncestorOfPrevious) {
      return RouteTransitionState.unstacking
    } else {
      return RouteTransitionState.restoring
    }
  } else {
    return null
  }
}

export const isRouteMatching = (test: string, pattern: string) => {
  const partial = pattern.charAt(pattern.length - 1) === '*'
  const base = partial
    ? pattern.substring(0, pattern.length - 1)
    : pattern
  return test === base || (partial && test.startsWith(`${base}.`))
}

const findMatchingPattern = (realRouteName: string, children: ReactNode) => {
  const node = Children
    .toArray(children)
    .find(node => {
      if (!isValidRouteDefinition(node)) {
        throw new Error('<RouteSwitch> accepts only <Route> as children')
      }

      return isRouteMatching(realRouteName, node.props.pattern)
    })
  return node && (node as ReactElement<RouteProps>).props.pattern
}

function useCurrentRouteStatus(
  routeState$: BehaviorSubject<State>,
  children: ReactNode,
  onToggleTransitionInProgress: (value: boolean) => void
): [string, string, Map<string, State>] {
  const [activePattern, setActivePattern] = useState<string>(() => {
    const routeState = routeState$.getValue()
    return routeState && findMatchingPattern(routeState.name, children)
  })
  const [previousPattern, setPreviousPattern] = useState<string>(null)
  const lastPatternNameRef = useRef<string>(activePattern)
  const [dataMap, setDataMap] = useState<Map<string, any>>(new Map())

  useEffect(
    () => {
      const subscription = routeState$.subscribe({
        next: routeState => {
          if(!routeState ) {
            return
          }
          const pattern = findMatchingPattern(routeState.name, children)
          if (!pattern) {
            setActivePattern(null)
            return
          }

          if (lastPatternNameRef.current !== pattern) {
            if (lastPatternNameRef.current) {
              onToggleTransitionInProgress(true)
            }
            setPreviousPattern(lastPatternNameRef.current)
            setActivePattern(pattern)
            lastPatternNameRef.current = pattern
          }

          if (lastPatternNameRef.current === pattern) {
            // TODO Clean the abandoned or popped routes
            setDataMap(map => new Map(map).set(pattern, routeState))
          }
        }
      })
      return () => subscription && subscription.unsubscribe()
    },
    [routeState$, children, onToggleTransitionInProgress]
  )

  return [activePattern, previousPattern, dataMap]
}

const isAncestorRoute = (ancestor: string, descendant: string) => descendant.startsWith(`${ancestor}.`)

export const RouteSwitch: FunctionComponent<RouteSwitchProps> = (
  {
    children,
    routeState$,
    timeout = 6000,
    keepMounted,
    onAnimationStart,
    onAnimationComplete
  }
) => {
  const [transitionInProgress, setTransitionInProgress] = useState(false)
  const [activePattern, previousPattern, dataMap] = useCurrentRouteStatus(routeState$, children, setTransitionInProgress)

  const timerRef = useRef<number>()

  const handleTransitionEnd = useCallback(
    () => {
      if (transitionInProgress) {
        window.clearTimeout(timerRef.current)
        setTransitionInProgress(false)
      }
    },
    [transitionInProgress]
  )

  useEffect(
    () => {
      let timer
      if (transitionInProgress) {
        timer = window.setTimeout(handleTransitionEnd, timeout)
        window.clearTimeout(timerRef.current)
        timerRef.current = timer
      }
    },
    [transitionInProgress, handleTransitionEnd, timeout]
  )

  useEffect(
    () => {
      if (activePattern && previousPattern) {
        const handler = transitionInProgress ? onAnimationStart : onAnimationComplete
        if (handler) {
          handler(activePattern, previousPattern)
        }
      }
    },
    [transitionInProgress, activePattern, previousPattern]
  )

  return useMemo(
    () => {
      if (!activePattern) {
        return null
      }
      const childrenArray = Children.toArray(children) as Array<ReactElement<RouteProps>>
      const defaults = { keepMounted }

      return (
        <>
          {childrenArray
            .map(element => ({
              element,
              props: { ...defaults, ...element.props },
              routeState: dataMap.get(element.props.pattern)
            }))
            .filter(({ element, props: { keepMounted }, routeState }) => {
              const pattern = element.props.pattern

              return routeState &&
                (
                  pattern === activePattern ||
                  (pattern === previousPattern && transitionInProgress) ||
                  (keepMounted && isAncestorRoute(pattern, activePattern))
                )
            })
            .map(({ element, props, routeState }) => {
              const routeName = element.props.pattern
              const isInTransition = transitionInProgress &&
                (routeName === activePattern || routeName === previousPattern)

              const transitionState: RouteTransitionState =
                isInTransition
                  ? getTransitionState(routeName, activePattern, previousPattern)
                  : getIdleState(routeName, activePattern)

              return cloneElement(element, {
                ...props,
                routeState,
                transitionState,
                transitionFrom: isInTransition ? previousPattern : null,
                transitionTo: isInTransition ? activePattern : null,
                onTransitionEnded: isInTransition ? handleTransitionEnd : null,
                key: element.props.pattern
              })
            })
          }
        </>
      )
    },
    [dataMap, activePattern, children, previousPattern, transitionInProgress, keepMounted, handleTransitionEnd]
  )
}
