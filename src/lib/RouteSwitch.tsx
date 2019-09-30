import React, {
  Children,
  cloneElement,
  FunctionComponent,
  isValidElement,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { RouteDefaultProps, RoutePattern, RouteProps, RouteTransitionState } from './Route'

interface OwnProps extends Partial<RouteDefaultProps> {
  activeRouteName: string
  activeRouteData: any
  timeout?: number
}

const matchesPattern = (routeName: string, pattern: RoutePattern) =>
  typeof pattern === 'string'
    ? pattern === routeName
    : pattern.test(routeName)

const buildAncestorPath = (routeName: string): string[] => {
  const steps = []
  let separatorIndex = 0
  while ((separatorIndex = routeName.indexOf('.', separatorIndex + 1)) >= 0) {
    steps.push(routeName.substring(0, separatorIndex))
  }
  return steps.reverse()
}

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
    const isAncestorOfCurrent = activeRouteName.startsWith(`${routeName}.`)
    const isDescendantOfCurrent = routeName.startsWith(`${activeRouteName}.`)

    if (isDescendantOfCurrent) {
      return RouteTransitionState.popping
    } else if (isAncestorOfCurrent) {
      return RouteTransitionState.stacking
    } else {
      return RouteTransitionState.abandoning
    }
  } else if (routeName === activeRouteName) {
    const isAncestorOfPrevious = previousRouteName && previousRouteName.startsWith(`${routeName}.`)
    const isDescendantOfPrevious = previousRouteName && routeName.startsWith(`${previousRouteName}.`)

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

export function useUpdatedRef<T> (value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}

interface HistorizedRef<T> {
  readonly history: T[]
  current: T
}

export function useHistorizedRef<T> (maxLength: number, initialValue?: T): HistorizedRef<T> {
  const ref = useRef<HistorizedRef<T>>()
  if (!ref.current) {
    let current = initialValue
    let history: T[] = initialValue === undefined ? [] : [initialValue]
    ref.current = {
      get history () {
        return history
      },
      set current (value: T) {
        current = value
        history = history.slice(0, maxLength - 1)
        history.unshift(value)
      },
      get current () {
        return current
      }
    }
  }

  return ref.current
}

export const RouteSwitch: FunctionComponent<OwnProps> = (
  {
    children,
    activeRouteName,
    activeRouteData,
    timeout = 3000,
    ...defaults
  }
) => {
  const applicableActiveRouteName = useMemo(
    () => {
      const node = Children
        .toArray(children)
        .find(node => {
          if (!isValidElement<RouteProps>(node) || !node.props.name) {
            throw new Error('invalid Route shit...')
          }

          return node.props.name === activeRouteName ||
            (node.props.partial && activeRouteName.startsWith(`${node.props.name}.`))
        })
      return node && (node as ReactElement<RouteProps>).props.name
    },
    [activeRouteName, children]
  )

  let [transitionInProgress, setTransitionInProgress] = useState(false)

  const previousRouteNameRef = useRef<string>(applicableActiveRouteName)

  const activeRouteNameRef = useUpdatedRef(applicableActiveRouteName)

  if (
    !transitionInProgress &&
    previousRouteNameRef.current &&
    applicableActiveRouteName !== previousRouteNameRef.current
  ) {
    setTransitionInProgress(true)
    transitionInProgress = true
  }

  const animationFinished = useCallback(
    () => {
      if (transitionInProgress) {
        previousRouteNameRef.current = activeRouteNameRef.current
        setTransitionInProgress(false)
      }
    },
    [transitionInProgress]
  )

  const timerRef = useRef<number>()

  useEffect(
    () => {
      let timer
      if (transitionInProgress) {
        timer = window.setTimeout(() => animationFinished(), timeout)
        window.clearTimeout(timerRef.current)
        timerRef.current = timer
      }
    },
    [transitionInProgress, activeRouteNameRef, animationFinished, timeout]
  )
  const visitedDataMapRef = useRef(new Map())
  visitedDataMapRef.current.set(applicableActiveRouteName, activeRouteData)

  // TODO Memoize
  const mountedChildren = (() => {
    if (!applicableActiveRouteName) {
      return []
    }
    const routeAncestorPath = buildAncestorPath(applicableActiveRouteName)
    const mountableRouteNames = [applicableActiveRouteName, previousRouteNameRef.current, ...routeAncestorPath]
    const childrenArray = Children.toArray(children) as Array<ReactElement<RouteProps>>

    return childrenArray
      .map(element => {
        const routeName = mountableRouteNames.find(mountableRouteName => mountableRouteName && matchesPattern(mountableRouteName, element.props.name))
        const routeData = visitedDataMapRef.current.get(routeName)
        return { element, routeName, routeData, props: { ...defaults, ...element.props } }
      })
      .filter(({ element, routeName, routeData, props: { keepMounted } }) =>
        routeName && routeData !== undefined &&
        (
          keepMounted ||
          routeName === applicableActiveRouteName ||
          routeName === previousRouteNameRef.current
        )
      )
      .map(item => {
        const isInTransition = !transitionInProgress &&
          (item.routeName === applicableActiveRouteName || item.routeName === previousRouteNameRef.current)

        const transitionState: RouteTransitionState =
          isInTransition
            ? getTransitionState(item.routeName, applicableActiveRouteName, previousRouteNameRef.current)
            : getIdleState(item.routeName, applicableActiveRouteName)

        return {
          ...item,
          transitionState
        }
      })
  })()

  return (
    <>
      <div>{transitionInProgress ? 'transition' : 'idle'} {Date.now()}</div>
      {
        mountedChildren.map(({ element, routeData, transitionState }) =>
          cloneElement(element, {
            routeData,
            transitionState,
            key: element.props.name
          })
        )
      }
    </>
  )
}
