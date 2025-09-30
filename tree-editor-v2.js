// 基于文本的Thrift IDL树形编辑器
class ThriftTreeEditorV2 {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.thriftText = '';
        this.parsedData = null;
        this.originalJson = null;
        this.modifications = new Map();
        this.namingStyles = {
        'camelCase': 'camelCase',
        'snake_case': 'snake_case',
        'PascalCase': 'PascalCase'
    };
        this.modifiers = ['optional', 'required', 'none'];
        
        // 检查容器元素是否存在
        if (!this.container) {
            console.error(`TreeEditor: 找不到ID为 '${containerId}' 的容器元素`);
            return;
        }
        
        this.init();
    }

    init() {
        // 再次检查容器是否存在
        if (!this.container) {
            console.error('TreeEditor: 容器元素不存在，无法初始化');
            return;
        }
        
        this.container.className = 'thrift-tree-container';
        this.container.innerHTML = `
            <div class="tree-toolbar">
                <button class="btn btn-sm" onclick="window.treeEditorV2 && window.treeEditorV2.resetChanges()" title="重置所有修改">重置</button>
            </div>
            <div class="tree-content" id="treeContent"></div>
        `;
    }

    // 从JSON加载数据并生成基础Thrift
    loadFromJson(jsonData) {
        this.originalJson = jsonData;
        this.thriftText = this.jsonToThrift(jsonData);
        this.parsedData = this.parseThriftText(this.thriftText);
        this.renderTree();
    }

    // 从文本加载Thrift
    loadFromThrift(thriftText) {
        this.thriftText = thriftText;
        this.parsedData = this.parseThriftText(thriftText);
        this.renderTree();
    }

    // JSON转Thrift
    jsonToThrift(jsonData, structName = 'Root') {
        const structs = [];
        // 初始化结构体跟踪
        this.processedStructs = new Set();
        this.generateStructsFromJson(jsonData, structName, structs);
        return structs.map(s => this.formatStructDefinition(s)).join('\n\n');
    }

    generateStructsFromJson(jsonData, structName, structs) {
        if (Array.isArray(jsonData)) {
            if (jsonData.length > 0 && typeof jsonData[0] === 'object' && jsonData[0] !== null) {
                const merged = this.mergeArrayObjects(jsonData);
                this.generateStructFromObject(merged, structName, structs);
            }
        } else if (typeof jsonData === 'object' && jsonData !== null) {
            this.generateStructFromObject(jsonData, structName, structs);
        }
    }

    generateStructFromObject(obj, structName, structs) {
        // 检查是否已经处理过这个结构体
        if (this.processedStructs && this.processedStructs.has(structName)) {
            return;
        }

        const struct = {
            name: structName,
            fields: []
        };

        let index = 1;
        for (const [key, value] of Object.entries(obj)) {
            const fieldType = this.inferThriftType(value, key, structs);
            const originalName = key;
            const currentName = this.getModifiedName(`${structName}.${key}`) || key;
            const modifier = this.getModifiedModifier(`${structName}.${key}`) || 'optional';

            struct.fields.push({
                index: index,
                originalName: originalName,
                name: currentName,
                type: fieldType,
                modifier: modifier,
                path: `${structName}.${key}`,
                children: [],
                isNested: typeof value === 'object' && value !== null && !Array.isArray(value),
                isArray: Array.isArray(value)
            });
            index++;
        }

        structs.push(struct);
        
        // 标记为已处理
        if (this.processedStructs) {
            this.processedStructs.add(structName);
        }

        // 处理嵌套结构
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const nestedName = this.generateUniqueStructName(key, value);
                this.generateStructFromObject(value, nestedName, structs);
            } else if (Array.isArray(value) && value.length > 0) {
                // 检查数组中是否有对象元素
                const hasObjectElements = value.some(item => 
                    typeof item === 'object' && item !== null && !Array.isArray(item)
                );
                
                if (hasObjectElements) {
                    const merged = this.mergeArrayObjects(value);
                    const nestedName = `${this.capitalizeFirst(key)}Item`;
                    this.generateStructFromObject(merged, nestedName, structs);
                }
            }
        }
    }

    // 解析Thrift文本为结构化数据
    parseThriftText(thriftText) {
        const structs = [];
        const lines = thriftText.split('\n');
        let currentStruct = null;
        let inStruct = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('struct')) {
                const match = trimmed.match(/struct\s+(\w+)\s*\{/);
                if (match) {
                    currentStruct = {
                        name: match[1],
                        fields: []
                    };
                    structs.push(currentStruct);
                    inStruct = true;
                }
            } else if (trimmed === '}' && inStruct) {
                inStruct = false;
                currentStruct = null;
            } else if (inStruct && trimmed.includes(':')) {
                // 更灵活的匹配模式，支持可选修饰词
                const match = trimmed.match(/(\d+):\s*(?:(\w+)\s+)?(\w+)\s+(\w+);/);
                if (match) {
                    const [, index, modifier, type, name] = match;
                    const originalName = name;
                    const currentName = this.getModifiedName(`${currentStruct.name}.${name}`) || name;
                    const currentModifier = this.getModifiedModifier(`${currentStruct.name}.${name}`) || (modifier || 'none');

                    currentStruct.fields.push({
                        index: parseInt(index),
                        originalName: originalName,
                        name: currentName,
                        type: type,
                        modifier: currentModifier,
                        path: `${currentStruct.name}.${name}`,
                        children: [],
                        isNested: type.startsWith('struct') || type.startsWith('list<'),
                        isArray: type.startsWith('list<')
                    });
                }
            }
        }

        return structs;
    }

    // 渲染树形结构
    renderTree() {
        if (!this.container) {
            console.error('TreeEditor: 容器不存在，无法渲染树形结构');
            return;
        }
        
        const content = document.getElementById('treeContent');
        if (!content) {
            console.error('TreeEditor: 找不到treeContent元素');
            return;
        }
        
        content.innerHTML = '';
        
        if (this.parsedData && this.parsedData.length > 0) {
            this.parsedData.forEach(struct => {
                const structElement = this.createStructElement(struct);
                content.appendChild(structElement);
            });
        }
    }

    createStructElement(struct) {
        const div = document.createElement('div');
        div.className = 'tree-node';
        
        const header = document.createElement('div');
        header.className = 'tree-node-header';
        header.innerHTML = `
            <span class="struct-name">${struct.name}</span>
            <span class="struct-type">struct</span>
        `;
        div.appendChild(header);

        const fieldsContainer = document.createElement('div');
        fieldsContainer.className = 'fields-container';
        
        struct.fields.forEach(field => {
            const fieldElement = this.createFieldElement(field);
            fieldsContainer.appendChild(fieldElement);
        });
        
        div.appendChild(fieldsContainer);
        return div;
    }

    createFieldElement(field) {
        const div = document.createElement('div');
        div.className = 'field-node';
        div.dataset.path = field.path;

        const currentName = this.getModifiedName(field.path) || field.name;
        const currentModifier = this.getModifiedModifier(field.path) || field.modifier;

        // 生成命名风格预览
        const currentStyle = this.detectCurrentStyle(field.originalName);
        const namingOptions = Object.entries(this.namingStyles).map(([key, label]) => {
            const previewName = this.applyNamingStyle(field.originalName, key);
            return `<option value="${key}" ${key === currentStyle ? 'selected' : ''}>${label} (${previewName})</option>`;
        }).join('');

        div.innerHTML = `
            <div class="field-row">
                <span class="field-index">${field.index}</span>
                <select class="modifier-select" data-path="${field.path}" data-type="modifier">
                    ${this.modifiers.map(mod => 
                        `<option value="${mod}" ${mod === currentModifier ? 'selected' : ''}>${mod || 'none'}</option>`
                    ).join('')}
                </select>
                <div class="field-name-container">
                    <input type="text" class="field-name-input" data-path="${field.path}" 
                           value="${currentName}" placeholder="${field.originalName}">
                    <select class="naming-select-inline" data-path="${field.path}" data-type="naming">
                        ${namingOptions}
                    </select>
                </div>
                <span class="field-type">${field.type}</span>
            </div>
        `;

        this.setupEventListeners(div, field);
        return div;
    }

    setupEventListeners(div, field) {
        const nameInput = div.querySelector('.field-name-input');
        const modifierSelect = div.querySelector('.modifier-select');
        const namingSelect = div.querySelector('.naming-select-inline');

        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.setModifiedName(field.path, e.target.value);
                this.updateNamingPreview(field.path, field.originalName, e.target.value);
                this.autoSave();
            });
        }

        if (modifierSelect) {
            modifierSelect.addEventListener('change', (e) => {
                this.setModifiedModifier(field.path, e.target.value);
                this.autoSave();
            });
        }

        if (namingSelect) {
            namingSelect.addEventListener('change', (e) => {
                const newName = this.applyNamingStyle(field.originalName, e.target.value);
                nameInput.value = newName;
                this.setModifiedName(field.path, newName);
                this.autoSave();
            });
        }
    }

    // 同步到文本
    syncToText() {
        const updatedThrift = this.generateUpdatedThrift();
        if (window.parentApp) {
            window.parentApp.updateThriftOutput(updatedThrift);
        }
    }

    // 格式化结构体定义
    formatStructDefinition(struct) {
        let result = `struct ${struct.name} {\n`;
        struct.fields.forEach(field => {
            const name = this.getModifiedName(field.path) || field.name;
            const modifier = this.getModifiedModifier(field.path) || field.modifier;
            let modifierText = '';
            
            if (modifier && modifier !== '' && modifier !== 'none') {
                modifierText = modifier + ' ';
            }
            
            result += `  ${field.index}: ${modifierText}${field.type} ${name};\n`;
        });
        result += '}';
        return result;
    }

    // 自动保存到文本
    autoSave() {
        const updatedThrift = this.generateUpdatedThrift();
        if (window.parentApp) {
            window.parentApp.updateThriftOutput(updatedThrift);
        }
    }

    // 简化状态管理方法
    setModifiedName(path, name) {
        this.modifications.set(`${path}_name`, name);
        this.autoSave();
    }

    setModifiedModifier(path, modifier) {
        this.modifications.set(`${path}_modifier`, modifier);
        this.autoSave();
    }

    resetChanges() {
        this.modifications.clear();
        this.renderTree();
        this.autoSave();
    }

    // 应用命名风格
    applyNamingStyle(name, style) {
        if (!name) return '';
        
        switch (style) {
            case 'camelCase':
                return name.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
                          .replace(/_([A-Z])/g, (g) => g[1])
                          .replace(/^([A-Z]+)_/, (m) => m.toLowerCase());
            case 'snake_case':
                return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            case 'PascalCase':
                return name.charAt(0).toUpperCase() + 
                       name.slice(1).replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            case 'kebab-case':
                return name.replace(/_/g, '-').toLowerCase();
            default:
                return name;
        }
    }

    // 检测当前命名风格
    detectCurrentStyle(name) {
        if (!name) return 'camelCase';
        
        // 检测snake_case
        if (name.includes('_')) {
            return 'snake_case';
        }
        
        // 检测PascalCase
        if (name[0] === name[0].toUpperCase() && /[a-z]/.test(name.slice(1))) {
            return 'PascalCase';
        }
        
        // 检测camelCase (首字母小写，包含大写字母)
        if (/[A-Z]/.test(name) && name[0] === name[0].toLowerCase()) {
            return 'camelCase';
        }
        
        // 全小写默认为camelCase
        if (name === name.toLowerCase()) {
            return 'camelCase';
        }
        
        // 其他情况返回camelCase
        return 'camelCase';
    }

    generateUpdatedThrift() {
        let result = '';
        
        if (this.parsedData) {
            this.parsedData.forEach(struct => {
                result += this.formatStructDefinition(struct) + '\n\n';
            });
        }
        
        return result.trim();
    }

    // 工具方法
    mergeArrayObjects(array) {
        if (!Array.isArray(array) || array.length === 0) {
            return {};
        }
        
        const merged = {};
        
        for (const obj of array) {
            if (typeof obj === 'object' && obj !== null) {
                for (const [key, value] of Object.entries(obj)) {
                    if (!(key in merged)) {
                        merged[key] = value;
                    } else if (merged[key] == null && value != null) {
                        merged[key] = value;
                    }
                }
            }
        }
        
        return merged;
    }

    inferThriftType(value, fieldName, structs) {
        if (value === null || value === undefined) return 'string';
        
        switch (typeof value) {
            case 'boolean': return 'bool';
            case 'number': return Number.isInteger(value) ? 'i64' : 'double';
            case 'string': return 'string';
            case 'object':
                if (Array.isArray(value)) {
                    if (value.length === 0) return 'list<string>';
                    
                    // 检查数组元素是否为对象
                    const hasObjectElements = value.some(item => 
                        typeof item === 'object' && item !== null && !Array.isArray(item)
                    );
                    
                    if (hasObjectElements) {
                        // 为数组元素生成特殊的结构体名称
                        const arrayElementName = fieldName ? `${this.capitalizeFirst(fieldName)}Item` : 'ArrayItem';
                        return `list<${arrayElementName}>`;
                    } else {
                        // 非对象数组，使用第一个元素的类型
                        const elementType = this.inferThriftType(value[0], fieldName, structs);
                        return `list<${elementType}>`;
                    }
                } else {
                    // 只返回结构体名称，不在这里生成结构体
                    // 结构体的生成由generateStructFromObject统一处理
                    return this.generateUniqueStructName(fieldName, value);
                }
            default:
                return 'string';
        }
    }

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // 生成唯一且描述性的结构体名称
    generateUniqueStructName(fieldName, obj) {
        if (!fieldName) {
            fieldName = 'Generated';
        }
        
        // 基础名称
        let baseName = this.capitalizeFirst(fieldName);
        
        // 检查是否已存在相同结构的结构体
        if (this.processedStructs) {
            for (const existingName of this.processedStructs) {
                if (this.isSameStructure(existingName, obj)) {
                    return existingName;
                }
            }
        }
        
        // 如果没有冲突，直接返回基础名称
        if (!this.processedStructs || !this.processedStructs.has(baseName)) {
            return baseName;
        }
        
        // 如果有冲突，尝试添加关键字段信息
        const keyFields = this.getKeyFields(obj);
        if (keyFields.length > 0) {
            const descriptiveName = baseName + keyFields.map(f => this.capitalizeFirst(f)).join('');
            if (!this.processedStructs.has(descriptiveName)) {
                return descriptiveName;
            }
        }
        
        // 最后使用数字后缀
        let counter = 1;
        let uniqueName = `${baseName}${counter}`;
        while (this.processedStructs && this.processedStructs.has(uniqueName)) {
            counter++;
            uniqueName = `${baseName}${counter}`;
        }
        
        return uniqueName;
    }

    // 检查两个对象是否具有相同的结构
    isSameStructure(structName, obj) {
        // 这里简化实现，实际应用中可以更复杂
        if (!this.processedStructs || !this.processedStructs.has(structName)) {
            return false;
        }
        
        // 简单的字段数量和名称比较
        const objKeys = Object.keys(obj).sort();
        // 这里需要从已处理的结构体中获取字段信息进行比较
        // 为简化，暂时返回false，让每个结构体都有唯一名称
        return false;
    }

    // 提取对象的关键字段用于命名
    getKeyFields(obj) {
        const keys = Object.keys(obj);
        const keyFields = [];
        
        // 优先选择常见的标识字段
        const identifierFields = ['id', 'name', 'type', 'code', 'key'];
        for (const field of identifierFields) {
            if (keys.includes(field)) {
                keyFields.push(field);
                break; // 只取第一个找到的标识字段
            }
        }
        
        // 如果没有标识字段，取前两个字段
        if (keyFields.length === 0 && keys.length > 0) {
            keyFields.push(...keys.slice(0, Math.min(2, keys.length)));
        }
        
        return keyFields;
    }

    // 状态管理
    getModifiedName(path) {
        return this.modifications.get(`${path}_name`);
    }

    setModifiedName(path, name) {
        this.modifications.set(`${path}_name`, name);
    }

    getModifiedModifier(path) {
        return this.modifications.get(`${path}_modifier`);
    }

    setModifiedModifier(path, modifier) {
        this.modifications.set(`${path}_modifier`, modifier);
    }

    resetChanges() {
        this.modifications.clear();
        this.renderTree();
    }

    updateNamingPreview(fieldPath, originalName, currentName) {
        const select = document.querySelector(`select[data-path="${fieldPath}"][data-type="naming"]`);
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '';
        
        Object.entries(this.namingStyles).forEach(([key, label]) => {
            const previewName = this.applyNamingStyle(originalName, key);
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${label} (${previewName})`;
            option.selected = (key === currentValue) || (key === 'original' && currentName === originalName);
            select.appendChild(option);
        });
    }
}

// 初始化新的树形编辑器
let treeEditorV2;