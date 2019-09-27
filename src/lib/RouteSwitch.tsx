import React, {
  Children,
  cloneElement,
  FunctionComponent, isValidElement,
  ReactElement, ReactNode, useCallback,
  useEffect,
  useLayoutEffect, useMemo,
  useRef,
  useState
} from 'react'
import { RouteDefaultProps, RoutePattern, RouteProps, RouteTransitionState } from './Route'
import { node } from 'prop-types'

interface OwnProps {
  activeRouteName: string
  activeRouteData: any
  defaults?: RouteDefaultProps
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

enum SwitchState {
  // no transition in progress
  IDLE = 'IDLE',
  // a transition is about to start (initial styles are applied)
  PREPARATION = 'PREPARATION',
  // transition is in progress (styles are transforming from the initial to the target ones)
  TRANSITION = 'TRANSITION'
}

const pendingStatesByIntentState = new Map([
  [RouteTransitionState.push, RouteTransitionState.pushing],
  [RouteTransitionState.stack, RouteTransitionState.stacking],
  [RouteTransitionState.unstack, RouteTransitionState.unstacking],
  [RouteTransitionState.pop, RouteTransitionState.popping],
  [RouteTransitionState.abandon, RouteTransitionState.abandoning],
  [RouteTransitionState.restore, RouteTransitionState.restoring]
])

const getIdleState = (routeName: string, activeRouteName: string) => {
  if (routeName === activeRouteName) {
    return RouteTransitionState.head
  } else {
    return RouteTransitionState.stacked
  }
}

const getIntentState = (
  routeName: string,
  activeRouteName: string,
  previousRouteName: string | null
) => {
  if (routeName === previousRouteName) {
    const isAncestorOfCurrent = activeRouteName.startsWith(`${routeName}.`)
    const isDescendantOfCurrent = routeName.startsWith(`${activeRouteName}.`)

    if (isDescendantOfCurrent) {
      return RouteTransitionState.pop
    } else if (isAncestorOfCurrent) {
      return RouteTransitionState.stack
    } else {
      return RouteTransitionState.abandon
    }
  } else if (routeName === activeRouteName) {
    const isAncestorOfPrevious = previousRouteName && previousRouteName.startsWith(`${routeName}.`)
    const isDescendantOfPrevious = previousRouteName && routeName.startsWith(`${previousRouteName}.`)

    if (isDescendantOfPrevious) {
      return RouteTransitionState.push
    } else if (isAncestorOfPrevious) {
      return RouteTransitionState.unstack
    } else {
      return RouteTransitionState.restore
    }
  } else {
    return null
  }
}

export const RouteSwitch: FunctionComponent<OwnProps> = (
  {
    children,
    activeRouteName,
    activeRouteData,
    defaults,
    timeout = 3000
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

  const [switchState, setSwitchState] = useState(SwitchState.IDLE)

  const previousRouteNameRef = useRef<string>(applicableActiveRouteName)

  const activeRouteNameRef = useRef<string>()
  activeRouteNameRef.current = applicableActiveRouteName
  const switchStateRef = useRef<SwitchState>()
  switchStateRef.current = switchState

  useEffect(
    () => {
      console.log('X')
      if (
        switchStateRef.current === SwitchState.IDLE &&
        previousRouteNameRef.current &&
        applicableActiveRouteName !== previousRouteNameRef.current
      ) {
        console.log('A')
        setSwitchState(SwitchState.PREPARATION)
      }
    },
    [applicableActiveRouteName, switchStateRef]
  )

  useLayoutEffect(
    () => {
      if (switchState === SwitchState.PREPARATION) {
        console.log('B')
        setSwitchState(SwitchState.TRANSITION)
      }
    },
    [switchState]
  )

  let isIdle = switchState === SwitchState.IDLE
  const animationFinished = useCallback(
    () => {
      if (!isIdle) {
        console.log('C')
        previousRouteNameRef.current = activeRouteNameRef.current
        setSwitchState(SwitchState.IDLE)
      }
    },
    [isIdle]
  )

  const timerRef = useRef<number>()

  useEffect(
    () => {
      let timer
      if (switchState === SwitchState.TRANSITION) {
        timer = window.setTimeout(() => animationFinished(), timeout)
        window.clearTimeout(timerRef.current)
        timerRef.current = timer
      }
    },
    [switchState, activeRouteNameRef, animationFinished, timeout]
  )
  const visitedDataMapRef = useRef(new Map())
  visitedDataMapRef.current.set(applicableActiveRouteName, activeRouteData)

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
        const isInTransition = switchState !== SwitchState.IDLE &&
          (item.routeName === applicableActiveRouteName || item.routeName === previousRouteNameRef.current)

        const intentOrIdleState: RouteTransitionState =
          isInTransition
            ? getIntentState(item.routeName, applicableActiveRouteName, previousRouteNameRef.current)
            : getIdleState(item.routeName, applicableActiveRouteName)

        const pendingState = pendingStatesByIntentState.get(intentOrIdleState)

        return {
          ...item,
          state: pendingState || intentOrIdleState
        }
      })
  })()

  return (
    <>
      <div>{switchState} {Date.now()}</div>
      {
        mountedChildren.map(({ element, routeName, routeData, state }) =>
          cloneElement(element, {
            routeName,
            routeData,
            state,
            key: routeName
          })
        )
      }
    </>
  )
}
