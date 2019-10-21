import { createRouter } from 'router5'
import browserPlugin from 'router5-plugin-browser'

export const router = createRouter(
  [
    {
      name: 'a',
      path: '/a',
      children: [
        {
          name: '1',
          path: '/1',
          children: [
            {
              name: 'x',
              path: '/x'
            }
          ]
        }
      ]
    },
    {
      name: 'b',
      path: '/b',
      children: [
        {
          name: '1',
          path: '/1'
        },
        {
          name: '2',
          path: '/2'
        }
      ]
    },
    {
      name: 'c',
      path: '/c',
      children: [
        {
          name: '1',
          path: '/1',
          children: [
            {
              name: 'x',
              path: '/x'
            }
          ]
        },
        {
          name: '2',
          path: '/2'
        }
      ]
    }
  ],
  {
    defaultRoute: 'a'
  }
)

router.usePlugin(browserPlugin())

router.start()
