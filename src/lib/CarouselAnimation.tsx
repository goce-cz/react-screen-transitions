import React, { FunctionComponent, memo, useCallback } from 'react'

import {
  CssAnimation, CssRouteAnimation,
  CssRouteAnimationProps,
  PerPatternAnimationCallback,
  resolveAnimation
} from './CssRouteAnimation'
import { useCapture } from './hooks'

export interface CarouselAnimationProps extends CssRouteAnimationProps {
  patternOrder: string[]
  slideInLeft: CssAnimation
  slideInRight: CssAnimation
  slideOutLeft: CssAnimation
  slideOutRight: CssAnimation
}

export const CarouselAnimation: FunctionComponent<CarouselAnimationProps> = memo((
  {
    patternOrder,
    whenEnteringFrom,
    whenLeavingTo,
    slideInLeft,
    slideInRight,
    slideOutLeft,
    slideOutRight,
    ...props
  }
) => {
  const lastPatternOrder = useCapture(patternOrder)

  const handleDetermineAnimation: PerPatternAnimationCallback = useCallback(
    (counterPattern, transitionDetails) => {

      const fromIndex = lastPatternOrder.current.indexOf(transitionDetails.transitionFrom)
      const toIndex = lastPatternOrder.current.indexOf(transitionDetails.transitionTo)
      if (fromIndex < 0 || toIndex < 0) {
        return resolveAnimation(
          transitionDetails.leaving
            ? whenLeavingTo
            : whenEnteringFrom,

          counterPattern,
          transitionDetails
        )
      }
      const diff = (toIndex - fromIndex)
      if(transitionDetails.leaving) {
        return diff > 0
          ? slideOutLeft
          : slideOutRight
      } else {
        return diff > 0
          ? slideInLeft
          : slideInRight
      }

    },
    [whenEnteringFrom, whenLeavingTo, slideInLeft, slideInRight, slideOutLeft, slideOutRight]
  )

  return (
    <CssRouteAnimation
      {...props}
      whenEnteringFrom={handleDetermineAnimation}
      whenLeavingTo={handleDetermineAnimation}
    />
  )
})
