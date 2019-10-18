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
import { RouteProps, RouteState, RouteSwitchProps, RouteTransitionState } from './model'

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

export const isRouteMatching = (test: string, pattern: string, partial: boolean) => pattern === test ||
  (partial && test.startsWith(`${pattern}.`))

const findDefinedRouteName = (realRouteName: string, children: ReactNode) => {
  const node = Children
    .toArray(children)
    .find(node => {
      if (!isValidRouteDefinition(node)) {
        throw new Error('<RouteSwitch> accepts only <Route> as children')
      }

      return isRouteMatching(realRouteName, node.props.name, node.props.partial)
    })
  return node && (node as ReactElement<RouteProps>).props.name
}

function useCurrentRouteStatus<D> (
  routeState$: BehaviorSubject<RouteState>,
  children: ReactNode,
  onToggleTransitionInProgress: (value: boolean) => void
): [string, string, Map<string, D>] {
  const [activeRouteName, setActiveRouteName] = useState<string>(() => {
    const routeState = routeState$.getValue()
    return routeState && findDefinedRouteName(routeState.name, children)
  })
  const [previousRouteName, setPreviousRouteName] = useState<string>(null)
  const lastActiveRouteNameRef = useRef<string>(activeRouteName)
  const [dataMap, setDataMap] = useState<Map<string, any>>(new Map())

  useEffect(
    () => {
      const subscription = routeState$.subscribe({
        next: routeState => {
          const definedRouteName = findDefinedRouteName(routeState.name, children)
          if (!definedRouteName) {
            setActiveRouteName(null)
            return
          }

          if (lastActiveRouteNameRef.current !== definedRouteName) {
            if (lastActiveRouteNameRef.current) {
              onToggleTransitionInProgress(true)
            }
            setPreviousRouteName(lastActiveRouteNameRef.current)
            setActiveRouteName(routeState.name)
            lastActiveRouteNameRef.current = definedRouteName
          }

          if (lastActiveRouteNameRef.current === definedRouteName) {
            // TODO Clean the abandoned or popped routes
            setDataMap(map => new Map(map).set(definedRouteName, routeState))
          }
        }
      })
      return () => subscription && subscription.unsubscribe()
    },
    [routeState$, children, onToggleTransitionInProgress]
  )

  return [activeRouteName, previousRouteName, dataMap]
}

const isAncestorRoute = (ancestor: string, descendant: string) => descendant.startsWith(`${ancestor}.`)

export const RouteSwitch: FunctionComponent<RouteSwitchProps> = (
  {
    children,
    routeState$,
    timeout = 6000,
    keepMounted
  }
) => {
  const [transitionInProgress, setTransitionInProgress] = useState(false)
  const [activeRouteName, previousRouteName, dataMap] = useCurrentRouteStatus(routeState$, children, setTransitionInProgress)

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

  return useMemo(
    () => {
      if (!activeRouteName) {
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
              routeState: dataMap.get(element.props.name)
            }))
            .filter(({ element, props: { keepMounted }, routeState }) => {
              const routeName = element.props.name
              return routeState &&
                (
                  routeName === activeRouteName ||
                  (routeName === previousRouteName && transitionInProgress) ||
                  (keepMounted && isAncestorRoute(routeName, activeRouteName))
                )
            })
            .map(({ element, props, routeState }) => {
              const routeName = element.props.name
              const isInTransition = transitionInProgress &&
                (routeName === activeRouteName || routeName === previousRouteName)

              const transitionState: RouteTransitionState =
                isInTransition
                  ? getTransitionState(routeName, activeRouteName, previousRouteName)
                  : getIdleState(routeName, activeRouteName)

              return cloneElement(element, {
                ...props,
                routeState,
                transitionState,
                transitionFrom: isInTransition ? previousRouteName : null,
                transitionTo: isInTransition ? activeRouteName : null,
                onTransitionEnded: isInTransition ? handleTransitionEnd : null,
                key: element.props.name
              })
            })
          }
        </>
      )
    },
    [dataMap, activeRouteName, children, previousRouteName, transitionInProgress, keepMounted, handleTransitionEnd]
  )
}
