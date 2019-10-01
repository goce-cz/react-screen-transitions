import React, { useCallback, useEffect, useMemo, useRef } from 'react'

export const DIAGNOSTICS_ACTIVE = process.env.NODE_ENV !== 'production'
const whyDidYouRender = DIAGNOSTICS_ACTIVE && require('@welldone-software/why-did-you-render')
const { default: findObjectsDifferences } = DIAGNOSTICS_ACTIVE ? require('@welldone-software/why-did-you-render/src/findObjectsDifferences') : { default: {} }
const { default: defaultNotifier } = DIAGNOSTICS_ACTIVE ? require('@welldone-software/why-did-you-render/src/defaultNotifier') : { default: {} }
const { default: normalizeOptions } = DIAGNOSTICS_ACTIVE ? require('@welldone-software/why-did-you-render/src/normalizeOptions') : { default: {} }
const { isMemoComponent = null } = DIAGNOSTICS_ACTIVE ? require('@welldone-software/why-did-you-render/src/utils') : {}

export const initializeDiagnostics = () => {
  if (whyDidYouRender) {
    whyDidYouRender(React)
  }
}

interface DiagOptions {
  fullDiff?: boolean

  [option: string]: any
}

export function diag<P> (Component: React.ComponentType<P>): React.ComponentType<P>
export function diag<P> (options: DiagOptions | boolean, Component: React.ComponentType<P>): React.ComponentType<P>
export function diag<P> (displayName: string, Component: React.ComponentType<P>): React.ComponentType<P>
export function diag<P> (displayName: string, options: DiagOptions | boolean, Component: React.ComponentType<P>): React.ComponentType<P>
export function diag (...args: any[]) {
  const Component = args[args.length - 1]
  const [arg1, arg2] = args.slice(0, args.length - 1)

  const displayNameFirst = typeof arg1 === 'string'

  const displayName = displayNameFirst ? arg1 : arg2
  const options = displayNameFirst ? arg2 : arg1
  Component.whyDidYouRender = options == null ? true : options
  if (displayName) {
    Component.displayName = displayName
  } else if (isMemoComponent(Component)) {
    Component.displayName = `memo(${Component.type && Component.type.displayName})`
  }
  if (Component.whyDidYouRender) {
    console.warn(`Diagnostics active for ${Component.displayName}`)
  }
  if (options.fullDiff) {
    return (props: any) => {
      const lastPropsRef = useRef()
      const diff = findObjectsDifferences(lastPropsRef.current, props)
      console.log(diff)
      lastPropsRef.current = props
      return <Component {...props}/>
    }
  } else {
    return Component
  }
}

const defaultOptions = normalizeOptions()

const arrayToObject = (array: any[]) => array.reduce((acc, value, index) => ({ ...acc, [index]: value }), {})
const equalArrays = (arrayA: any[], arrayB: any[]) => arrayA.length === arrayB.length && arrayA.every((element, index) => element === arrayB[index])

const diagHook = (hookFunction: Function) => (label: string, ...args: any[]) => {
  const displayName = `${hookFunction.name}(${label})`
  useEffect(
    () => console.warn(`Diagnostics active for ${displayName}`),
    [displayName]
  )

  const deps = args[args.length - 1]
  const lastDeps = useRef([])
  if (!equalArrays(lastDeps.current, deps)) {
    const objectLastDeps = arrayToObject(lastDeps.current)
    const objectDeps = arrayToObject(deps)

    const diffs = findObjectsDifferences(objectLastDeps, objectDeps)

    const updateInfo = {
      Component: hookFunction,
      displayName,
      prevProps: lastDeps,
      nextProps: deps,
      reason: {
        propsDifferences: diffs
      },
      options: defaultOptions
    }

    defaultNotifier(updateInfo)
  }
  lastDeps.current = deps
  return hookFunction(...args)
}

export const useDiagMemo = diagHook(useMemo)
export const useDiagCallback = diagHook(useCallback)
export const useDiagEffect = diagHook(useEffect)
