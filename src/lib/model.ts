import { ReactElement } from 'react'
import { BehaviorSubject } from 'rxjs'

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
  routeState: any
}

export interface RouteDefaultProps {
  keepMounted?: boolean
}

export interface RouteExternalProps extends RouteDefaultProps {
  name: string
  partial?: boolean
}

export type RouteProps = Partial<MountedRouteProps> & RouteExternalProps


export interface RouteState {
  name: string
  [dataKey: string]: any
}

export interface RouteSwitchSettings extends Partial<RouteDefaultProps> {
  timeout?: number
  children: Array<ReactElement<RouteProps>>
}

export interface RouteSwitchProps extends RouteSwitchSettings {
  routeState$: BehaviorSubject<RouteState>
}
