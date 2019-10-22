import React, {
  FunctionComponent,
  HTMLAttributes,
  memo,
  TransitionEventHandler,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef
} from 'react'

import { isRouteMatching } from './RouteSwitch'
import { useTransitionDetails$ } from './hooks'
import { RouteTransitionDetails } from './model'

export interface ComplexAnimation {
  className: string
  propertyName?: string
}

export type CssAnimation = string | ComplexAnimation

export interface DefaultAnimationsConfig {
  pushing?: CssAnimation
  popping?: CssAnimation
  stacking?: CssAnimation
  unstacking?: CssAnimation
  abandoning?: CssAnimation
  restoring?: CssAnimation
}

export interface PerPatternAnimationConfigs {
  [routeName: string]: CssAnimation
}

export type PerPatternAnimationCallback = (routePattern: string, transitionDetails: RouteTransitionDetails) => CssAnimation

export interface CssRouteAnimationProps extends HTMLAttributes<HTMLElement> {
  element?: keyof JSX.IntrinsicElements
  defaultAnimations: DefaultAnimationsConfig
  whenLeavingTo?: PerPatternAnimationConfigs | PerPatternAnimationCallback
  whenEnteringFrom?: PerPatternAnimationConfigs | PerPatternAnimationCallback
  startClassName?: string
  ignoreTransitionEnd?: boolean
}

const toComplexAnimation = (animation: CssAnimation): ComplexAnimation =>
  animation &&
  (typeof animation === 'string' ? { className: animation } : animation)

export function resolveAnimation (perPatternAnimations: PerPatternAnimationConfigs | PerPatternAnimationCallback, counterPattern: string, transitionDetails: RouteTransitionDetails) {
  if (!perPatternAnimations) {
    return null
  }
  if (typeof perPatternAnimations === 'function') {
    return toComplexAnimation(perPatternAnimations(counterPattern, transitionDetails))
  } else {
    const entry =
      perPatternAnimations &&
      Object.entries(perPatternAnimations).find(([routeName]) => routeName === counterPattern || isRouteMatching(counterPattern, routeName))

    return toComplexAnimation(entry && entry[1])
  }
}

const determineRouteAnimation = (
  transitionDetails: RouteTransitionDetails,
  defaultAnimations: DefaultAnimationsConfig,
  whenLeavingTo: PerPatternAnimationConfigs | PerPatternAnimationCallback,
  whenEnteringFrom: PerPatternAnimationConfigs | PerPatternAnimationCallback
): ComplexAnimation => {
  const { transitionTo, transitionFrom, transitionState, leaving, entering } = transitionDetails

  const inTransition = leaving || entering
  const defaultAnimation = defaultAnimations[transitionState as keyof DefaultAnimationsConfig]
  if (!inTransition) {
    return toComplexAnimation(defaultAnimation)
  }

  const perPatternAnimations =
    leaving
      ? whenLeavingTo
      : whenEnteringFrom

  const counterPattern =
    leaving
      ? transitionTo
      : transitionFrom

  const routeSpecificAnimation = resolveAnimation(perPatternAnimations, counterPattern, transitionDetails)
  return routeSpecificAnimation || toComplexAnimation(defaultAnimation)
}

export const CssRouteAnimation: FunctionComponent<CssRouteAnimationProps> = memo((
  {
    element = 'div',
    className,
    startClassName,
    defaultAnimations = {},
    whenLeavingTo,
    whenEnteringFrom,
    ignoreTransitionEnd,
    ...props
  }) => {
  const domRef = useRef<HTMLElement>()
  const lastAnimationPropertyName = useRef<string>()

  const transitionDetails$ = useTransitionDetails$()

  const updateClassNamesWhenNeeded = useCallback(
    (
      transitionDetails: RouteTransitionDetails,
      triggerAnimation: boolean
    ) => {
      const {
        className: dynamicClassName,
        propertyName
      } = determineRouteAnimation(transitionDetails, defaultAnimations, whenLeavingTo, whenEnteringFrom) || {}

      lastAnimationPropertyName.current = propertyName

      const inTransition = transitionDetails.leaving || transitionDetails.entering
      const expectedClasses = [
        className,
        dynamicClassName
      ].filter(Boolean)

      const htmlElement = domRef.current
      if (
        !triggerAnimation &&
        htmlElement.classList.length === expectedClasses.length &&
        expectedClasses.every(className => htmlElement.classList.contains(className))
      ) {
        // no need to update
        return
      }
      htmlElement.className = expectedClasses.join(' ')
      if (triggerAnimation && inTransition && dynamicClassName && startClassName) {
        htmlElement.classList.add(startClassName)
      }
    },
    [className, defaultAnimations, whenEnteringFrom, whenLeavingTo, startClassName]
  )

  useEffect(
    () => {
      const subscription = transitionDetails$.subscribe({
        next: (transitionDetails) => updateClassNamesWhenNeeded(transitionDetails, true)
      })
      return () => subscription.unsubscribe()
    },
    [updateClassNamesWhenNeeded, transitionDetails$]
  )

  useLayoutEffect(
    () => {
      updateClassNamesWhenNeeded(transitionDetails$.getValue(), false)
    },
    [updateClassNamesWhenNeeded, transitionDetails$]
  )

  const handleTransitionEnd: TransitionEventHandler = useCallback(
    event => {
      if (
        domRef.current !== event.target ||
        (lastAnimationPropertyName.current && event.propertyName !== lastAnimationPropertyName.current)
      ) {
        return
      }
      const transitionDetails = transitionDetails$.getValue()
      if (transitionDetails.onTransitionEnded) {
        transitionDetails.onTransitionEnded()
      }
    },
    [transitionDetails$]
  )

  const Element = element as any
  return <Element ref={domRef} {...props} onTransitionEnd={ignoreTransitionEnd ? null : handleTransitionEnd}/>
})
