import { PetExpose, IPetPluginInterface, PluginData } from './lib/types.js'
import {Log} from './lib/helper.js'
import { BingChat } from 'bing-chat'

const pluginName = 'bing-chat'
interface ChatContext {
    clientId?: undefined | string,
    conversationId?: undefined| string,
    conversationSignature?: undefined| string
}

let context: ChatContext = {
    clientId: undefined,
    conversationId: undefined,
    conversationSignature: undefined
}
let bakContext: ChatContext = {}
function updateDB(ctx: PetExpose, data: any) {
    Object.keys(data).forEach((key) => {
        log.debug(`set: key: `, key, ` to value: `, data[key])
        ctx.db.set(key, data[key])
    })
}
let enableChatContextBing = true;
function initChatParam(ctx: PetExpose) {
    enableChatContextBing = ctx.db.get('enableChatContextBing')

    if (enableChatContextBing) {
        context.clientId = bakContext.clientId
        context.conversationId = bakContext.conversationId
        context.conversationSignature = bakContext.conversationSignature
    } else {
        bakContext.clientId = context.clientId
        bakContext.conversationId = context.conversationId
        bakContext.conversationSignature = context.conversationSignature
        context = {}
    }
}
let api: BingChat;
function initAPI(ctx: PetExpose) {
    if (ctx.db.get('BING_COOKIE')) {
        api = new BingChat({
            cookie: ctx.db.get('BING_COOKIE')
        });
        log.debug(`init bing api:`, api)
    }
}

function bindEventListener(ctx: PetExpose) {
    if(!ctx.emitter.listenerCount(`plugin.${pluginName}.config.update`)) {
        ctx.emitter.on(`plugin.${pluginName}.config.update`, (data: any) => {
            updateDB(ctx, data)
            initChatParam(ctx)
            initAPI(ctx)
            log.debug(`[event] [plugin.${pluginName}.config.update] receive data:`, data)
        })
    }

    if(!ctx.emitter.listenerCount(`plugin.${pluginName}.data`)) {
        ctx.emitter.on(`plugin.${pluginName}.data`, async (data: PluginData) => {
            log.debug(`bing context: `, context)
            const res = await api.sendMessage(data.data, {
                onProgress: (partialResponse) => {
                    ctx.emitter.emit('upsertLatestText', {
                        id: partialResponse.id,
                        type: 'system',
                        text: partialResponse.text
                    })
                    // log.debug(`partialResponse: `, partialResponse)
                },
                clientId: context.clientId,
                conversationId: context.conversationId,
                conversationSignature: context.conversationSignature
            })
            bakContext.clientId = res.clientId
            bakContext.conversationId = res.conversationId
            bakContext.conversationSignature = res.conversationSignature
            if (enableChatContextBing) {
                context = bakContext
            }
            log.debug(`bing res:`, res);
        });
    }

    if(!ctx.emitter.listenerCount(`plugin.${pluginName}.slot.push`)) {
        ctx.emitter.on(`plugin.${pluginName}.slot.push`, (newSlotData: any) => {
            let slotDataList:[] = JSON.parse(newSlotData)
            log.debug(`receive newSlotData(type: ${typeof slotDataList})(len: ${slotDataList.length}):`, slotDataList)
            for (let i = 0; i < slotDataList.length; i++) {
                let slotData: any = slotDataList[i]
                switch (slotData.type) {
                    case 'switch': {
                        log.debug(`${i}, switch value:`, slotData.value)
                        ctx.db.set('enableChatContextBing', slotData.value)
                        break;
                    }
                    case 'dialog': {
                        // slotData.value.forEach((diaItem: any) => {
                        //     log.debug(`${i}, dialog item:`, diaItem)
                        //     ctx.db.set(diaItem.name, diaItem.value)
                        // })
                        break;
                    }
                    case 'select': {
                        // log.debug(`${i}, select value:`, slotData.value)
                        // ctx.db.set('selectTest', slotData.value)
                        break;
                    }
                    case 'uploda': {break;}
                    default: {break;}
                }

            }
            initChatParam(ctx)
        })
    }

    if(!ctx.emitter.listenerCount(`plugin.${pluginName}.func.clear`)) {
        // 监听clear事件
        ctx.emitter.on(`plugin.${pluginName}.func.clear`, () => {
            context = {}
            log.debug(`clear`)
        })
    }
}
let log: Log;
export default (ctx: PetExpose): IPetPluginInterface => {
    const register = () => {
        log = new Log(ctx)
        initAPI(ctx)
        bindEventListener(ctx)
        log.debug(`[register]`)
    }

    const unregister = () => {
        ctx.emitter.removeAllListeners(`plugin.${pluginName}.config.update`)
        ctx.emitter.removeAllListeners(`plugin.${pluginName}.data`)
        ctx.emitter.removeAllListeners(`plugin.${pluginName}.slot.push`)
        ctx.emitter.removeAllListeners(`plugin.${pluginName}.func.clear`)
        log.debug(`[unregister]`)
    }
    return {
        register,
        unregister,
        config: () => [{
            name: 'BING_COOKIE',
            type: 'input',
            required: true,
            value: ctx.db.get('BING_COOKIE') || ''
        }],
        slotMenu: () => [
            {
                slot: 1,
                name: 'enableChatContextBing',
                menu: {
                    type: 'switch',
                    value: ctx.db.get('enableChatContextBing') || true
                },
                description: "是否开启上下文"
            }
        ],
        handle: (data: PluginData) => new Promise(() => {
            ctx.emitter.emit(`plugin.${pluginName}.data`, data) // 转发给自己的listener
        }),
        stop: () => new Promise((resolve, _) => {
            log.debug('[stop]')
            resolve()
        }),
    }
}
