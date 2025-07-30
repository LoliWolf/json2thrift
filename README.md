# JSON转Thrift IDL

一个用于uTools的插件，可以将JSON数据转换为Thrift IDL结构体定义。

## 功能特性

- 🔄 JSON到Thrift IDL的智能转换
- 📝 JSON格式化功能
- 📋 一键复制生成的代码
- ✏️ 可编辑的预览结果
- 🎨 现代化的用户界面
- 🔧 保持原始字段命名（不强制下划线命名）

## 使用方法

1. 在uTools中输入关键词：`json2thrift`、`JSON转Thrift` 或 `thrift`
2. 在左侧输入框中粘贴或输入JSON数据
3. 点击「格式化JSON」按钮可以格式化输入的JSON
4. 点击「生成Thrift」按钮转换为Thrift IDL
5. 在右侧预览框中查看和编辑生成的代码
6. 点击「复制代码」按钮复制到剪贴板

## 转换规则

- `string` → `string`
- `number` (整数) → `i64`
- `number` (小数) → `double`
- `boolean` → `bool`
- `array` → `list<T>`
- `object` → 自定义结构体
- `null` → `string` (可选字段)

## 示例

### 输入JSON：
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

### 生成的Thrift IDL：
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
