const { IpcBridge, IpcHandler } = require('../../dist/index.js');

/**
 * 高级示例：模拟真实项目中的模块化结构
 * 
 * 这个示例展示了如何将业务逻辑拆分到多个文件中，
 * 并通过 IpcBridge 进行统一组装和依赖注入。
 */

// ==========================================
// 模块 A: 用户服务 (模拟 user-service.js)
// ==========================================
const createUserService = () => {
    const db = new Map(); // 模拟数据库
    db.set(1, { name: 'Alice', role: 'admin' });

    return [
        new IpcHandler('user:get', 'invoke', (api, data) => {
            api.logger.info(`Fetching user ${data.id}`);
            return db.get(data.id) || null;
        }),
        new IpcHandler('user:create', 'invoke', (api, data) => {
            const newId = Date.now();
            db.set(newId, data);
            api.logger.info(`User created: ${newId}`);
            return { id: newId, ...data };
        })
    ];
};

// ==========================================
// 模块 B: 系统设置服务 (模拟 settings-service.js)
// ==========================================
const createSettingsService = () => {
    return [
        new IpcHandler('settings:theme', 'invoke', (api, data) => {
            if (data.action === 'set') {
                api.config.set('theme', data.value);
                // 通知所有窗口更新主题
                api.windowManager.broadcast('theme-changed', data.value);
                return true;
            }
            return api.config.get('theme');
        })
    ];
};


// ==========================================
// 主程序入口 (模拟 main.ts)
// ==========================================
async function main() {
    console.log('--- 初始化应用 ---');
    
    const bridge = new IpcBridge();

    // 1. 准备基础设施 (Infrastructure)
    const logger = {
        info: (msg) => console.log(`[INFO] ${msg}`),
        error: (msg) => console.error(`[ERROR] ${msg}`)
    };

    const configStore = new Map([['theme', 'light']]);
    const config = {
        get: (k) => configStore.get(k),
        set: (k, v) => configStore.set(k, v)
    };

    const windowManager = {
        broadcast: (event, payload) => console.log(`[BROADCAST] ${event} -> ${JSON.stringify(payload)}`)
    };

    // 2. 注入依赖 (Dependency Injection)
    // 所有的 Handler 都可以通过 api.logger, api.config 等访问这些服务
    bridge.addApi('logger', logger);
    bridge.addApi('config', config);
    bridge.addApi('windowManager', windowManager);

    // 3. 加载各个模块的 Handlers
    bridge.addHandlers(createUserService());
    bridge.addHandlers(createSettingsService());

    // 4. 模拟前端调用
    console.log('\n--- 模拟前端调用 ---');

    // 调用用户服务
    const user = bridge.handle({ name: 'user:get', id: 1 });
    console.log('User Result:', user);

    // 调用设置服务
    bridge.handle({ name: 'settings:theme', action: 'set', value: 'dark' });
    
    // 验证配置是否更新
    const currentTheme = bridge.handle({ name: 'settings:theme', action: 'get' });
    console.log('Current Theme:', currentTheme);
}

main().catch(console.error);
