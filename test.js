// 测试字段合并功能
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

// 模拟Json2Thrift类的mergeArrayObjects方法
function mergeArrayObjects(array) {
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
                        } else {
                            // 其他情况保持第一个值
                        }
                    }
                }
            }
        }
    }
    
    return merged;
}

// 测试字段合并
console.log('原始数组:');
console.log(JSON.stringify(testData.users, null, 2));

console.log('\n合并后的字段:');
const merged = mergeArrayObjects(testData.users);
console.log(JSON.stringify(merged, null, 2));

console.log('\n预期包含的字段:');
console.log('- id (number)');
console.log('- name (string)');
console.log('- email (string)');
console.log('- age (number)');
console.log('- phone (string)');
console.log('- department (string)');
console.log('- isManager (boolean)');

console.log('\n实际合并的字段:');
Object.keys(merged).forEach(key => {
    console.log(`- ${key} (${typeof merged[key]}): ${JSON.stringify(merged[key])}`);
});