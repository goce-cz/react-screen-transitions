import { FunctionComponent, useRef } from 'react'
import { rainbow } from './rainbow'
import React from 'react'
import { CarouselAnimation, CarouselAnimationProps, CssRouteAnimation, CssRouteAnimationProps } from 'react-screen-transitions'
import classNames from 'classnames'

const defaultAnimations = {
  stacked: 'hidden',
  pushing: 'slideInLeft',
  popping: 'slideOutRight',
  stacking: 'halfSlideOutLeft',
  unstacking: 'halfSlideInRight',
  abandoning: 'halfSlideOutUp',
  restoring: 'slideInUp'
}

interface AnimatedScreenProps extends Partial<CssRouteAnimationProps> {
  className?: string
}

let rainbowCount = 0

export const AnimatedScreen: FunctionComponent<AnimatedScreenProps> = ({ className, ...props }) => {
  const rainbowIndex = useRef<number>()
  if (rainbowIndex.current == null) {
    rainbowIndex.current = rainbowCount++
  }
  return (
    <CssRouteAnimation
      style={{ background: rainbow(10, rainbowIndex.current) }}
      startClassName='start'
      defaultAnimations={defaultAnimations}
      className={classNames('screen', className)}
      {...props}
    />
  )
}

interface CarouselScreenProps extends Partial<CarouselAnimationProps> {
  className?: string
}

export const CarouselScreen: FunctionComponent<CarouselScreenProps> = ({ className, patternOrder, ...props }) => {
  const rainbowIndex = useRef<number>()
  if (rainbowIndex.current == null) {
    rainbowIndex.current = rainbowCount++
  }
  return (
    <CarouselAnimation
      style={{ background: rainbow(10, rainbowIndex.current) }}
      startClassName='start'
      patternOrder={patternOrder}
      defaultAnimations={defaultAnimations}
      className={classNames('screen', className)}
      slideOutLeft='slideOutLeft'
      slideOutRight='slideOutRight'
      slideInLeft='slideInLeft'
      slideInRight='slideInRight'
      {...props}
    />
  )
}
