# 评论系统诊断指南

如果评论数据没有成功插入到数据库，请按照以下步骤进行诊断：

## 🚀 快速诊断

访问诊断页面: `/diagnostic`

## 📋 诊断步骤

### 1. 数据库检查

```bash
# 确保PostgreSQL正在运行
sudo service postgresql status

# 或者使用Docker
docker ps | grep postgres
```

### 2. 环境变量配置

确保以下环境变量正确配置:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=story_chain
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
```

### 3. 使用诊断页面

1. 访问 `http://localhost:3000/diagnostic`
2. 按顺序点击以下按钮:
   - **检查数据库表** - 验证tables是否存在
   - **初始化数据库表** - 创建必要的表(如果不存在)
   - **数据库连接** - 测试连接
   - **监控状态** - 检查链上监控是否运行
   - **启动监控** - 启动监控系统
   - **插入测试评论** - 手动插入测试数据
   - **查询所有评论** - 验证插入是否成功

## 🔍 常见问题解决

### 问题1: 数据库连接失败

**解决方案:**

1. 检查PostgreSQL是否运行
2. 验证数据库凭据
3. 确保数据库`story_chain`存在

### 问题2: 监控未运行

**解决方案:**

1. 点击"启动监控"按钮
2. 检查控制台日志
3. 验证合约地址配置

### 问题3: 评论表不存在

**解决方案:**

1. 点击"初始化数据库表"
2. 检查数据库权限
3. 手动运行schema.sql

## 📊 数据库表结构

comments表应该包含以下字段:

- id (VARCHAR(100)) - Primary Key
- token_id (VARCHAR(50)) - 故事或章节ID
- commenter (VARCHAR(42)) - 评论者地址
- ipfs_hash (TEXT) - IPFS内容哈希
- created_time (BIGINT) - 创建时间戳
- block_number (BIGINT) - 区块号
- transaction_hash (VARCHAR(66)) - 交易哈希

## 🛠️ 手动数据库操作

```sql
-- 检查表是否存在
SELECT table_name FROM information_schema.tables WHERE table_name = 'comments';

-- 查看表结构
\d comments;

-- 查看评论数据
SELECT * FROM comments ORDER BY created_time DESC;

-- 清空测试数据
DELETE FROM comments WHERE transaction_hash LIKE '0xtest%';
```

## 📝 日志检查

查看应用程序日志中的相关消息:

- `✅ 成功插入评论: ...` - 评论插入成功
- `❌ 插入评论失败: ...` - 评论插入失败
- `📝 评论事件详情: ...` - 链上事件被捕获
- `✅ 链上数据监控已自动启动` - 监控启动成功

## 🆘 需要帮助?

如果问题仍然存在:

1. 查看诊断页面的详细错误信息
2. 检查浏览器控制台的错误日志
3. 检查应用程序服务器日志
