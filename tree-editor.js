// 树形结构Thrift IDL编辑器
class ThriftTreeEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.treeData = null;
        this.modifiedData = new Map(); // 存储用户修改
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
                <button class="btn btn-sm" onclick="window.treeEditor && window.treeEditor.applyChanges()">应用更改</button>
                <button class="btn btn-sm" onclick="window.treeEditor && window.treeEditor.resetChanges()">重置</button>
                <button class="btn btn-sm" onclick="window.treeEditor && window.treeEditor.exportThrift()">导出Thrift</button>
            </div>
            <div class="tree-content" id="treeContent"></div>
        `;
    }

    // 将JSON数据转换为树形结构
    loadFromJson(jsonData) {
        // 保存当前编辑状态
        const currentState = this.serializeState();
        
        // 重新解析树形结构
        this.treeData = this.parseJsonToTree(jsonData);
        
        // 应用之前的状态
        this.applyState(currentState);
        
        this.renderTree();
    }

    // 序列化当前状态
    serializeState() {
        const state = new Map();
        this.modifiedData.forEach((value, key) => {
            state.set(key, value);
        });
        return state;
    }

    // 应用状态
    applyState(state) {
        if (state && state instanceof Map) {
            state.forEach((value, key) => {
                this.modifiedData.set(key, value);
            });
        }
    }

    // 检查是否需要重新加载数据
    needsReload(jsonData) {
        if (!this.treeData) return true;
        
        // 简单比较JSON结构是否变化
        const newStructure = JSON.stringify(jsonData);
        const oldStructure = this.lastJsonStructure || '';
        return newStructure !== oldStructure;
    }

    // 解析JSON为树形结构
    parseJsonToTree(jsonData, parentPath = '', structName = 'Root') {
        const tree = {
            name: structName,
            type: 'struct',
            fields: [],
            children: [],
            path: parentPath || structName
        };

        if (Array.isArray(jsonData)) {
            if (jsonData.length > 0 && typeof jsonData[0] === 'object' && jsonData[0] !== null) {
                const mergedObject = this.mergeArrayObjects(jsonData);
                tree.fields = this.extractFields(mergedObject, tree.path);
            } else {
                tree.type = 'list';
                tree.elementType = jsonData.length > 0 ? this.inferType(jsonData[0]) : 'string';
            }
        } else if (typeof jsonData === 'object' && jsonData !== null) {
            tree.fields = this.extractFields(jsonData, tree.path);
        } else {
            tree.type = this.inferType(jsonData);
        }

        return tree;
    }

    // 提取字段信息
    extractFields(obj, parentPath) {
        const fields = [];
        let fieldIndex = 1;

        for (const [key, value] of Object.entries(obj)) {
            const fieldPath = `${parentPath}.${key}`;
            const field = {
                name: key,
                originalName: key,
                type: this.inferType(value),
                modifier: 'optional',
                index: fieldIndex,
                path: fieldPath,
                children: []
            };

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // 嵌套对象
                field.isNested = true;
                field.children = this.extractFields(value, fieldPath);
            } else if (Array.isArray(value) && value.length > 0 && 
                       typeof value[0] === 'object' && value[0] !== null) {
                // 对象数组
                field.isArray = true;
                const mergedObject = this.mergeArrayObjects(value);
                field.children = this.extractFields(mergedObject, fieldPath);
            }

            fields.push(field);
            fieldIndex++;
        }

        return fields;
    }

    // 推断类型
    inferType(value) {
        if (value === null || value === undefined) return 'string';
        
        switch (typeof value) {
            case 'boolean': return 'bool';
            case 'number': return Number.isInteger(value) ? 'i64' : 'double';
            case 'string': return 'string';
            case 'object':
                if (Array.isArray(value)) {
                    if (value.length === 0) return 'list<string>';
                    const elementType = this.inferType(value[0]);
                    return `list<${elementType}>`;
                }
                return 'struct';
            default:
                return 'string';
        }
    }

    // 合并数组对象
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

    // 渲染树形结构
    renderTree() {
        const content = document.getElementById('treeContent');
        content.innerHTML = '';
        
        if (this.treeData) {
            const treeElement = this.createTreeElement(this.treeData);
            content.appendChild(treeElement);
        }
    }

    // 创建树形元素
    createTreeElement(node, level = 0) {
        const div = document.createElement('div');
        div.className = 'tree-node';

        if (node.type === 'struct') {
            const header = document.createElement('div');
            header.className = 'tree-node-header';
            header.innerHTML = `
                <span class="struct-name">${node.name}</span>
                <span class="struct-type">struct</span>
            `;
            div.appendChild(header);

            if (node.fields && node.fields.length > 0) {
                const fieldsContainer = document.createElement('div');
                fieldsContainer.className = 'fields-container';
                
                node.fields.forEach(field => {
                    const fieldElement = this.createFieldElement(field, level + 1);
                    fieldsContainer.appendChild(fieldElement);
                });
                
                div.appendChild(fieldsContainer);
            }
        }

        return div;
    }

    // 创建字段元素
    createFieldElement(field, level) {
        const div = document.createElement('div');
        div.className = 'field-node';
        div.dataset.path = field.path;

        const currentName = this.getModifiedName(field.path) || field.name;
        const currentModifier = this.getModifiedModifier(field.path) || field.modifier;

        const hasChildren = field.children && field.children.length > 0;
        const isStructType = field.type === 'struct' || field.type.startsWith('list<struct');

        div.innerHTML = `
            <div class="field-row">
                <span class="field-index">${field.index}</span>
                <select class="modifier-select" data-path="${field.path}" data-type="modifier">
                    ${this.modifiers.map(mod => 
                        `<option value="${mod}" ${mod === currentModifier ? 'selected' : ''}>${mod || 'none'}</option>`
                    ).join('')}
                </select>
                <select class="naming-select" data-path="${field.path}" data-type="naming">
                    ${Object.entries(this.namingStyles).map(([key, label]) => 
                        `<option value="${key}">${label}</option>`
                    ).join('')}
                </select>
                <input type="text" class="field-name-input" data-path="${field.path}" 
                       value="${currentName}" placeholder="${field.originalName}">
                <span class="field-type">${field.type}</span>
                ${hasChildren || isStructType ? '<button class="toggle-btn" data-action="toggle">▶</button>' : ''}
            </div>
            <div class="field-children" style="display: none;">
                ${hasChildren ? this.renderChildren(field.children, level + 1) : ''}
            </div>
        `;

        // 设置事件监听
        this.setupEventListeners(div, field);
        
        return div;

        return div;
    }

    // 渲染子字段
    renderChildren(children, level) {
        const container = document.createElement('div');
        children.forEach(child => {
            const childElement = this.createFieldElement(child, level);
            container.appendChild(childElement);
        });
        return container.innerHTML;
    }

    // 改进事件处理
    setupEventListeners(div, field) {
        // 名称输入事件
        const nameInput = div.querySelector('.field-name-input');
        const modifierSelect = div.querySelector('.modifier-select');
        const namingSelect = div.querySelector('.naming-select');
        const toggleBtn = div.querySelector('.toggle-btn');

        if (nameInput) {
            nameInput.addEventListener('input', (e) => {
                this.setModifiedName(field.path, e.target.value);
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

        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                const children = div.querySelector('.field-children');
                const isExpanded = children.style.display !== 'none';
                
                children.style.display = isExpanded ? 'none' : 'block';
                e.target.textContent = isExpanded ? '▶' : '▼';
                e.target.classList.toggle('expanded', !isExpanded);
            });
        }
    }

    // 应用命名风格
    applyNamingStyle(name, style) {
        switch (style) {
            case 'camelCase':
                return name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            case 'snake_case':
                return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            case 'PascalCase':
                return name.charAt(0).toUpperCase() + name.slice(1).replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            case 'kebab-case':
                return name.replace(/_/g, '-').toLowerCase();
            default:
                return name;
        }
    }

    // 获取修改后的名称
    getModifiedName(path) {
        return this.modifiedData.get(`${path}_name`);
    }

    // 设置修改后的名称
    setModifiedName(path, name) {
        this.modifiedData.set(`${path}_name`, name);
    }

    // 获取修改后的修饰符
    getModifiedModifier(path) {
        return this.modifiedData.get(`${path}_modifier`);
    }

    // 设置修改后的修饰符
    setModifiedModifier(path, modifier) {
        this.modifiedData.set(`${path}_modifier`, modifier);
    }

    // 生成Thrift IDL
    generateThriftIDL() {
        if (!this.treeData) return '';
        
        const structs = [];
        this.generateStruct(this.treeData, structs);
        
        return structs.map(struct => this.formatStruct(struct)).join('\n\n');
    }

    // 生成结构体
    generateStruct(node, structs) {
        if (node.type === 'struct') {
            const struct = {
                name: node.name,
                fields: []
            };

            if (node.fields) {
                node.fields.forEach(field => {
                    const modifiedName = this.getModifiedName(field.path) || field.name;
                    const modifiedModifier = this.getModifiedModifier(field.path) || field.modifier;
                    
                    struct.fields.push({
                        index: field.index,
                        name: modifiedName,
                        type: field.type,
                        modifier: modifiedModifier
                    });

                    if (field.children && field.children.length > 0) {
                        const childStruct = {
                            name: this.capitalizeFirst(modifiedName),
                            fields: []
                        };
                        
                        field.children.forEach(child => {
                            const childModifiedName = this.getModifiedName(child.path) || child.name;
                            const childModifiedModifier = this.getModifiedModifier(child.path) || child.modifier;
                            
                            childStruct.fields.push({
                                index: child.index,
                                name: childModifiedName,
                                type: child.type,
                                modifier: childModifiedModifier
                            });
                        });
                        
                        structs.push(childStruct);
                    }
                });
            }

            structs.push(struct);
        }
    }

    // 格式化结构体
    formatStruct(struct) {
        const fields = struct.fields.map(field => 
            `  ${field.index}: ${field.modifier ? field.modifier + ' ' : ''}${field.type} ${field.name};`
        ).join('\n');
        
        return `struct ${struct.name} {\n${fields}\n}`;
    }

    // 首字母大写
    capitalizeFirst(str) {
        if (!str) return 'Default';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // 应用更改
    applyChanges() {
        const thriftIDL = this.generateThriftIDL();
        if (window.parentApp) {
            window.parentApp.updateThriftOutput(thriftIDL);
        }
    }

    // 重置更改
    resetChanges() {
        this.modifiedData.clear();
        this.renderTree();
    }

    // 导出Thrift
    exportThrift() {
        const thriftIDL = this.generateThriftIDL();
        const blob = new Blob([thriftIDL], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated.thrift';
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 初始化树形编辑器
let treeEditor;