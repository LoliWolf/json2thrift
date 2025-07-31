# JSON转Thrift IDL

一个用于uTools的插件，可以将JSON数据转换为Thrift IDL结构体定义。

## 功能特性

- 🔄 JSON到Thrift IDL的智能转换
- 📝 JSON格式化功能
- 📋 一键复制生成的代码
- ✏️ 可编辑的预览结果
- 🎨 现代化的用户界面
- 🔧 保持原始字段命名（不强制下划线命名）

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
