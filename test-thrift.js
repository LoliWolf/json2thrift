// 测试完整的Json2Thrift转换功能
// 需要在浏览器环境中运行，这里模拟核心逻辑

const testData = {
  "users": [
    {
      "id": 1,
      "name": "张三",
      "email": "zhangsan@example.com",
      "age": 25
    },
    {
      "id": 2,
      "name": "李四",
      "phone": "13800138000",
      "department": "技术部"
    },
    {
      "id": 3,
      "name": "王五",
      "email": "wangwu@example.com",
      "phone": "13900139000",
      "age": 30,
      "isManager": true
    }
  ]
};

// 模拟Json2Thrift类的核心方法
class Json2ThriftTest {
    constructor() {
        this.structDefinitions = new Map();
        this.structCounter = 0;
    }

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
                    } else {
                        // 处理字段冲突，优先选择非null值
                        if (merged[key] === null || merged[key] === undefined) {
                            merged[key] = value;
                        } else if (value !== null && value !== undefined) {
                            // 类型冲突处理：优先选择更复杂的类型
                            const mergedType = typeof merged[key];
                            const valueType = typeof value;
                            
                            if (mergedType === 'object' && valueType !== 'object') {
                                // 保持对象类型
                            } else if (mergedType !== 'object' && valueType === 'object') {
                                merged[key] = value;
                            } else if (Array.isArray(merged[key]) && !Array.isArray(value)) {
                                // 保持数组类型
                            } else if (!Array.isArray(merged[key]) && Array.isArray(value)) {
                                merged[key] = value;
                            } else if (mergedType === 'string' && valueType === 'number') {
                                // 保持字符串类型
                            } else if (mergedType === 'number' && valueType === 'string') {
                                merged[key] = value;
                            }
                        }
                    }
                }
            }
        }
        
        return merged;
    }

    getThriftType(value, fieldName = '') {
        if (value === null || value === undefined) {
            return 'string';
        }

        const type = typeof value;
        
        switch (type) {
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
                    if (typeof value[0] === 'object' && value[0] !== null && !Array.isArray(value[0])) {
                        // 合并数组中所有对象的字段
                        const mergedObj = this.mergeArrayObjects(value);
                        const elementType = this.getThriftType(mergedObj, fieldName + 'Item');
                        return `list<${elementType}>`;
                    } else {
                        // 非对象数组，使用第一个元素的类型
                        const elementType = this.getThriftType(value[0], fieldName + 'Item');
                        return `list<${elementType}>`;
                    }
                } else {
                    // 对象类型，创建struct定义
                    const structName = fieldName ? this.capitalize(fieldName) : `Struct${++this.structCounter}`;
                    
                    if (!this.structDefinitions.has(structName)) {
                        let structDef = `struct ${structName} {\n`;
                        let fieldIndex = 1;
                        
                        for (const [key, val] of Object.entries(value)) {
                            const fieldType = this.getThriftType(val, key);
                            structDef += `    ${fieldIndex}: optional ${fieldType} ${key};\n`;
                            fieldIndex++;
                        }
                        
                        structDef += '}';
                        this.structDefinitions.set(structName, structDef);
                    }
                    
                    return structName;
                }
            default:
                return 'string';
        }
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    convertToThrift(jsonData) {
        this.structDefinitions.clear();
        this.structCounter = 0;

        let result = '';
        
        if (Array.isArray(jsonData)) {
            // 如果根是数组，合并所有对象的字段
            const mergedObj = this.mergeArrayObjects(jsonData);
            const rootType = this.getThriftType(mergedObj, 'Root');
            result = `// Root type: list<${rootType}>\n\n`;
        } else {
            const rootType = this.getThriftType(jsonData, 'Root');
            result = `// Root type: ${rootType}\n\n`;
        }

        // 添加所有struct定义
        for (const structDef of this.structDefinitions.values()) {
            result += structDef + '\n\n';
        }

        return result.trim();
    }
}

// 测试转换
console.log('测试数据:');
console.log(JSON.stringify(testData, null, 2));

console.log('\n=== 转换结果 ===');
const converter = new Json2ThriftTest();
const thriftResult = converter.convertToThrift(testData.users);
console.log(thriftResult);

console.log('\n=== 验证要点 ===');
console.log('✓ 应该包含所有字段: id, name, email, age, phone, department, isManager');
console.log('✓ 字段类型应该正确映射');
console.log('✓ 所有字段都应该是optional');