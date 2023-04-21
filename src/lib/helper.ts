import {PetExpose} from "./types.js";

export class Log {
    private ctx: PetExpose
    constructor(ctx: PetExpose) {
        this.ctx = ctx
    }
    public info(str: string, ...args: any[]) {
        this.ctx.logger.info(`[plugin] [bingChat] ${str}`, args)
    }
    public error(...args: any[]) {
        this.ctx.logger.error(`[plugin] [bingChat] ${args}`)
    }

    public warn(...args: any[]) {
        this.ctx.logger.warn(`[plugin] [bingChat] ${args}`)
    }

    public debug(...args: any[]) {
        this.ctx.logger.debug(`[plugin] [bingChat] ${args}`)
    }
}
