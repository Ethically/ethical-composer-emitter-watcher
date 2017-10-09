import { join } from 'path'
import { ensureFileSync, ensureDirSync, emptyDirSync } from 'fs-extra'
import Vinyl from 'vinyl'
import { exit } from 'ethical-utility-process-exit'
import watcher from '../../src/index.js'

describe('watcher()', () => {
    const relativeFilesFoder = join('test', 'files')
    const filesFoder = join(process.cwd(), relativeFilesFoder)
    const file1 = join(filesFoder, '1.js')
    const file2 = join(filesFoder, '2.js')
    const fileDir = join(filesFoder, 'dir')
    const delayedDone = (done) => {
        setTimeout(function() {
            done()
        }, 9000)
    }

    afterEach(() => {
        emptyDirSync(filesFoder)
    })

    it('should trigger file changes', async (done) => {
        let files = 0
        const instance = await watcher(relativeFilesFoder, async(file, composer) => {
            expect(Vinyl.isVinyl(file)).toBe(true)
            if (++files === 3) {
                await instance.stop()
                done()
            }
        })
        ensureFileSync(file1)
        ensureFileSync(file2)
        ensureDirSync(fileDir)
    })

    it('should console errors in its callback', async (done) => {
        const error = new Error('Error!')
        const consoleError = console.error
        console.error = async (e) => {
            expect(e).toBe(error.stack)
            console.error = consoleError
            await instance.stop()
            done()
        }
        const instance = await watcher(filesFoder, file => { throw error })
        ensureFileSync(file1)
    })

    it('should output to console when callback is omitted', async (done) => {
        const event = `File (${file1}) has been created.`
        const consoleLog = console.log
        console.log = async (text) => {
            expect(text).toBe(event)
            console.log = consoleLog
            await instance.stop()
            done()
        }
        const instance = await watcher(filesFoder)
        ensureFileSync(file1)
    })

    it('should throw errors directory is not provided', async (done) => {
        try {
            await watcher()
        } catch (error) {
            expect(() => { throw error } ).toThrow()
            done()
        }
    })

    it('should gracefully shutdown', async (done) => {
        const instance = await watcher(filesFoder)
        const instanceStop = instance.stop
        instance.stop = jasmine.createSpy('stop')
        const processExit = process.exit
        process.exit = () => {}
        await exit()
        expect(instance.stop).toHaveBeenCalled()
        process.exit = processExit
        await instanceStop()
        done()
    })
})
