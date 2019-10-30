import React, { FunctionComponent, useEffect } from 'react'
import { useRouter } from 'react-router5'
import { SubscribeState } from 'router5'

import { RouteSwitch } from './RouteSwitch'
import { RouteSwitchSettings } from './model'
import { useBehaviorSubject, useRouteState$ } from './hooks'

export const Router5Switch: FunctionComponent<RouteSwitchSettings> = (props) => {
  const parentRouteState$ = useRouteState$()
  const router = useRouter()
  const router5State$ = useBehaviorSubject(router && router.getState())
  useEffect(
    () => {
      if(!router) {
        return
      }
      const subscription = router.subscribe(({ route }: SubscribeState) => router5State$.next(route))
      console.log(subscription)
      // return () => subscription.unsubscribe()
    },
    [router, router5State$]
  )

  return (
    <RouteSwitch {...props} routeState$={parentRouteState$ ||router5State$}/>
  )
}
