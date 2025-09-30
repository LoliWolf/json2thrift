// 基于文本的Thrift IDL树形编辑器
class ThriftTreeEditorV2 {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.thriftText = '';
        this.parsedData = null;
        this.originalJson = null;
        this.modifications = new Map();
        this.namingStyles = {
            'original': '保持原样',
            'camelCase': 'camelCase',
            'snake_case': 'snake_case',
            'PascalCase': 'PascalCase',
            'kebab-case': 'kebab-case'
        };
        this.modifiers = ['optional', 'required', ''];
        this.init();
    }

    init() {
        this.container.className = 'thrift-tree-container';
        this.container.innerHTML = `
            <div class="tree-toolbar">
                <button class="btn btn-sm" onclick="window.treeEditorV2 && window.treeEditorV2.syncToText()">同步到文本</button>
                <button class="btn btn-sm" onclick="window.treeEditorV2 && window.treeEditorV2.resetChanges()">重置</button>
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

        // 处理嵌套结构
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const nestedName = this.capitalizeFirst(key);
                this.generateStructFromObject(value, nestedName, structs);
            } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                const merged = this.mergeArrayObjects(value);
                const nestedName = this.capitalizeFirst(key) + 'Item';
                this.generateStructFromObject(merged, nestedName, structs);
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
                const match = trimmed.match(/(\d+):\s*(\w+)?\s*(\w+)\s+(\w+);/);
                if (match) {
                    const [, index, modifier, type, name] = match;
                    const originalName = name;
                    const currentName = this.getModifiedName(`${currentStruct.name}.${name}`) || name;
                    const currentModifier = this.getModifiedModifier(`${currentStruct.name}.${name}`) || (modifier || 'optional');

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
        const content = document.getElementById('treeContent');
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
        const namingOptions = Object.entries(this.namingStyles).map(([key, label]) => {
            const previewName = this.applyNamingStyle(field.originalName, key);
            return `<option value="${key}" ${key === 'original' && currentName === field.originalName ? 'selected' : ''}>${label} (${previewName})</option>`;
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
            });
        }

        if (modifierSelect) {
            modifierSelect.addEventListener('change', (e) => {
                this.setModifiedModifier(field.path, e.target.value);
            });
        }

        if (namingSelect) {
            namingSelect.addEventListener('change', (e) => {
                const newName = this.applyNamingStyle(field.originalName, e.target.value);
                nameInput.value = newName;
                this.setModifiedName(field.path, newName);
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
            result += `  ${field.index}: ${modifier ? modifier + ' ' : ''}${field.type} ${name};\n`;
        });
        result += '}';
        return result;
    }

    // 应用命名风格
    applyNamingStyle(name, style) {
        if (!name) return '';
        
        switch (style) {
            case 'camelCase':
                return name.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
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

    generateUpdatedThrift() {
        let result = '';
        
        if (this.parsedData) {
            this.parsedData.forEach(struct => {
                result += this.formatStructDefinition(struct) + '\n\n';
            });
        }
        
        return result.trim();
    }

    formatStructDefinition(struct) {
        let result = `struct ${struct.name} {\n`;
        struct.fields.forEach(field => {
            const name = this.getModifiedName(field.path) || field.name;
            const modifier = this.getModifiedModifier(field.path) || field.modifier;
            result += `  ${field.index}: ${modifier ? modifier + ' ' : ''}${field.type} ${name};\n`;
        });
        result += '}';
        return result;
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
                    const elementType = this.inferThriftType(value[0], fieldName, structs);
                    return `list<${elementType}>`;
                } else {
                    const structName = this.capitalizeFirst(fieldName);
                    this.generateStructFromObject(value, structName, structs);
                    return structName;
                }
            default:
                return 'string';
        }
    }

    capitalizeFirst(str) {
        if (!str) return 'Default';
        return str.charAt(0).toUpperCase() + str.slice(1);
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