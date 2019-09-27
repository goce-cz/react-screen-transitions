import React, { FunctionComponent, memo } from 'react'

export type RoutePattern = string | RegExp


export enum RouteTransitionState {
  head = 'head',
  push = 'push',
  pushing = 'pushing',
  stack = 'stack',
  stacking = 'stacking',
  stacked = 'stacked',
  unstack = 'unstack',
  unstacking = 'unstacking',
  pop = 'pop',
  popping = 'popping',

  abandon = 'abandon',
  abandoning = 'abandoning',

  restore = 'restore',
  restoring = 'restoring'
}

export interface MountedRouteProps {
  routeData: any
  routeName: string
  state: RouteTransitionState
}

export interface RouteInternalProps extends MountedRouteProps {
  defaults: RouteDefaultProps
}

export interface RouteDefaultProps {
  keepMounted?: boolean
}

export interface RouteExternalProps extends RouteDefaultProps {
  name: string
  partial?: boolean
}

export type RouteProps = Partial<RouteInternalProps> & RouteExternalProps

export const Route: FunctionComponent<RouteProps> = memo(({ defaults, children, ...props }) => {
  // const {  } = { ...defaults, ...props }
  return (
    <>
      {children}
    </>
  )
})
