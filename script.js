class Json2Thrift {
    constructor() {
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.jsonInput = document.getElementById('jsonInput');
        this.thriftOutput = document.getElementById('thriftOutput');
        this.formatBtn = document.getElementById('formatBtn');
        this.generateBtn = document.getElementById('generateBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.toast = document.getElementById('toast');
        this.treeModeBtn = document.getElementById('treeModeBtn');
        this.textModeBtn = document.getElementById('textModeBtn');
        this.treeEditorContainer = document.getElementById('treeEditor');
    }

    bindEvents() {
        this.formatBtn.addEventListener('click', () => this.formatJson());
        this.generateBtn.addEventListener('click', () => this.generateThrift());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        
        // 模式切换事件
        this.treeModeBtn.addEventListener('click', () => this.switchMode('tree'));
        this.textModeBtn.addEventListener('click', () => this.switchMode('text'));
    }

    formatJson() {
        try {
            const jsonText = this.jsonInput.value.trim();
            if (!jsonText) {
                this.showToast('请输入JSON数据', 'error');
                return;
            }

            const parsed = JSON.parse(jsonText);
            const formatted = JSON.stringify(parsed, null, 2);
            this.jsonInput.value = formatted;
            this.showToast('JSON格式化成功');
        } catch (error) {
            this.showToast('JSON格式错误: ' + error.message, 'error');
        }
    }

    generateThrift() {
        try {
            const jsonText = this.jsonInput.value.trim();
            if (!jsonText) {
                this.showToast('请输入JSON数据', 'error');
                return;
            }

            const jsonObj = JSON.parse(jsonText);
            
            // 始终生成基础Thrift文本
            const baseThrift = this.convertToThrift(jsonObj);
            this.thriftOutput.value = baseThrift;
            
            // 更新树形编辑器
            if (typeof window.treeEditorV2 !== 'undefined') {
                window.treeEditorV2.loadFromJson(jsonObj);
            }
            
            this.showToast('Thrift IDL生成成功');
        } catch (error) {
            this.showToast('生成失败: ' + error.message, 'error');
        }
    }

    convertToThrift(obj, structName = 'GeneratedStruct') {
        let thriftCode = '';
        let structDefinitions = new Map();
        let fieldIndex = 1;



        // 递归处理对象，生成结构体定义
        const processObject = (obj, name) => {
            let fields = [];
            let localFieldIndex = 1;

            for (const [key, value] of Object.entries(obj)) {
                const fieldType = this.getThriftType(value, key, structDefinitions);
                fields.push(`  ${localFieldIndex}: optional ${fieldType} ${key};`);
                localFieldIndex++;
            }

            const structDef = `struct ${name} {\n${fields.join('\n')}\n}`;
            structDefinitions.set(name, structDef);
            return name;
        };

        // 处理根对象
        if (Array.isArray(obj)) {
            // 如果根是数组，分析数组元素类型
            if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
                // 合并数组中所有对象的字段
                const mergedObject = this.mergeArrayObjects(obj);
                processObject(mergedObject, structName);
                thriftCode = Array.from(structDefinitions.values()).join('\n\n');
                thriftCode += `\n\n// Root type: list<${structName}>`;
            } else {
                const elementType = obj.length > 0 ? this.getThriftType(obj[0]) : 'string';
                thriftCode = `// Root type: list<${elementType}>`;
            }
        } else if (typeof obj === 'object' && obj !== null) {
            processObject(obj, structName);
            thriftCode = Array.from(structDefinitions.values()).join('\n\n');
        } else {
            thriftCode = `// Generated Thrift IDL\n\n// Root type: ${this.getThriftType(obj)}`;
        }

        return thriftCode;
    }

    getThriftType(value, fieldName = '', structDefinitions = new Map()) {
        if (value === null || value === undefined) {
            return 'string';
        }

        switch (typeof value) {
            case 'boolean':
                return 'bool';
            case 'number':
                return Number.isInteger(value) ? 'i64' : 'double';
            case 'string':
                return 'string';
            case 'object':
                if (Array.isArray(value)) {
                    if (value.length === 0) {
                        return 'list<string>';
                    }
                    
                    // 检查数组元素是否为对象
                    const hasObjectElements = value.some(item => 
                        typeof item === 'object' && item !== null && !Array.isArray(item)
                    );
                    
                    if (hasObjectElements) {
                        // 合并数组中所有对象的字段
                        const mergedObject = this.mergeArrayObjects(value);
                        const elementType = this.getThriftType(mergedObject, fieldName, structDefinitions);
                        return `list<${elementType}>`;
                    } else {
                        // 非对象数组，使用第一个元素的类型
                        const elementType = this.getThriftType(value[0], fieldName, structDefinitions);
                        return `list<${elementType}>`;
                    }
                } else {
                    // 嵌套对象，创建新的结构体
                    const structName = this.capitalizeFirst(fieldName);
                    if (!structDefinitions.has(structName)) {
                        let fields = [];
                        let localFieldIndex = 1;
                        
                        for (const [key, val] of Object.entries(value)) {
                            const fieldType = this.getThriftType(val, key, structDefinitions);
                            fields.push(`  ${localFieldIndex}: optional ${fieldType} ${key};`);
                            localFieldIndex++;
                        }
                        
                        const structDef = `struct ${structName} {\n${fields.join('\n')}\n}`;
                        structDefinitions.set(structName, structDef);
                    }
                    return structName;
                }
            default:
                return 'string';
        }
    }

    // 提取合并数组对象的逻辑为独立方法，供复用
    mergeArrayObjects(array) {
        const mergedObject = {};
        
        for (const item of array) {
            if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
                for (const [key, value] of Object.entries(item)) {
                    if (!mergedObject.hasOwnProperty(key)) {
                        mergedObject[key] = value;
                    } else {
                        // 如果字段已存在，选择更具代表性的值
                        // 优先选择非null、非undefined的值
                        if (mergedObject[key] == null && value != null) {
                            mergedObject[key] = value;
                        } else if (mergedObject[key] != null && value != null) {
                            // 如果两个值都不为null，选择类型更复杂的值
                            const currentType = typeof mergedObject[key];
                            const newType = typeof value;
                            
                            if (currentType === 'object' && newType !== 'object') {
                                // 保持对象类型
                            } else if (currentType !== 'object' && newType === 'object') {
                                mergedObject[key] = value;
                            } else if (Array.isArray(value) && !Array.isArray(mergedObject[key])) {
                                mergedObject[key] = value;
                            } else if (!Array.isArray(value) && Array.isArray(mergedObject[key])) {
                                // 保持数组类型
                            } else if (currentType === 'string' && newType === 'number') {
                                // 保持字符串类型，因为它更通用
                            } else if (currentType === 'number' && newType === 'string') {
                                mergedObject[key] = value; // 选择字符串类型
                            }
                        }
                    }
                }
            }
        }
        
        return mergedObject;
    }

    capitalizeFirst(str) {
        if (!str) return 'Default';
        return str.split('_').map(part => {
            if (!part) return '';
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }).join('');
    }

    switchMode(mode) {
        const treeEditorDiv = document.getElementById('treeEditor');
        const textOutput = document.getElementById('thriftOutput');
        
        if (mode === 'tree') {
            treeEditorDiv.style.display = 'block';
            textOutput.style.display = 'none';
            this.treeModeBtn.classList.add('active');
            this.textModeBtn.classList.remove('active');
            
            // 初始化新的树形编辑器
            if (typeof window.treeEditorV2 === 'undefined') {
                window.treeEditorV2 = new ThriftTreeEditorV2('treeEditor');
            }
            
            // 从当前文本加载到树形编辑器
            try {
                const jsonText = this.jsonInput.value.trim();
                if (jsonText) {
                    const jsonObj = JSON.parse(jsonText);
                    window.treeEditorV2.loadFromJson(jsonObj);
                } else if (this.thriftOutput.value.trim()) {
                    window.treeEditorV2.loadFromThrift(this.thriftOutput.value);
                }
            } catch (error) {
                console.log('等待有效数据...');
            }
        } else {
            treeEditorDiv.style.display = 'none';
            textOutput.style.display = 'block';
            this.treeModeBtn.classList.remove('active');
            this.textModeBtn.classList.add('active');
            
            // 树形编辑器的修改已实时同步到文本，无需额外操作
            // 文本预览始终显示最新的Thrift IDL
        }
    }

    // 覆盖clearAll方法以支持新的树形编辑器
    clearAll() {
        this.jsonInput.value = '';
        this.thriftOutput.value = '';
        if (typeof window.treeEditorV2 !== 'undefined') {
            window.treeEditorV2.resetChanges();
            document.getElementById('treeEditor').innerHTML = '';
        }
        this.showToast('已清空所有内容');
    }

    // 覆盖copyToClipboard方法以支持新的树形编辑器
    async copyToClipboard() {
        let text = this.thriftOutput.value;
        
        if (!text.trim()) {
            this.showToast('没有可复制的内容', 'error');
            return;
        }

        // 使用 uTools API 复制，提供更好的跨平台兼容性
        if (window.utoolsHelpers && window.utoolsHelpers.copyText(text)) {
            this.showToast('已复制到剪贴板');
        } else {
            // 如果 uTools API 不可用，则回退到 Web API
            try {
                await navigator.clipboard.writeText(text);
                this.showToast('已复制到剪贴板');
            } catch (error) {
                // 最终降级方案
                this.thriftOutput.select();
                document.execCommand('copy');
                this.showToast('已复制到剪贴板 (备用模式)');
            }
        }
    }

    showToast(message, type = 'success') {
        this.toast.textContent = message;
        this.toast.className = `toast ${type}`;
        this.toast.classList.add('show');

        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new Json2Thrift();
});

// uTools API 集成
if (typeof window.utools !== 'undefined') {
    window.utools.onPluginEnter(({ code, type, payload }) => {
        console.log('Plugin entered with:', { code, type, payload });
    });
}