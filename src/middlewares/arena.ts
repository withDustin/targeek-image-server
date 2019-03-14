import Arena from 'bull-arena'

const arenaMiddleware = Arena(
  {
    queues: [
      {
        name: 'image-processing',
        hostId: 'Image processing',
      },
      {
        name: 'image-health-check',
        hostId: 'Images health check',
      },
    ],
  },
  {
    // Make the arena dashboard become available at {my-site.com}/arena.
    basePath: process.env.BASE_URL + '/arena',

    // Let express handle the listening.
    disableListen: true,
  },
)

export default arenaMiddleware
