import React, { FunctionComponent, useState } from 'react'
import classNames from 'classnames'

import './demo.css'
import { Root } from './Root'
import { RouterProvider } from 'react-router5'
import { router } from './router'

export const Demo: FunctionComponent = () => {

  const [transitionInProgress, setTransitionInProgress] = useState(false)

  return (
    <RouterProvider router={router}>
      <div className={classNames('fitParent', transitionInProgress && 'transitionInProgress')}>
        <Root
          onToggleAnimation={setTransitionInProgress}
        />
      </div>
    </RouterProvider>
  )
}
