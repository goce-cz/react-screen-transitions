import {
  Children,
  createContext, ReactNode, Ref,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { BehaviorSubject, identity } from 'rxjs'
import { State } from 'router5'

import { RouteTransitionDetails, RouteTransitionState } from './model'

export const TransitionDetailsContext = createContext<BehaviorSubject<RouteTransitionDetails>>(null)
export const RouteStateContext = createContext<BehaviorSubject<any>>(null)

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

export function useBehaviorSubject<T> (currentValue: T): BehaviorSubject<T> {
  const value$ = useSingleton(() => new BehaviorSubject(currentValue))
  if (value$.getValue() !== currentValue) {
    value$.next(currentValue)
  }
  return value$
}

export function useRouteState$<S extends State> (): BehaviorSubject<S> {
  return useContext(RouteStateContext)
}

export function useRouteState<S extends State> (): S
export function useRouteState<S extends State, V> (
  selector: Selector<S, V> = identity as Selector<S, V>,
  deps: any[] = []
): V {
  const routeData$ = useRouteState$<S>()
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

type EqualityFunction<T> = (a: T, b: T) => boolean

export function useEqualObject<T> (object: T, equalityFnc: EqualityFunction<T>) {
  const lastObject = useRef<T>()
  const prev = lastObject.current
  if (
    (
      (prev == null) !== (object == null)
    ) ||
    (
      prev !== object &&
      !equalityFnc(prev, object)
    )
  ) {
    lastObject.current = object
  }
  return lastObject.current
}

export function useCapture<T> (value: T): RefObject<T> {
  const ref = useRef<T>()
  ref.current = value
  return ref
}

export function useComposedRef<T>(...refs: Array<Ref<T>>): Ref<T> {
  return useCallback(
    newValue => refs.forEach(ref => {
      if (!ref) {
        return
      }
      if (typeof ref === 'function') {
        ref(newValue)
      } else {
        (ref as any).current = newValue
      }
    }),
    refs
  )
}
