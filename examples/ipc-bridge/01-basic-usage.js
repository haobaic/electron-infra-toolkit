const { IpcBridge, IpcHandler } = require('../../dist/index.js');

// ==========================================
// 1. 模拟基础设施 (Infrastructure)
// ==========================================
const mockApp = {
    quit: () => console.log('App is quitting...'),
    getVersion: () => '1.0.0'
};

const mockWindow = {
    minimize: (id) => console.log(`Window ${id} minimized`),
    maximize: (id) => console.log(`Window ${id} maximized`),
    isMaximized: (id) => false
};

// ==========================================
// 2. 初始化 Bridge 并注入依赖
// ==========================================
const bridge = new IpcBridge();

// 关键点：依赖注入
// 业务逻辑不需要知道 app 和 window 是如何创建的，只需要知道有这些 API 可用
bridge.addApi('app', mockApp);
bridge.addApi('window', mockWindow);


// ==========================================
// 3. 定义业务处理器 (Business Logic)
// ==========================================

// 示例 A: 简单的计算服务
const mathHandler = new IpcHandler('math-add', 'event', (api, data) => {
    return data.a + data.b;
});

// 示例 B: 依赖外部 API 的服务
const windowControlHandler = new IpcHandler('window-control', 'event', (api, data) => {
    const { action, winId } = data;
    
    if (action === 'minimize') {
        api.window.minimize(winId);
        return { success: true };
    }
    
    if (action === 'maximize') {
        api.window.maximize(winId);
        return { success: true };
    }
    
    return { success: false, error: 'Unknown action' };
});

// 示例 C: 获取应用信息的服务
const appInfoHandler = new IpcHandler('app-info', 'event', (api) => {
    return {
        version: api.app.getVersion(),
        env: 'production'
    };
});

// ==========================================
// 4. 注册处理器
// ==========================================
bridge.addHandlers([mathHandler, windowControlHandler, appInfoHandler]);


// ==========================================
// 5. 模拟运行时调用 (Simulation)
// ==========================================
console.log('--- 1. 调用数学计算 ---');
const sum = bridge.handle({ name: 'math-add', a: 10, b: 20 });
console.log(`10 + 20 = ${sum}`);

console.log('\n--- 2. 调用窗口控制 ---');
bridge.handle({ 
    name: 'window-control', 
    action: 'minimize', 
    winId: 'win-123' 
});

console.log('\n--- 3. 获取应用信息 ---');
const info = bridge.handle({ name: 'app-info' });
console.log('App Info:', info);
