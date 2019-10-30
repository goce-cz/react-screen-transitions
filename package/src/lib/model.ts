import { ReactElement } from 'react'
import { BehaviorSubject } from 'rxjs'
import { State } from 'router5'

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
  leaving: boolean
  entering: boolean
  onTransitionEnded (): void
}

export interface MountedRouteProps extends RouteTransitionDetails {
  routeState: State
}

export interface RouteDefaultProps {
  keepMounted?: boolean
}

export interface RouteExternalProps extends RouteDefaultProps {
  pattern: string
}

export type RouteProps = Partial<MountedRouteProps> & RouteExternalProps

export type TransitionLifecycleHandler = (transitionFrom: string, transitionTo: string) => void

export interface RouteSwitchSettings extends Partial<RouteDefaultProps> {
  timeout: number
  children: Array<ReactElement<RouteProps>>
  onAnimationStart?: TransitionLifecycleHandler
  onAnimationComplete?: TransitionLifecycleHandler
}

export interface RouteSwitchProps extends RouteSwitchSettings {
  routeState$: BehaviorSubject<State>
}
