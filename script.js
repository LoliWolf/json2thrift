class Json2Thrift {
    constructor() {
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        const elements = {
            jsonInput: 'jsonInput',
            thriftOutput: 'thriftOutput',
            formatBtn: 'formatBtn',
            generateBtn: 'generateBtn',
            copyBtn: 'copyBtn',
            clearBtn: 'clearBtn',
            toast: 'toast',
            treeModeBtn: 'treeModeBtn',
            textModeBtn: 'textModeBtn',
            treeEditorContainer: 'treeEditor'
        };

        const missingElements = [];
        
        for (const [property, elementId] of Object.entries(elements)) {
            const element = document.getElementById(elementId);
            if (!element) {
                missingElements.push(elementId);
            }
            this[property] = element;
        }

        if (missingElements.length > 0) {
            console.error('以下元素未找到:', missingElements.join(', '));
        }
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
        // 初始化全局结构体定义映射和依赖关系
        this.structDefinitions = new Map();
        this.processedStructs = new Set(); // 跟踪已处理的结构体，避免重复
        this.structDependencies = new Map(); // 跟踪结构体依赖关系
        
        let thriftCode = '';

        // 递归处理对象，生成结构体定义
        const processObject = (obj, name) => {
            // 避免重复处理相同的结构体
            if (this.processedStructs.has(name)) {
                return name;
            }
            
            this.processedStructs.add(name);
            let fields = [];
            let dependencies = new Set(); // 当前结构体的依赖
            let localFieldIndex = 1;

            for (const [key, value] of Object.entries(obj)) {
                const fieldType = this.getThriftType(value, key);
                fields.push(`  ${localFieldIndex}: optional ${fieldType} ${key};`);
                
                // 收集依赖关系
                const deps = this.extractDependencies(fieldType);
                deps.forEach(dep => dependencies.add(dep));
                
                localFieldIndex++;
            }

            const structDef = `struct ${name} {\n${fields.join('\n')}\n}`;
            this.structDefinitions.set(name, structDef);
            this.structDependencies.set(name, dependencies);
            return name;
        };

        // 处理根对象
        if (Array.isArray(obj)) {
            // 如果根是数组，分析数组元素类型
            if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null) {
                // 合并数组中所有对象的字段
                const mergedObject = this.mergeArrayObjects(obj);
                processObject(mergedObject, structName);
                thriftCode = this.generateOrderedThriftCode();
                thriftCode += `\n\n// Root type: list<${structName}>`;
            } else {
                const elementType = obj.length > 0 ? this.getThriftType(obj[0]) : 'string';
                thriftCode = `// Root type: list<${elementType}>`;
            }
        } else if (typeof obj === 'object' && obj !== null) {
            processObject(obj, structName);
            thriftCode = this.generateOrderedThriftCode();
        } else {
            thriftCode = `// Generated Thrift IDL\n\n// Root type: ${this.getThriftType(obj)}`;
        }

        return thriftCode;
    }

    // 从字段类型中提取依赖的结构体名称
    extractDependencies(fieldType) {
        const dependencies = new Set();
        
        // 处理 list<StructName> 格式
        const listMatch = fieldType.match(/list<(.+)>/);
        if (listMatch) {
            const innerType = listMatch[1];
            if (this.isCustomStruct(innerType)) {
                dependencies.add(innerType);
            }
        } else if (this.isCustomStruct(fieldType)) {
            // 直接的结构体类型
            dependencies.add(fieldType);
        }
        
        return dependencies;
    }

    // 判断是否为自定义结构体类型
    isCustomStruct(typeName) {
        const basicTypes = ['bool', 'i8', 'i16', 'i32', 'i64', 'double', 'string', 'binary'];
        return !basicTypes.includes(typeName) && !typeName.startsWith('list<') && !typeName.startsWith('set<') && !typeName.startsWith('map<');
    }

    // 生成按依赖关系排序的Thrift代码
    generateOrderedThriftCode() {
        const orderedStructs = this.topologicalSort();
        return orderedStructs.map(structName => this.structDefinitions.get(structName)).join('\n\n');
    }

    // 拓扑排序，确保依赖的结构体在使用前被定义
    topologicalSort() {
        const visited = new Set();
        const visiting = new Set();
        const result = [];

        const visit = (structName) => {
            if (visiting.has(structName)) {
                // 检测到循环依赖，跳过
                return;
            }
            if (visited.has(structName)) {
                return;
            }

            visiting.add(structName);
            
            // 先访问所有依赖
            const dependencies = this.structDependencies.get(structName) || new Set();
            dependencies.forEach(dep => {
                if (this.structDefinitions.has(dep)) {
                    visit(dep);
                }
            });

            visiting.delete(structName);
            visited.add(structName);
            result.push(structName);
        };

        // 访问所有结构体
        this.structDefinitions.forEach((_, structName) => {
            visit(structName);
        });

        return result;
    }

    getThriftType(value, fieldName = '') {
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
                        // 为数组元素生成特殊的结构体名称
                        const arrayElementName = fieldName ? `${this.capitalizeFirst(fieldName)}Item` : 'ArrayItem';
                        const elementType = this.getThriftType(mergedObject, arrayElementName);
                        return `list<${elementType}>`;
                    } else {
                        // 非对象数组，使用第一个元素的类型
                        const elementType = this.getThriftType(value[0], fieldName);
                        return `list<${elementType}>`;
                    }
                } else {
                    // 嵌套对象，创建新的结构体
                    const structName = this.generateUniqueStructName(fieldName, value);
                    
                    // 确保structDefinitions已初始化
                    if (!this.structDefinitions) {
                        this.structDefinitions = new Map();
                    }
                    if (!this.processedStructs) {
                        this.processedStructs = new Set();
                    }
                    
                    // 避免重复处理相同的结构体
                    if (!this.structDefinitions.has(structName) && !this.processedStructs.has(structName)) {
                        this.processedStructs.add(structName);
                        let fields = [];
                        let dependencies = new Set(); // 当前结构体的依赖
                        let localFieldIndex = 1;
                        
                        for (const [key, val] of Object.entries(value)) {
                            const fieldType = this.getThriftType(val, key);
                            fields.push(`  ${localFieldIndex}: optional ${fieldType} ${key};`);
                            
                            // 收集依赖关系
                            const deps = this.extractDependencies(fieldType);
                            deps.forEach(dep => dependencies.add(dep));
                            
                            localFieldIndex++;
                        }
                        
                        const structDef = `struct ${structName} {\n${fields.join('\n')}\n}`;
                        this.structDefinitions.set(structName, structDef);
                        
                        // 确保structDependencies已初始化
                        if (!this.structDependencies) {
                            this.structDependencies = new Map();
                        }
                        this.structDependencies.set(structName, dependencies);
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

    // 生成唯一的结构体名称，避免命名冲突
    generateUniqueStructName(fieldName, obj) {
        // 基础名称
        let baseName = this.capitalizeFirst(fieldName) || 'NestedStruct';
        
        // 如果名称已存在，尝试基于对象内容生成更具描述性的名称
        if (this.structDefinitions && this.structDefinitions.has(baseName)) {
            // 检查是否是相同的结构体（字段相同）
            if (this.isSameStructure(baseName, obj)) {
                return baseName; // 复用相同的结构体
            }
            
            // 尝试基于对象的关键字段生成更具描述性的名称
            const keyFields = this.getKeyFields(obj);
            if (keyFields.length > 0) {
                const descriptiveName = baseName + keyFields.map(f => this.capitalizeFirst(f)).join('');
                if (!this.structDefinitions.has(descriptiveName)) {
                    return descriptiveName;
                }
            }
            
            // 如果仍然冲突，添加数字后缀
            let counter = 1;
            let uniqueName = `${baseName}${counter}`;
            while (this.structDefinitions && this.structDefinitions.has(uniqueName)) {
                counter++;
                uniqueName = `${baseName}${counter}`;
            }
            return uniqueName;
        }
        
        return baseName;
    }

    // 检查两个结构体是否具有相同的结构
    isSameStructure(structName, obj) {
        if (!this.structDefinitions || !this.structDefinitions.has(structName)) {
            return false;
        }
        
        const existingStruct = this.structDefinitions.get(structName);
        const objKeys = Object.keys(obj).sort();
        
        // 从现有结构体定义中提取字段名
        const fieldMatches = existingStruct.match(/\d+:\s*optional\s+\w+\s+(\w+);/g);
        if (!fieldMatches) return false;
        
        const existingFields = fieldMatches.map(match => {
            const fieldMatch = match.match(/\d+:\s*optional\s+\w+\s+(\w+);/);
            return fieldMatch ? fieldMatch[1] : null;
        }).filter(Boolean).sort();
        
        return JSON.stringify(objKeys) === JSON.stringify(existingFields);
    }

    // 获取对象的关键字段（用于生成描述性名称）
    getKeyFields(obj) {
        const keys = Object.keys(obj);
        const keyFields = [];
        
        // 优先选择常见的标识字段
        const identifierFields = ['id', 'name', 'type', 'code', 'title'];
        for (const field of identifierFields) {
            if (keys.includes(field)) {
                keyFields.push(field);
                break; // 只取第一个找到的标识字段
            }
        }
        
        // 如果没有标识字段，选择前2个字段
        if (keyFields.length === 0 && keys.length > 0) {
            keyFields.push(...keys.slice(0, Math.min(2, keys.length)));
        }
        
        return keyFields;
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
        if (!this.toast) {
            console.error('Toast元素不存在，无法显示消息:', message);
            return;
        }
        
        this.toast.textContent = message;
        this.toast.className = `toast ${type}`;
        this.toast.classList.add('show');

        setTimeout(() => {
            if (this.toast) {
                this.toast.classList.remove('show');
            }
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new Json2Thrift();
    // 默认显示文本预览
    app.switchMode('text');
});

// uTools API 集成
if (typeof window.utools !== 'undefined') {
    window.utools.onPluginEnter(({ code, type, payload }) => {
        console.log('Plugin entered with:', { code, type, payload });
    });
}