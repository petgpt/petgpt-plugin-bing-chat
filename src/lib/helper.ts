import {PetExpose} from "./types.js";

export class Log {
    private ctx: PetExpose
    constructor(ctx: PetExpose) {
        this.ctx = ctx
    }
    public info(str: string, ...args: any[]) {
        this.ctx.logger.info(`[plugin] [chatgpt] ${str}`, args)
    }
    public error(...args: any[]) {
        this.ctx.logger.error(`[plugin] [chatgpt] ${args}`)
    }

    public warn(...args: any[]) {
        this.ctx.logger.warn(`[plugin] [chatgpt] ${args}`)
    }

    public debug(...args: any[]) {
        this.ctx.logger.debug(`[plugin] [chatgpt] ${args}`)
    }
}
