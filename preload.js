// uTools 插件预加载脚本

// 插件进入时的处理
window.exports = {
    'json2thrift': {
        mode: 'doc',
        args: {
            enter: (action, callbackSetList) => {
                // 插件进入时的回调
                console.log('JSON2Thrift plugin entered');
                
                // 可以在这里处理从其他应用传入的数据
                if (action.payload) {
                    // 如果有传入的数据，可以预填充到输入框
                    setTimeout(() => {
                        const jsonInput = document.getElementById('jsonInput');
                        if (jsonInput && action.payload) {
                            try {
                                // 尝试解析并格式化传入的数据
                                const parsed = JSON.parse(action.payload);
                                jsonInput.value = JSON.stringify(parsed, null, 2);
                            } catch (e) {
                                // 如果不是有效的JSON，直接设置
                                jsonInput.value = action.payload;
                            }
                        }
                    }, 100);
                }
            }
        }
    }
};

// 插件退出时的清理
window.utools && window.utools.onPluginOut(() => {
    console.log('JSON2Thrift plugin exited');
});

// 监听主窗口的一些事件
window.addEventListener('beforeunload', () => {
    // 插件关闭前的清理工作
    console.log('Plugin window is closing');
});

// 提供一些工具函数给主脚本使用
window.utoolsHelpers = {
    // 显示系统通知
    showNotification: (title, body) => {
        if (window.utools && window.utools.showNotification) {
            window.utools.showNotification({
                title: title,
                body: body
            });
        }
    },
    
    // 复制到剪贴板
    copyText: (text) => {
        if (window.utools && window.utools.copyText) {
            window.utools.copyText(text);
            return true;
        }
        return false;
    },
    
    // 隐藏插件窗口
    hideMainWindow: () => {
        if (window.utools && window.utools.hideMainWindow) {
            window.utools.hideMainWindow();
        }
    },
    
    // 获取当前剪贴板内容
    getClipboardText: () => {
        if (window.utools && window.utools.getCopyedText) {
            return window.utools.getCopyedText();
        }
        return null;
    }
};