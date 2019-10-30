import React, {
  cloneElement,
  FunctionComponent, isValidElement,
  ReactElement,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
// @ts-ignore
import flattenChildren from 'react-flatten-children'
import { BehaviorSubject } from 'rxjs'
import { State } from 'router5'

import { Route, isValidRouteDefinition } from './Route'
import { RouteProps, RouteSwitchProps, RouteTransitionState } from './model'

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

const findMatchingPattern = (realRouteName: string, childArray: Array<ReactElement<RouteProps>>) => {
  const node = childArray
    .find(node => isRouteMatching(realRouteName, node.props.pattern))
  return node && (node as ReactElement<RouteProps>).props.pattern
}

function useCurrentRouteStatus(
  routeState$: BehaviorSubject<State>,
  childArray: Array<ReactElement<RouteProps>>,
  onToggleTransitionInProgress: (value: boolean) => void
): [string, string, Map<string, State>] {
  const [activePattern, setActivePattern] = useState<string>(() => {
    const routeState = routeState$.getValue()
    return routeState && findMatchingPattern(routeState.name, childArray)
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
          const pattern = findMatchingPattern(routeState.name, childArray)
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
    [routeState$, childArray, onToggleTransitionInProgress]
  )

  return [activePattern, previousPattern, dataMap]
}

const isAncestorRoute = (ancestor: string, descendant: string) => descendant.startsWith(`${ancestor}.`)

const nodeToStr = (node: ReactNode) => {
  if (isValidElement(node)) {
    if (typeof node.type === 'string') {
      return `<${node.type}>`
    } else {
      const componentConstructor = (node.type as any)
      return `<${componentConstructor.displayName || componentConstructor.name || 'Component'}>`
    }
  } else {
    return `"${node}"`
  }
}

const flattenRouteDefinitions = (children: ReactNode): Array<ReactElement<RouteProps>> => {
  const flatChildren = (flattenChildren(children) as ReactNode[])
  const invalidNode = flatChildren.find(node => !isValidElement(node) || node.type !== Route)
  if (invalidNode) {
    throw new Error(`<RouteSwitch> accepts only <Route> as children, found ${nodeToStr(invalidNode)}`)
  }

  const routes = flatChildren as Array<ReactElement<RouteProps>>
  const usedPatterns = new Set<string>()
  routes.forEach(route => {
    if (!route.props.pattern) {
      throw new Error(`missing 'pattern' attribute on <Route> element`)
    }
    if (usedPatterns.has(route.props.pattern)) {
      throw new Error(`duplicate definition for <Route pattern="${route.props.pattern}">`)
    }
    usedPatterns.add(route.props.pattern)
  })

  return routes
}

export const RouteSwitch: FunctionComponent<RouteSwitchProps> = (
  {
    children,
    routeState$,
    timeout,
    keepMounted,
    onAnimationStart,
    onAnimationComplete
  }
) => {
  const [transitionInProgress, setTransitionInProgress] = useState(false)
  const childArray = useMemo(() => flattenRouteDefinitions(children), [children])
  const [activePattern, previousPattern, dataMap] = useCurrentRouteStatus(routeState$, childArray, setTransitionInProgress)

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
      const defaults = { keepMounted }

      return (
        <>
          {childArray
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
    [dataMap, activePattern, childArray, previousPattern, transitionInProgress, keepMounted, handleTransitionEnd]
  )
}
