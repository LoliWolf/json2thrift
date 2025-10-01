# JSON转Thrift IDL

一个功能强大的 uTools 插件，提供 JSON 数据到 Thrift IDL 结构体定义的智能转换，支持可视化编辑和多种高级功能。

## ✨ 核心特性

### 🔄 智能转换引擎
- **精准类型推断**：自动识别并转换 JSON 数据类型为对应的 Thrift 类型
- **结构体依赖分析**：智能处理嵌套对象，自动生成依赖的结构体定义
- **拓扑排序**：确保结构体定义顺序正确，避免依赖问题
- **数组对象合并**：智能合并数组中的对象结构，生成统一的结构体定义

### 🎨 双模式编辑器
- **文本预览模式**：传统的文本编辑器，支持直接编辑生成的 Thrift IDL
- **树形编辑模式**：可视化的树形结构编辑器，提供直观的字段管理界面
- **实时同步**：两种模式之间的数据实时同步，无缝切换

### ⚙️ 高级编辑功能
- **字段修饰符管理**：支持 `optional`、`required`、`none` 三种字段修饰符
- **命名风格转换**：支持 `camelCase`、`snake_case`、`PascalCase` 三种命名风格
- **字段重命名**：在树形模式下可直接重命名字段
- **结构体重命名**：支持自定义结构体名称

### 📱 自适应界面
- **响应式布局**：根据窗口大小自动调整界面布局
- **多尺寸适配**：支持小屏、中屏、大屏三种尺寸模式
- **uTools 优化**：专门针对 uTools 环境进行界面优化
- **触摸友好**：支持触摸设备操作

### 🛠️ 实用工具
- **JSON 格式化**：一键格式化输入的 JSON 数据
- **一键复制**：快速复制生成的 Thrift IDL 代码
- **清空重置**：快速清空所有输入和输出内容
- **错误提示**：友好的错误提示和操作反馈

## 🔧 类型转换规则

| JSON 类型 | Thrift 类型 | 说明 |
|-----------|-------------|------|
| `string` | `string` | 字符串类型 |
| `number` (整数) | `i64` | 64位整数 |
| `number` (小数) | `double` | 双精度浮点数 |
| `boolean` | `bool` | 布尔类型 |
| `array` | `list<T>` | 列表类型，T为元素类型 |
| `object` | 自定义结构体 | 生成对应的结构体定义 |
| `null` | `string` | 默认为可选字符串字段 |

## 📖 使用示例

### 基础示例

**输入 JSON：**
```json
{
  "userId": 12345,
  "userName": "张三",
  "isActive": true,
  "score": 98.5,
  "tags": ["student", "active"],
  "profile": {
    "age": 20,
    "email": "zhangsan@example.com"
  }
}
```

**生成的 Thrift IDL：**
```thrift
// Generated Thrift IDL

struct Profile {
  1: optional i64 age;
  2: optional string email;
}

struct GeneratedStruct {
  1: optional i64 userId;
  2: optional string userName;
  3: optional bool isActive;
  4: optional double score;
  5: optional list<string> tags;
  6: optional Profile profile;
}
```

### 复杂嵌套示例

**输入 JSON：**
```json
{
  "order": {
    "orderId": "ORD-001",
    "items": [
      {
        "productId": "P001",
        "name": "商品A",
        "price": 99.99,
        "quantity": 2
      }
    ],
    "customer": {
      "customerId": "C001",
      "name": "客户A",
      "addresses": [
        {
          "type": "home",
          "street": "某某街道123号",
          "city": "北京"
        }
      ]
    }
  }
}
```

**生成的 Thrift IDL：**
```thrift
// Generated Thrift IDL

struct Address {
  1: optional string type;
  2: optional string street;
  3: optional string city;
}

struct Customer {
  1: optional string customerId;
  2: optional string name;
  3: optional list<Address> addresses;
}

struct Item {
  1: optional string productId;
  2: optional string name;
  3: optional double price;
  4: optional i64 quantity;
}

struct Order {
  1: optional string orderId;
  2: optional list<Item> items;
  3: optional Customer customer;
}

struct GeneratedStruct {
  1: optional Order order;
}
```

## 🚀 快速开始

### 在 uTools 中使用

1. 在 uTools 中搜索 "json2thrift" 或 "JSON转Thrift"
2. 粘贴或输入您的 JSON 数据
3. 点击 "生成Thrift" 按钮
4. 在右侧查看生成的 Thrift IDL
5. 可选择切换到树形编辑模式进行进一步编辑
6. 点击 "复制代码" 获取最终结果

### 树形编辑模式使用

1. 生成基础 Thrift IDL 后，点击 "树形编辑" 按钮
2. 在树形视图中可以：
   - 重命名字段和结构体
   - 修改字段修饰符（optional/required/none）
   - 应用不同的命名风格
3. 修改会实时反映到文本预览中
4. 切换回 "文本预览" 查看最终代码

## 🎯 高级功能

### 命名风格转换
- **camelCase**：驼峰命名法（如：userName）
- **snake_case**：下划线命名法（如：user_name）
- **PascalCase**：帕斯卡命名法（如：UserName）

### 字段修饰符
- **optional**：可选字段（默认）
- **required**：必需字段
- **none**：无修饰符

### 自适应布局
插件会根据窗口大小自动调整：
- **小屏模式**：简化界面，优化触摸操作
- **中屏模式**：平衡功能和空间利用
- **大屏模式**：完整功能展示

## 🔧 技术特性

- **零依赖**：纯 JavaScript 实现，无需额外依赖
- **高性能**：优化的解析算法，快速处理大型 JSON
- **内存友好**：智能的内存管理，避免内存泄漏
- **错误恢复**：健壮的错误处理机制
- **跨平台**：支持 Windows、macOS、Linux

## 📝 开发信息

- **版本**：1.0.0
- **作者**：Loli_Wolf
- **许可证**：MIT License
- **仓库**：https://github.com/LoliWolf/json2thrift.git

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目！

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。
