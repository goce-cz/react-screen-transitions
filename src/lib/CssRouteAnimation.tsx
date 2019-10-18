import React, { FunctionComponent, HTMLAttributes, memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react'

import { isRouteMatching } from './RouteSwitch'
import { useTransitionDetails$ } from './hooks'
import { RouteTransitionDetails, RouteTransitionState } from './model'

export interface CssAnimationConfig {
  pushing?: string
  popping?: string
  stacking?: string
  unstacking?: string
  abandoning?: string
  restoring?: string
}

export interface CssPerRouteAnimationConfig extends CssAnimationConfig {
  name: string
  partial?: boolean
}

export interface CssRouteAnimationProps extends HTMLAttributes<HTMLElement> {
  element?: keyof JSX.IntrinsicElements
  defaultAnimations: CssAnimationConfig
  perRouteAnimations?: CssPerRouteAnimationConfig[]
  startClassName?: string
}

export const CssRouteAnimation: FunctionComponent<CssRouteAnimationProps> = memo(({ element = 'div', className, startClassName, defaultAnimations, perRouteAnimations, ...props }) => {
  const domRef = useRef<HTMLElement>()

  const transitionDetails$ = useTransitionDetails$()

  const updateClassNamesWhenNeeded = useCallback(
    (
      { transitionTo, transitionFrom, transitionState }: RouteTransitionDetails,
      triggerAnimation: boolean
    ) => {
      const routeSpecificAnimations = perRouteAnimations &&
        perRouteAnimations.find(config =>
          isRouteMatching(transitionFrom, config.name, config.partial) ||
          isRouteMatching(transitionTo, config.name, config.partial)
        )
      const mergedAnimations = { ...defaultAnimations, ...routeSpecificAnimations }
      const dynamicClassName = mergedAnimations[transitionState as keyof CssAnimationConfig]

      const inTransition = transitionState !== RouteTransitionState.head && transitionState !== RouteTransitionState.stacked
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
    [className, defaultAnimations, perRouteAnimations, startClassName]
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

  const handleTransitionEnd = useCallback(
    () => {
      const transitionDetails = transitionDetails$.getValue()
      if (transitionDetails.onTransitionEnded) {
        transitionDetails.onTransitionEnded()
      }
    },
    [transitionDetails$]
  )

  const Element = element as any
  return <Element ref={domRef} {...props} onTransitionEnd={handleTransitionEnd}/>
})
