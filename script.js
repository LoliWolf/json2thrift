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
        this.toast = document.getElementById('toast');
    }

    bindEvents() {
        this.formatBtn.addEventListener('click', () => this.formatJson());
        this.generateBtn.addEventListener('click', () => this.generateThrift());
        this.copyBtn.addEventListener('click', () => this.copyToClipboard());
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
            const thriftIdl = this.convertToThrift(jsonObj);
            this.thriftOutput.value = thriftIdl;
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
                processObject(obj[0], structName);
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
                    const elementType = this.getThriftType(value[0], fieldName, structDefinitions);
                    return `list<${elementType}>`;
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

    capitalizeFirst(str) {
        if (!str) return 'Default';
        return str.split('_').map(part => {
            if (!part) return '';
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }).join('');
    }

    async copyToClipboard() {
        const text = this.thriftOutput.value;
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