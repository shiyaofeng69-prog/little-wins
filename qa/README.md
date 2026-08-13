# Little Wins QA Case 集

这套 Case 将“已经能自动验证的实现”和“尚未实现但必须定义验收标准的需求”分开管理。

## 内容

- `api/tests/cases/little_wins_api_cases.json`：可执行 API 示例，覆盖认证、越权、所有核心入参、异常路径和尺寸边界。
- `api/tests/test_case_catalog.py`：读取上面的 JSON 并逐条执行。
- `examples/little_wins_demo_cases.json`：用于页面体验验收的 18 条温情示例记录，覆盖六类、不同时间范围、珍藏、存档、多行文本和 Emoji。
- `scripts/seed_little_wins_cases.py`：将示例记录写入指定的临时 SQLite；不允许隐式使用生产库。
- `qa/product_acceptance_cases.json`：页面、功能、异常、权限、入参以及 P0/P1/P2 未完成需求的完整验收目录。

## 运行

完整自测：

```bash
PYTHON_BIN=api/venv/bin/python NODE_BIN=node ./scripts/run_case_self_test.sh
```

只跑数据驱动 API Case：

```bash
api/venv/bin/python -m pytest api/tests/test_case_catalog.py -q
```

创建一次性页面测试库：

```bash
api/venv/bin/python scripts/seed_little_wins_cases.py \
  --database /tmp/little-wins-qa.db --replace
```

`--replace` 只删除固定 QA 用户的旧记录，不影响其他用户。不要把测试库指向生产数据库。

备份并验证恢复：

```bash
python scripts/backup_restore.py backup --source data/nightlio.db --destination backups/little-wins.db
python scripts/backup_restore.py verify --database backups/little-wins.db
python scripts/backup_restore.py restore --backup backups/little-wins.db --destination /tmp/little-wins-restored.db
```

恢复到已存在路径必须显式传入 `--replace`。正式升级前应先恢复到空环境并核对输出的表行数和内容摘要。

## 状态含义

- `automated`：当前测试套件自动覆盖。
- `manual-ready`：已实现，可进行浏览器/人工验收。
- `deployment-ready`：代码防线已完成，必须使用真实生产配置验收。
- `pending`：尚未实现；Case 是未来的通过标准，当前不能计作通过。
