# 树形结构Thrift IDL编辑器 - 新功能说明

## 🌳 树形编辑器功能特性

### 核心功能
- **树形递进结构展示**：清晰显示字段间的层级关系和依赖结构
- **实时编辑**：支持字段名称、修饰词、命名风格的实时修改
- **双向同步**：树形编辑器与文本预览模式无缝切换

### 字段编辑功能

#### 1. 修饰词选择器
- **位置**：每个字段行左侧的下拉菜单
- **选项**：
  - `optional`（默认）：可选字段
  - `required`：必填字段
  - `空`：无修饰词
- **实时生效**：选择后立即更新生成的IDL

#### 2. 命名风格切换
- **位置**：字段名称输入框左侧的下拉菜单
- **支持风格**：
  - 保持原样（默认）
  - camelCase：驼峰命名
  - snake_case：下划线命名
  - PascalCase：帕斯卡命名
  - kebab-case：短横线命名
- **智能转换**：自动将原始字段名转换为选定风格

#### 3. 手动重命名
- **位置**：字段名称输入框
- **完全自定义**：可输入任意合法的字段名
- **实时预览**：修改后立即在树形结构中显示

### 交互功能

#### 展开/折叠
- **触发方式**：点击字段右侧的 ▶/▼ 图标
- **支持层级**：无限层级嵌套结构
- **记忆状态**：保持用户设置的展开/折叠状态

#### 模式切换
- **树形编辑模式**：可视化编辑，适合复杂结构调整
- **文本预览模式**：传统文本展示，适合快速查看
- **一键切换**：顶部按钮无缝切换，保持数据同步

### 使用示例

#### 示例JSON输入
```json
{
  "user_id": 12345,
  "user_name": "张三",
  "is_active": true,
  "profile": {
    "age": 25,
    "email_address": "zhangsan@example.com",
    "address": {
      "city_name": "北京",
      "postal_code": "100000"
    }
  },
  "order_list": [
    {
      "order_id": "ORD-001",
      "total_amount": 299.99,
      "items": [
        {
          "product_id": "PROD-001",
          "quantity": 2,
          "unit_price": 149.99
        }
      ]
    }
  ]
}
```

#### 树形编辑器中的操作
1. **展开层级**：点击 `profile` 字段的 ▶ 图标展开嵌套结构
2. **修改修饰词**：将 `user_id` 的修饰词从 `optional` 改为 `required`
3. **切换命名风格**：将 `user_name` 从 snake_case 转换为 camelCase 得到 `userName`
4. **手动重命名**：将 `order_list` 重命名为 `orders`

#### 最终生成的Thrift IDL
```thrift
struct Address {
  1: optional string cityName;
  2: optional string postalCode;
}

struct Profile {
  1: optional i64 age;
  2: optional string emailAddress;
  3: optional Address address;
}

struct OrderItem {
  1: optional string productId;
  2: optional i64 quantity;
  3: optional double unitPrice;
}

struct Order {
  1: optional string orderId;
  2: optional double totalAmount;
  3: optional list<OrderItem> items;
}

struct Root {
  1: required i64 userId;
  2: optional string userName;
  3: optional bool isActive;
  4: optional Profile profile;
  5: optional list<Order> orders;
}
```

### 技术特性

#### 性能优化
- **懒加载**：嵌套结构按需渲染
- **内存管理**：高效的数据结构存储用户修改
- **响应式设计**：适配不同屏幕尺寸

#### 数据完整性
- **类型推断**：自动识别JSON数据类型
- **字段合并**：数组对象字段智能合并
- **错误处理**：友好的错误提示和恢复机制

#### 用户体验
- **即时反馈**：所有操作实时生效
- **撤销/重做**：支持重置到初始状态
- **导出功能**：一键导出标准Thrift文件

### 开发接口

#### 初始化树形编辑器
```javascript
// 创建编辑器实例
const treeEditor = new ThriftTreeEditor('containerId');

// 加载JSON数据
treeEditor.loadFromJson(jsonObject);

// 获取生成的Thrift IDL
const thriftIDL = treeEditor.generateThriftIDL();
```

#### 事件监听
- `treeEditor.applyChanges()`：应用更改到文本输出
- `treeEditor.resetChanges()`：重置所有修改
- `treeEditor.exportThrift()`：导出为.thrift文件

### 浏览器兼容性
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ 移动端浏览器