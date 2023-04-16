import { PetExpose, IPetPluginInterface, PluginData } from './lib/types.js'
import { log } from './lib/helper.js'
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
        log(`set: key: `, key, ` to value: `, data[key])
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
        log(`init bing api:`, api)
    }
}

function bindEventListener(ctx: PetExpose) {
    ctx.emitter.on(`plugin.${pluginName}.config.update`, (data: any) => {
        updateDB(ctx, data)
        initChatParam(ctx)
        initAPI(ctx)
        log(`[event] [plugin.${pluginName}.config.update] receive data:`, data)
    })
    ctx.emitter.on(`plugin.${pluginName}.data`, async (data: PluginData) => {
        log(`bing context: `, context)
        const res = await api.sendMessage(data.data, {
            onProgress: (partialResponse) => {
                ctx.emitter.emit('upsertLatestText', {
                    id: partialResponse.id,
                    type: 'system',
                    text: partialResponse.text
                })
                // console.log(`partialResponse: `, partialResponse)
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
        log(`bing res:`, res);
    });
    ctx.emitter.on(`plugin.${pluginName}.slot.push`, (newSlotData: any) => {
        let slotDataList:[] = JSON.parse(newSlotData)
        log(`receive newSlotData(type: ${typeof slotDataList})(len: ${slotDataList.length}):`, slotDataList)
        for (let i = 0; i < slotDataList.length; i++) {
            let slotData: any = slotDataList[i]
            switch (slotData.type) {
                case 'switch': {
                    log(`${i}, switch value:`, slotData.value)
                    ctx.db.set('enableChatContextBing', slotData.value)
                    break;
                }
                case 'dialog': {
                    // slotData.value.forEach((diaItem: any) => {
                    //     log(`${i}, dialog item:`, diaItem)
                    //     ctx.db.set(diaItem.name, diaItem.value)
                    // })
                    break;
                }
                case 'select': {
                    // log(`${i}, select value:`, slotData.value)
                    // ctx.db.set('selectTest', slotData.value)
                    break;
                }
                case 'uploda': {break;}
                default: {break;}
            }

        }
        initChatParam(ctx)
    })

    // 监听clear事件
    ctx.emitter.on(`plugin.${pluginName}.func.clear`, () => {
        context = {}
        log(`clear`)
    })
}
export default (ctx: PetExpose): IPetPluginInterface => {
    const register = () => {
        initAPI(ctx)
        bindEventListener(ctx)
        log(`[register] ctx: ${JSON.stringify(ctx)}`)
    }

    const unregister = () => {
        ctx.emitter.removeAllListeners(`plugin.${pluginName}.data`)
        ctx.emitter.removeAllListeners(`plugin.${pluginName}.config.update`)
        log(`[unregister]`)
    }
    return {
        name: 'petgpt-plugin-bing-chat',
        version: '0.0.1',
        description: 'petgpt plugin for bing-chat',
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
        handle: (data: PluginData) => new Promise((resolve, _) => {
            ctx.emitter.emit(`plugin.${pluginName}.data`, data) // 转发给自己的listener
            resolve()
        }),
        stop: () => new Promise((resolve, _) => {
            log('[stop]')
            resolve()
        }),
    }
}
