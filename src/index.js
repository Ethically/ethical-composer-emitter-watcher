import { join } from 'path'
import { readFileSync, lstatSync } from 'fs-extra'
import nsfw from 'nsfw'
import Vinyl from 'vinyl'
import { uniqWith, isEqual } from 'lodash'
import { absolute } from 'ethical-utility-path'
import { onExit } from 'ethical-utility-process-exit'
import fileQueue from 'ethical-composer-utility-file-queue'

const nsfwActions = {
    0: 'CREATED',
    1: 'DELETED',
    2: 'MODIFIED',
    3: 'RENAMED'
}

const isDirectory = path => lstatSync(path).isDirectory()

const makeFile = event => {
    const { action, directory, file } = event
    const path = join(directory, file)
    const state = nsfwActions[action]
    const contents = (isDirectory(path) ? null : readFileSync(path))
    return new Vinyl({ path, state, contents })
}

const watcherAPI = (watcher) => {
    let running = true
    return {
        stop: async () => {
            if (running) {
                await watcher.stop()
                running = false
            }
        }
    }
}

const normalizeEvents = events => uniqWith(events, isEqual).map(makeFile)

const watcher = async (directory, callback) => {
    if (typeof callback !== 'function') {
        callback = (file) => {
            const { path, state } = file
            console.log(`File (${path}) has been ${state.toLowerCase()}.`)
        }
    }
    let chain = Promise.resolve()
    const watcher = await nsfw(absolute(directory), async events => {
        normalizeEvents(events).forEach(file => {
            queue.enqueue(file)
            chain = (
                chain
                .then(() => queue.dequeue())
                .then(() => callback(file))
                .catch(e => console.error(e.stack))
            )
        })
    })
    const queue = fileQueue()
    await watcher.start()
    onExit(async () => {
        await instance.stop()
    })
    const instance = watcherAPI(watcher)
    return instance
}

export default watcher
