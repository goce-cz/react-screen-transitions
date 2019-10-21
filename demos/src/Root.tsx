import React, { FunctionComponent, memo } from 'react'
import { Route, Router5Switch } from 'react-screen-transitions'
import { AnimatedScreen, CarouselScreen } from './Screens'
import { useRouter } from 'react-router5'

const PATTERN_ORDER = ['b', 'b.1', 'b.2']

export interface RootProps {
  onToggleAnimation? (active: boolean): void
}

export const Root: FunctionComponent<RootProps> = memo(({ onToggleAnimation }) => {
  const router = useRouter()
  console.log(useRouter)
  const handleTransition = () => onToggleAnimation(true)
  const handleTransitionComplete = () => onToggleAnimation(false)

  return (
    <div className='fitParent flexColumn'>
      <div className='container'>
        <Router5Switch
          onAnimationStart={handleTransition}
          onAnimationComplete={handleTransitionComplete}
        >
          <Route pattern='a'>
            <AnimatedScreen
              whenLeavingTo={{
                'c*': { className: 'shrink', propertyName: 'transform' }
              }}
              whenEnteringFrom={{
                'c*': { className: 'fill', propertyName: 'transform' }
              }}
            >
              Route A
            </AnimatedScreen>
          </Route>
          <Route pattern='a.1'><AnimatedScreen>Route A.1 {Date.now()}</AnimatedScreen></Route>
          <Route pattern='a.1.x'><AnimatedScreen>Route A.1.X</AnimatedScreen></Route>
          <Route pattern='b*'>
            <AnimatedScreen className='flexColumn'>
              <div className='container'>
                <Router5Switch
                  onAnimationStart={handleTransition}
                  onAnimationComplete={handleTransitionComplete}
                >
                  <Route pattern='b'><CarouselScreen patternOrder={PATTERN_ORDER}>Route B</CarouselScreen></Route>
                  <Route pattern='b.1'><CarouselScreen patternOrder={PATTERN_ORDER}>Route B.1</CarouselScreen></Route>
                  <Route pattern='b.2'><CarouselScreen patternOrder={PATTERN_ORDER}>Route B.2</CarouselScreen></Route>
                </Router5Switch>
              </div>
              <button onClick={() => router.navigate('b.1')}>B.1</button>
              <button onClick={() => router.navigate('b.2')}>B.2</button>
            </AnimatedScreen>
          </Route>
          <Route pattern='c*'><AnimatedScreen
            className='flexColumn'
            whenLeavingTo={{
              'a*': { className: 'shrink', propertyName: 'transform' }
            }}
            whenEnteringFrom={{
              'a*': { className: 'fill', propertyName: 'transform' }
            }}
          >
            <div className='container'>
              <Router5Switch
                onAnimationStart={handleTransition}
                onAnimationComplete={handleTransitionComplete}
              >
                <Route pattern='c.1' keepMounted><AnimatedScreen>Route C.1</AnimatedScreen></Route>
                <Route pattern='c.1.x'><AnimatedScreen>Route C.1.X</AnimatedScreen></Route>
                <Route pattern='c.2'><AnimatedScreen>Route C.2</AnimatedScreen></Route>
              </Router5Switch>
            </div>
            <button onClick={() => router.navigate('c.1')}>C.1</button>
            <button onClick={() => router.navigate('c.1.x')}>C.1.X</button>
            <button onClick={() => router.navigate('c.2')}>C.2</button>
          </AnimatedScreen>
          </Route>
        </Router5Switch>
      </div>
      <button onClick={() => router.navigate('a')}>A</button>
      <button onClick={() => router.navigate('a.1')}>A.1</button>
      <button onClick={() => router.navigate('a.1.x')}>A.1.X</button>
      <button onClick={() => router.navigate('b')}>B</button>
      <button onClick={() => router.navigate('c.1')}>C</button>
    </div>
  )
})
