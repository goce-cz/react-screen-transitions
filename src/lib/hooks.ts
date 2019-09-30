import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { BehaviorSubject, identity } from 'rxjs'

export type Selector<O,V> = (object: O)=> V

export function useObservedValue<O,V>(
  behaviorSubject: BehaviorSubject<O>,
  selector: Selector<O,V> = identity as Selector<O,V>,
  deps: any[] = []
): V {
  const memoizedSelector = useCallback(selector, deps)
  const [value, setValue] = useState(behaviorSubject && memoizedSelector(behaviorSubject.getValue()))

  useEffect(
    () => setValue(behaviorSubject && selector(behaviorSubject.getValue())),
    [behaviorSubject, memoizedSelector]
  )

  useEffect(
    () => {
      const subscription = behaviorSubject && behaviorSubject.subscribe({
        next: newValue => setValue(selector(newValue))
      })
      return () => subscription && subscription.unsubscribe()
    },
    [behaviorSubject]
  )

  return value
}

export function useSingleton<T>(factory: () => T): T {
  const instanceRef = useRef<T>()
  if (!instanceRef.current) {
    instanceRef.current = factory()
  }
  return instanceRef.current
}

export function useBehaviorSubject<T>(currentValue: T): BehaviorSubject<T> {
  const value$ = useSingleton(() => new BehaviorSubject(currentValue))
  if (value$.getValue() !== currentValue) {
    value$.next(currentValue)
  }
  return value$
}
