import React, { FunctionComponent } from 'react'

import { RouteSwitch } from './RouteSwitch'
import { RouteSwitchSettings } from './model'
import { useRouteState$ } from './hooks'

export const NestedRouteSwitch: FunctionComponent<RouteSwitchSettings> = (props) => {
  const parentRouteState$ = useRouteState$()
  return (
    <RouteSwitch {...props} routeState$={parentRouteState$}/>
  )
}
