import React, {
  createContext,
  FunctionComponent, isValidElement,
  memo, ReactElement, ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { BehaviorSubject, identity } from 'rxjs'

export enum RouteTransitionState {
  head = 'head',
  stacked = 'stacked',
  pushing = 'pushing',
  stacking = 'stacking',
  unstacking = 'unstacking',
  popping = 'popping',
  abandoning = 'abandoning',
  restoring = 'restoring'
}

export interface RouteTransitionDetails {
  transitionState: RouteTransitionState
  transitionFrom: string
  transitionTo: string

  onTransitionEnded (): void
}

export interface MountedRouteProps extends RouteTransitionDetails {
  routeData: any
}

export interface RouteDefaultProps {
  keepMounted?: boolean
}

export interface RouteExternalProps extends RouteDefaultProps {
  name: string
  partial?: boolean
}

export type RouteProps = Partial<MountedRouteProps> & RouteExternalProps

const TransitionDetailsContext = createContext<BehaviorSubject<RouteTransitionDetails>>(null)
const RouteDataContext = createContext<BehaviorSubject<any>>(null)

const ROUTE_SYMBOL = Symbol('route-definition')

export type Selector<O, V> = (object: O) => V

export function useObservedValue<O> (
  behaviorSubject: BehaviorSubject<O>
): O
export function useObservedValue<O, V> (
  behaviorSubject: BehaviorSubject<O>,
  selector: Selector<O, V>,
  deps?: any[]
): V
export function useObservedValue<O, V> (
  behaviorSubject: BehaviorSubject<O>,
  selector: Selector<O, V> = identity as Selector<O, V>,
  deps: any[] = []
): V {
  const memoizedSelector = useCallback(selector, deps)
  const [value, setValue] = useState(behaviorSubject && memoizedSelector(behaviorSubject.getValue()))

  useEffect(
    () => setValue(behaviorSubject && memoizedSelector(behaviorSubject.getValue())),
    [behaviorSubject, memoizedSelector]
  )

  useEffect(
    () => {
      const subscription = behaviorSubject && behaviorSubject.subscribe({
        next: newValue => setValue(memoizedSelector(newValue))
      })
      return () => subscription && subscription.unsubscribe()
    },
    [behaviorSubject, memoizedSelector]
  )

  return value
}

function useSingleton<T> (factory: () => T): T {
  const instanceRef = useRef<T>()
  if (!instanceRef.current) {
    instanceRef.current = factory()
  }
  return instanceRef.current
}

type EqualityFunction<T> = (a: T, b: T) => boolean

export function useBehaviorSubject<T> (currentValue: T, valuesEqual: EqualityFunction<T> = (a, b) => a === b): BehaviorSubject<T> {
  const value$ = useSingleton(() => new BehaviorSubject(currentValue))
  if (!valuesEqual(value$.getValue(), currentValue)) {
    value$.next(currentValue)
  }
  return value$
}

export function useRouteData<D, V> (
  selector: Selector<D, V> = identity as Selector<D, V>,
  deps: any[]
): V {
  const routeData$ = useContext(RouteDataContext)
  return useObservedValue(routeData$, selector, deps)
}

export function useTransitionState (): RouteTransitionState {
  const transitionDetails$ = useContext(TransitionDetailsContext)
  return useObservedValue(transitionDetails$, details => details.transitionState)
}

export function useTransitionDetails$ (): BehaviorSubject<RouteTransitionDetails> {
  return useContext(TransitionDetailsContext)
}

export function useTransitionDetails (): RouteTransitionDetails {
  const transitionState$ = useContext(TransitionDetailsContext)
  return useObservedValue(transitionState$)
}

export function useObservableRouteState<D>(activeRouteName: string, activeRouteData: D) {
  return useBehaviorSubject(
    { name: activeRouteName, data: activeRouteData },
    (prev, next) =>
      prev.name === next.name &&
      prev.data === next.data
  )
}

export const Route: FunctionComponent<RouteProps> = memo(({ transitionState, transitionFrom, transitionTo, onTransitionEnded, routeData, children }) => {
  const transitionDetails$ = useBehaviorSubject<RouteTransitionDetails>(
    { transitionState, transitionFrom, transitionTo, onTransitionEnded },
    (prev, next) =>
      prev.transitionState === next.transitionState &&
      prev.transitionFrom === next.transitionFrom &&
      prev.transitionTo === next.transitionTo &&
      prev.onTransitionEnded === next.onTransitionEnded
  )
  const routeData$ = useBehaviorSubject(routeData)
  return (
    <TransitionDetailsContext.Provider value={transitionDetails$}>
      <RouteDataContext.Provider value={routeData$}>
        {children}
      </RouteDataContext.Provider>
    </TransitionDetailsContext.Provider>
  )
})


;(Route as any)[ROUTE_SYMBOL] = true

export const isValidRouteDefinition = (element: ReactNode): element is ReactElement<RouteProps> => !!(isValidElement(element) && element.type && (element.type as any)[ROUTE_SYMBOL])

const element = <Route name='a'/>
console.log(isValidRouteDefinition(element))
