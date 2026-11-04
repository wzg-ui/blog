# 复习卡片盒 · 从零到能跑

一个在命令行里背单词的小工具。卡片按 Leitner 五盒法管理：答对升一盒，答错回第一盒，复习时总是先抽生的那一盒。数据存本地 JSON，不联网，不用注册。

整个项目两个文件、两百多行、不装任何第三方库。适合拿来练手的人：写过变量、`if`、`for`、函数，见过 `list` 和 `dict`，但还没独立写完过一个完整程序。

- 想直接跑：跳到第四节复制代码，或者直接用同目录的 `cards.py` / `main.py`。
- 想跟着写：从第二节开始，七步，每步都有能验证的中间状态。

---

## 一、整体架构

### 1.1 目录结构

```
flashcards/
├── cards.py      数据和规则
├── main.py       菜单和交互
├── cards.json    运行时生成：所有卡片
└── review.log    运行时生成：操作日志
```

后两个不用手动创建。第一次存盘时出现 `cards.json`，第一次录卡或复习时出现 `review.log`。删掉它们等于清空重来。

### 1.2 两个文件各管什么

| 文件 | 负责 | 不碰 |
|---|---|---|
| `cards.py` | 一张卡长什么样、怎么判对错、五个盒子怎么分、存到哪 | 不知道有菜单，不出现 `input()`，不出现 `print()` |
| `main.py` | 问用户要什么、把输入递过去、把结果打出来 | 不知道 JSON，不出现 `open()`，不关心盒子是字典还是列表 |

这条线不是洁癖。判定规则改了只动 `cards.py`，菜单改了只动 `main.py`，两边不用同时读。以后想加个网页界面，`cards.py` 一行都不用改。

`main.py` 里只有六个函数，每个对应菜单的一项：

```
add          录一张卡
review       复习
list_cards   清单
stats        统计
lookup       查词
main         菜单循环
```

`cards.py` 里是五个类（`Card` 和它的三个子类、`CardBox`）加两个小工具（`norm`、`log`）。

### 1.3 一张卡

六个字段是共用的，`cn` 只有填空卡才有：

| 字段 | 含义 | 例 |
|---|---|---|
| `id` | 编号，字母加三位数字 | `K012` |
| `type` | 题型 | `en2cn` / `cn2en` / `cloze` |
| `front` | 正面，抽卡时先显示 | `abandon` |
| `back` | 背面，兼作答案 | `放弃；抛弃` |
| `tags` | 标签，列表 | `["unit3"]` |
| `box` | 在第几号盒，1–5 | `1` |
| `cn` | 只有填空卡有，这句的译文 | `他在周五之前完成了那份报告。` |

三种题型：

| 题型 | 正面 | 背面 | 判法 |
|---|---|---|---|
| 英译汉 `en2cn` | `abandon` | `放弃；抛弃` | 自评：翻面后自己按 y/n |
| 汉译英 `cn2en` | `坚持` | `persist\|persevere` | 输入比对，任一个都对 |
| 句子填空 `cloze` | `He ___ it by Friday.` | `managed` | 输入比对，答案只留一个形式 |

词组（`look forward to`）走 `en2cn`。它和单词唯一的区别是正面长一点，判定方式一样，没必要单开一类。

背面用竖线分隔多个可接受答案。不用斜杠：`and/or`、`24/7` 这类答案本身带斜杠，一拆就散。

### 1.4 数据怎么流

**启动**——把磁盘上的数组还原成对象和盒子：

```
cards.json  ──json.load──>  list[dict]  ──make_card──>  list[Card]
                                                          │
                                            按 c.box 分装 ▼
                                      boxes = {1: [...], 2: [...], ... 5: [...]}
```

盒号只存在卡片的 `box` 字段里，五个列表不单独存盘。读回来从 `box` 重新分一次，两边永远一致。

**录一张**：

```
input  ──>  正则验编号  ──>  造 Card 对象  ──>  CardBox.add()
                                                    │
                                          cards.append + boxes[box].append
                                                    │
                                              save() ──> cards.json
```

**复习**：

```
due(box)  ──yield──>  一张卡  ──>  印正面  ──>  check()
                                                   │
                                    None（自评）或 True/False（自动判）
                                                   │
                                            review(card, ok)
                                                   │
                                  boxes 里挪一次 + 改 card.box ──> save()
```

`due()` 是生成器，给一张取一张，不先把几百张拼成一个大列表。从 1 号盒往后走，最生的卡自然先出来。

### 1.5 技术栈

只用标准库，`pip install` 一个都不用跑。

| 模块 | 用来干什么 | 用在哪 |
|---|---|---|
| `json` | 存档读档 | `CardBox.__init__` / `save` |
| `pathlib.Path` | 拼出 `cards.json` 的路径，不写死盘符 | 文件顶部 |
| `re` | 校验编号形状 `^[A-Z]+\d{3}$` | `add()` |
| `unicodedata` | 全角字母折成半角（`ｐｅｒｓｉｓｔ` → `persist`） | `norm()` |
| `functools` | `wraps` 保住被装饰函数的名字 | `log()` |
| `datetime` | 日志里打时间 | `log()` |

运行环境：Python 3.8 及以上。示例在 3.13 上跑过。

---

## 二、动手之前

### 2.1 装 Python

Windows 去 python.org 下安装包，装的时候勾上 **Add Python to PATH**。macOS 和 Linux 一般自带。

打开终端（Windows 是 PowerShell 或 cmd），确认版本：

```bash
python --version
```

```
Python 3.13.12
```

macOS / Linux 上如果 `python` 不存在，把下面所有命令里的 `python` 换成 `python3`。

### 2.2 建目录

```bash
mkdir flashcards
cd flashcards
```

两个文件都在这个目录里。不用建虚拟环境——没有依赖。

### 2.3 先建两个空文件

`cards.py` 和 `main.py` 各自先写一行说明，省得编辑器报错：

```python
# cards.py
"""卡片盒：数据与行为都在这儿，main.py 只负责菜单。"""
```

```python
# main.py
"""菜单和交互。"""
```

---

## 三、七步写出来

每一步都能跑。中间状态功能不全，但不报错，可以随时停下来验证。

### 第 1 步：让菜单转起来

先不管卡片，把 `while` 循环和退出写对。这一步只有 `main.py`：

```python
"""先让菜单能转起来。"""


def main():
    while True:
        print("\n1 录入  2 复习  3 清单  4 统计  5 查阅  0 退出")
        choice = input("> ").strip()
        if choice == "0":
            break
        print("还没有这个功能")


if __name__ == "__main__":
    main()
```

运行：

```bash
python main.py
```

输入 `9` 再输入 `0`，应该看到：

```
1 录入  2 复习  3 清单  4 统计  5 查阅  0 退出
> 还没有这个功能

1 录入  2 复习  3 清单  4 统计  5 查阅  0 退出
>
```

`while True` 里没有出口就是死循环，`if choice == "0": break` 是唯一出口。`if __name__ == "__main__"` 那一行的作用是：只有直接运行这个文件才执行 `main()`，被别的文件 `import` 时不执行。

### 第 2 步：定义一张卡

现在写 `cards.py`。一张卡有编号、正面、背面、标签、盒号。三个题型共用一个基类，能自动判的两个子类各覆盖一个方法。

```python
"""卡片盒：数据与行为都在这儿，main.py 只负责菜单。"""

import json
import unicodedata
from pathlib import Path

DATA = Path(__file__).parent / "cards.json"
LOG = Path(__file__).parent / "review.log"


def norm(s):
    """全角折半角，再去两头空白、转小写。ｐｅｒｓｉｓｔ 和 persist 要算同一个。"""
    return unicodedata.normalize("NFKC", s).strip().lower()


class Card:
    type = "en2cn"

    def __init__(self, cid, front, back, tags=None, box=1):
        self.id = cid
        self.front = front
        self.back = back
        self.tags = tags or []
        self.box = box

    def answers(self):
        """背面用竖线隔开多个可接受答案，拆开逐个比。"""
        return [norm(a) for a in self.back.split("|")]

    def check(self, typed):
        """返回 None 表示这种卡得自己判。"""
        return None

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "front": self.front,
            "back": self.back,
            "tags": self.tags,
            "box": self.box,
        }

    def __repr__(self):
        return f"{self.id}  {self.front}  ->  {self.back}"


class WordCard(Card):
    """英译汉、词组：正面英文，背面中文，自评。"""

    type = "en2cn"


class AskCard(Card):
    """汉译英：给中文写英文，能自动判。"""

    type = "cn2en"

    def check(self, typed):
        return norm(typed) in self.answers()


class ClozeCard(Card):
    """句子填空：正面是挖了空的句子，答案只留一个形式。"""

    type = "cloze"

    def __init__(self, cid, front, back, cn, tags=None, box=1):
        super().__init__(cid, front, back, tags, box)
        self.cn = cn

    def check(self, typed):
        return norm(typed) in self.answers()

    def to_dict(self):
        d = super().to_dict()
        d["cn"] = self.cn
        return d
```

`DATA` 和 `LOG` 这一步还用不上，先把路径定下来：`Path(__file__).parent` 是「本文件所在目录」，从哪个目录启动程序都能找对文件。第 6 步才真的读写它们。

验证——不进菜单，直接在命令行里造一张卡看它长什么样：

```bash
python -c "from cards import Card, AskCard, ClozeCard; print(Card('K001','abandon','放弃；抛弃')); print(AskCard('K002','坚持','persist|persevere').answers()); print(ClozeCard('K003','He ___ it by Friday.','managed','他周五前做到了。').cn)"
```

```
K001  abandon  ->  放弃；抛弃
['persist', 'persevere']
他周五前做到了。
```

三行分别验证了 `__repr__`、`answers()` 拆竖线、子类的 `cn` 字段。

### 第 3 步：录第一张卡

`cards.py` 末尾加一个 `CardBox`，先只管一件事：把卡收进来。

```python
class CardBox:
    def __init__(self):
        self.cards = []

    def add(self, card):
        if any(c.id == card.id for c in self.cards):
            return False
        self.cards.append(card)
        return True
```

`main.py` 改成这样——引入 `cards`、写 `add()`、菜单用字典分发：

```python
"""菜单和交互。数据、判定都在 cards.py 里。"""

import re
from cards import CardBox, WordCard, AskCard, ClozeCard

ID_RE = r"^[A-Z]+\d{3}$"


def add(book):
    cid = input("编号（字母+三位数字） > ").strip()
    if not re.match(ID_RE, cid):
        print("编号形状不对，要字母加三位数字")
        return
    if any(c.id == cid for c in book.cards):
        print("这个编号已经有了")
        return
    kind = input("题型 1 英译汉 2 汉译英 3 句子填空 > ").strip()
    front = input("正面 > ").strip()
    back = input("背面（多个答案用 | 隔开） > ").strip()
    raw = input("标签（逗号隔开，可空） > ").strip()
    tags = list({t.strip() for t in raw.split(",") if t.strip()})
    if kind == "3":
        cn = input("译文 > ").strip()
        card = ClozeCard(cid, front, back, cn, tags)
    elif kind == "2":
        card = AskCard(cid, front, back, tags)
    else:
        card = WordCard(cid, front, back, tags)
    if book.add(card):
        print(f"已录入 {card.id}")


MENU = {"1": add}


def main():
    book = CardBox()
    while True:
        print("\n1 录入  2 复习  3 清单  4 统计  5 查阅  0 退出")
        choice = input("> ").strip()
        if choice == "0":
            break
        func = MENU.get(choice)
        if func is None:
            print("没有这个选项")
            continue
        func(book)


if __name__ == "__main__":
    main()
```

三处值得停一下：

- `MENU = {"1": add}` 里放的是函数本身，不是函数名。函数可以当值存进字典，所以查一个键就能调用，不用写一长串 `if/elif`。后面加功能只要往字典里加一行。
- 校验分两道：`re.match` 管形状，`any(...)` 管重复。形状对了但已经存在的，也不会放进去。
- `list({t.strip() for t in raw.split(",") if t.strip()})` 一句做了三件事：按逗号切开、去掉两头空格、用集合去重（同名的标签只留一个），最后转回列表。

验证：先输一个错的编号，再录一张。

```bash
python main.py
```

```
1 录入  2 复习  3 清单  4 统计  5 查阅  0 退出
> 1
编号（字母+三位数字） > k12
编号形状不对，要字母加三位数字

1 录入  2 复习  3 清单  4 统计  5 查阅  0 退出
> 1
编号（字母+三位数字） > K001
题型 1 英译汉 2 汉译英 3 句子填空 > 1
正面 > abandon
背面（多个答案用 | 隔开） > 放弃；抛弃
标签（逗号隔开，可空） > unit3
已录入 K001
```

录完退出再进——卡没了。现在数据只在内存里，进程一结束就丢。这是第 6 步要解决的事。

### 第 4 步：五个盒子和复习

`cards.py` 里把 `CardBox` 整个换成下面这段（多了 `boxes`、`due`、`review`）：

```python
class CardBox:
    def __init__(self):
        self.cards = []
        # 五个盒子就是五个列表，卡片按 box 字段分装
        self.boxes = {i: [] for i in range(1, 6)}

    def add(self, card):
        if any(c.id == card.id for c in self.cards):
            return False
        self.cards.append(card)
        self.boxes[card.box].append(card)
        return True

    def due(self, box=None):
        """最生的先出：给了盒号只走那一盒，否则从 1 号走到 5 号。"""
        for b in ([box] if box else range(1, 6)):
            for c in self.boxes[b]:
                yield c

    def review(self, card, ok):
        self.boxes[card.box].remove(card)
        card.box = min(card.box + 1, 5) if ok else 1
        self.boxes[card.box].append(card)
```

`main.py` 加 `review()`，`MENU` 补一项：

```python
def review(book):
    if not book.cards:
        print("还没有卡，先录一张")
        return
    choose = input("复习哪个盒？1-5，回车=全部 > ").strip()
    box = int(choose) if choose in ("1", "2", "3", "4", "5") else None
    if choose and box is None:
        print("只认 1-5，这次按全部来")
    for card in list(book.due(box)):
        print(f"\n[{card.box} 号盒] {card.id}")
        print(f"正面：{card.front}")
        if isinstance(card, ClozeCard):
            print(f"译文：{card.cn}")
        if card.check("") is None:
            input("回车看背面 > ")
            print(f"背面：{card.back}")
            ok = input("对了吗？y/n > ").strip().lower() == "y"
        else:
            typed = input("输入英文 > ")
            ok = card.check(typed)
            print("对。" if ok else f"错。答案 {card.back}。")
        book.review(card, ok)
        print(f"{'升到' if ok else '退回'} {card.box} 号盒")


MENU = {"1": add, "2": review}
```

三处要点：

- `boxes = {i: [] for i in range(1, 6)}` 得到 `{1: [], 2: [], 3: [], 4: [], 5: []}`，字典套列表。同一张卡既在 `cards` 里，也在某个盒子里，是同一个对象的两套索引。
- `due()` 里有 `yield`，所以它是生成器，不是一次返回一个大列表。`for b in ([box] if box else range(1, 6))` 是「给了盒号就只走那一盒」的简写。
- `card.check("") is None` 是问「这张卡是不是自评的那种」。基类 `check` 永远返回 `None`，两个子类返回 `True`/`False`，所以传什么进去都能得到判断。

`list(book.due(box))` 外面的 `list()` 不能省。复习过程中 `review()` 会从盒子里删卡，边遍历边改容器会漏卡，先拍个快照最省事。

验证：

```
1 录入  2 复习  3 清单  4 统计  5 查阅  0 退出
> 2
复习哪个盒？1-5，回车=全部 >
[1 号盒] K001
正面：abandon
回车看背面 > 背面：放弃；抛弃
对了吗？y/n > y
升到 2 号盒
```

再复习一次、这次打 `n`，会看到「退回 1 号盒」。升到 5 号盒以后再答对，仍然是 5——`min(box + 1, 5)` 封了顶。

### 第 5 步：统计、清单、查词

`cards.py` 的 `CardBox` 里补三样东西，都追加到类里：

```python
    @property
    def rate(self):
        if not self.cards:
            return 0.0
        return sum(1 for c in self.cards if c.box >= 4) / len(self.cards)

    def stats(self):
        """返回 (熟卡数, 总数)，调用处解包。"""
        return sum(1 for c in self.cards if c.box >= 4), len(self.cards)

    def lookup(self, q):
        q = norm(q)
        return [c for c in self.cards if norm(c.front).startswith(q)]
```

`main.py` 加三个函数，`MENU` 补全：

```python
def list_cards(book):
    print(" 盒  编号   正面")
    for c in sorted(book.cards, key=lambda c: c.box):
        print(f"  {c.box}  {c.id}  {c.front}")


def stats(book):
    for b in range(1, 6):
        n = len(book.boxes[b])
        print(f"{b} 号盒  {'■' * n}  {n}")
    done, total = book.stats()
    print(f"掌握率 {book.rate:.0%}（{done}/{total}）")
    if book.cards:
        print("最近五张：" + "、".join(c.id for c in book.cards[-5:]))


def lookup(book):
    q = input("查词 > ").strip()
    if not q:
        return
    hits = book.lookup(q)
    if not hits:
        print("没有")
        return
    for c in hits:
        print(f"{c.id}  {c.front}  {c.back}  [{c.box} 号盒]  {','.join(c.tags)}")


MENU = {"1": add, "2": review, "3": list_cards, "4": stats, "5": lookup}
```

- `stats()` 返回元组 `(熟卡数, 总数)`，调用处用 `done, total = book.stats()` 一次接两个。
- `rate` 上面有 `@property`，所以用的时候写 `book.rate`，不带括号。
- 一张卡都没有时 `rate` 直接返回 `0.0`，否则 `0/0` 会抛 `ZeroDivisionError`。
- `'■' * n` 是把盒子里的卡数画成方块条，`n` 是几就印几个。
- `cards[-5:]` 是切片，取最后五个，正好补上「刚录的几张」。

验证（先录两张，一张英译汉、一张填空，然后依次按 4、3、5）：

```
> 4
1 号盒  ■■  2
2 号盒    0
3 号盒    0
4 号盒    0
5 号盒    0
掌握率 0%（0/2）
最近五张：K001、K002

> 3
 盒  编号   正面
  1  K001  坚持
  1  K002  He ___ by Friday.

> 5
查词 > 坚持
K001  坚持  persist|persevere  [1 号盒]  unit3
```

查词是前缀匹配：输 `aban` 也能查到 `abandon`。中文也一样，因为汉译英卡的正面就是中文。

### 第 6 步：存档

现在关掉程序，卡就没了。补读档和存盘。

`cards.py` 里，先在 `ClozeCard` 后面加一个工厂函数——从字典造回对象，`type` 决定造哪一类：

```python
def make_card(d):
    if d["type"] == "cloze":
        return ClozeCard(d["id"], d["front"], d["back"], d["cn"], d["tags"], d["box"])
    if d["type"] == "cn2en":
        return AskCard(d["id"], d["front"], d["back"], d["tags"], d["box"])
    return WordCard(d["id"], d["front"], d["back"], d["tags"], d["box"])
```

把 `CardBox` 的 `__init__` 换成读档版。类里其余方法（`add`、`due`、`review`、`rate`、`stats`、`lookup`）原样留着，只换这一个方法：

```python
    def __init__(self, path=DATA):
        self.path = path
        try:
            with open(path, encoding="utf-8") as f:
                raw = json.load(f)
        except FileNotFoundError:
            raw = []
        self.cards = [make_card(d) for d in raw]
        # 盒子不存盘：读回来按 box 字段重新分一次就有了
        self.boxes = {i: [] for i in range(1, 6)}
        for c in self.cards:
            self.boxes[c.box].append(c)
```

再往类里加 `save`，放在 `review` 后面：

```python
    def save(self):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump([c.to_dict() for c in self.cards], f, ensure_ascii=False, indent=1)
```

`main.py` 三处加存盘：

1. `add()` 末尾，`if book.add(card):` 里面：

```python
    if book.add(card):
        book.save()
        print(f"已录入 {card.id}")
```

2. `review()` 的 `for` 循环之后、函数末尾：

```python
    book.save()
```

3. `main()` 的退出分支：

```python
        if choice == "0":
            book.save()
            print("存好了")
            break
```

`try` / `except FileNotFoundError` 是全项目唯一一处必须写异常的地方：第一次运行文件还不存在，`open()` 一定会抛，这不是防备，是真的会发生。

`encoding="utf-8"` 两处都要写。Windows 上默认编码是 GBK，读自己写的 UTF-8 文件会乱码。`ensure_ascii=False` 让中文原样写进文件，不转成 `\u5b57` 那种转义。

验证——录一张，退出，再启动，看数据还在不在：

```bash
python main.py     # 录一张，按 0 退出
python main.py     # 再进来，按 4
```

```
> 4
1 号盒  ■  1
2 号盒    0
...
掌握率 0%（0/1）
最近五张：K012
```

同目录会多出 `cards.json`，长这样：

```json
[
 {
  "id": "K012",
  "type": "en2cn",
  "front": "abandon",
  "back": "放弃；抛弃",
  "tags": [
   "unit3"
  ],
  "box": 1
 }
]
```

注意里面没有「五个盒子」，只有每张卡的 `box`。盒子是读回来现分的。

### 第 7 步：记日志

最后加装饰器。`cards.py` 顶部补两个 import：

```python
import functools
from datetime import datetime
```

在 `norm` 后面加装饰器：

```python
def log(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        card = args[1] if len(args) > 1 else None
        cid = getattr(card, "id", "")
        stamp = datetime.now().strftime("%m-%d %H:%M")
        with LOG.open("a", encoding="utf-8") as f:
            f.write(f"{stamp}  {func.__name__}  {cid}\n")
        return result

    return wrapper
```

然后给 `add` 和 `review` 各加一行 `@log`：

```python
    @log
    def add(self, card):
        ...

    @log
    def review(self, card, ok):
        ...
```

`args[1]` 是 `self` 之后的第一个参数：`add` 的 `card`、`review` 的 `card`。`getattr(card, "id", "")` 取不到就写空串，不让日志把程序带崩。

`open(..., "a")` 是追加模式。用 `"w"` 每次都从头写，上一次的日志会被冲掉。`functools.wraps` 不能省——不写的话，`func.__name__` 全是 `wrapper`，日志里每条都长一样。

验证：录一张、复习一次，然后看日志：

```bash
python main.py     # 录一张，复习一次，退出
cat review.log     # Windows 用 type review.log
```

```
11-04 15:44  add  K001
11-04 15:44  review  K001
```

---

## 四、完整代码

到这里两个文件应该和下面一致。也可以直接从同目录复制。

`cards.py`：

```python
"""卡片盒：数据与行为都在这儿，main.py 只负责菜单。"""

import functools
import json
import unicodedata
from datetime import datetime
from pathlib import Path

DATA = Path(__file__).parent / "cards.json"
LOG = Path(__file__).parent / "review.log"


def norm(s):
    """全角折半角，再去两头空白、转小写。ｐｅｒｓｉｓｔ 和 persist 要算同一个。"""
    return unicodedata.normalize("NFKC", s).strip().lower()


def log(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        card = args[1] if len(args) > 1 else None
        cid = getattr(card, "id", "")
        stamp = datetime.now().strftime("%m-%d %H:%M")
        with LOG.open("a", encoding="utf-8") as f:
            f.write(f"{stamp}  {func.__name__}  {cid}\n")
        return result

    return wrapper


class Card:
    type = "en2cn"

    def __init__(self, cid, front, back, tags=None, box=1):
        self.id = cid
        self.front = front
        self.back = back
        self.tags = tags or []
        self.box = box

    def answers(self):
        """背面用竖线隔开多个可接受答案，拆开逐个比。"""
        return [norm(a) for a in self.back.split("|")]

    def check(self, typed):
        """返回 None 表示这种卡得自己判。"""
        return None

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "front": self.front,
            "back": self.back,
            "tags": self.tags,
            "box": self.box,
        }

    def __repr__(self):
        return f"{self.id}  {self.front}  ->  {self.back}"


class WordCard(Card):
    """英译汉、词组：正面英文，背面中文，自评。"""

    type = "en2cn"


class AskCard(Card):
    """汉译英：给中文写英文，能自动判。"""

    type = "cn2en"

    def check(self, typed):
        return norm(typed) in self.answers()


class ClozeCard(Card):
    """句子填空：正面是挖了空的句子，答案只留一个形式。"""

    type = "cloze"

    def __init__(self, cid, front, back, cn, tags=None, box=1):
        super().__init__(cid, front, back, tags, box)
        self.cn = cn

    def check(self, typed):
        return norm(typed) in self.answers()

    def to_dict(self):
        d = super().to_dict()
        d["cn"] = self.cn
        return d


def make_card(d):
    if d["type"] == "cloze":
        return ClozeCard(d["id"], d["front"], d["back"], d["cn"], d["tags"], d["box"])
    if d["type"] == "cn2en":
        return AskCard(d["id"], d["front"], d["back"], d["tags"], d["box"])
    return WordCard(d["id"], d["front"], d["back"], d["tags"], d["box"])


class CardBox:
    def __init__(self, path=DATA):
        self.path = path
        try:
            with open(path, encoding="utf-8") as f:
                raw = json.load(f)
        except FileNotFoundError:
            raw = []
        self.cards = [make_card(d) for d in raw]
        # 盒子不存盘：读回来按 box 字段重新分一次就有了
        self.boxes = {i: [] for i in range(1, 6)}
        for c in self.cards:
            self.boxes[c.box].append(c)

    @property
    def rate(self):
        if not self.cards:
            return 0.0
        return sum(1 for c in self.cards if c.box >= 4) / len(self.cards)

    @log
    def add(self, card):
        if any(c.id == card.id for c in self.cards):
            return False
        self.cards.append(card)
        self.boxes[card.box].append(card)
        return True

    def due(self, box=None):
        """最生的先出：给了盒号只走那一盒，否则从 1 号走到 5 号。"""
        for b in ([box] if box else range(1, 6)):
            for c in self.boxes[b]:
                yield c

    @log
    def review(self, card, ok):
        self.boxes[card.box].remove(card)
        card.box = min(card.box + 1, 5) if ok else 1
        self.boxes[card.box].append(card)

    def save(self):
        with open(self.path, "w", encoding="utf-8") as f:
            json.dump([c.to_dict() for c in self.cards], f, ensure_ascii=False, indent=1)

    def stats(self):
        """返回 (熟卡数, 总数)，调用处解包。"""
        return sum(1 for c in self.cards if c.box >= 4), len(self.cards)

    def lookup(self, q):
        q = norm(q)
        return [c for c in self.cards if norm(c.front).startswith(q)]
```

`main.py`：

```python
"""菜单和交互。数据、判定都在 cards.py 里。"""

import re
from cards import CardBox, WordCard, AskCard, ClozeCard

ID_RE = r"^[A-Z]+\d{3}$"


def add(book):
    cid = input("编号（字母+三位数字） > ").strip()
    if not re.match(ID_RE, cid):
        print("编号形状不对，要字母加三位数字")
        return
    if any(c.id == cid for c in book.cards):
        print("这个编号已经有了")
        return
    kind = input("题型 1 英译汉 2 汉译英 3 句子填空 > ").strip()
    front = input("正面 > ").strip()
    back = input("背面（多个答案用 | 隔开） > ").strip()
    raw = input("标签（逗号隔开，可空） > ").strip()
    tags = list({t.strip() for t in raw.split(",") if t.strip()})
    if kind == "3":
        cn = input("译文 > ").strip()
        card = ClozeCard(cid, front, back, cn, tags)
    elif kind == "2":
        card = AskCard(cid, front, back, tags)
    else:
        card = WordCard(cid, front, back, tags)
    if book.add(card):
        book.save()
        print(f"已录入 {card.id}")


def review(book):
    if not book.cards:
        print("还没有卡，先录一张")
        return
    choose = input("复习哪个盒？1-5，回车=全部 > ").strip()
    box = int(choose) if choose in ("1", "2", "3", "4", "5") else None
    if choose and box is None:
        print("只认 1-5，这次按全部来")
    for card in list(book.due(box)):
        print(f"\n[{card.box} 号盒] {card.id}")
        print(f"正面：{card.front}")
        if isinstance(card, ClozeCard):
            print(f"译文：{card.cn}")
        if card.check("") is None:
            input("回车看背面 > ")
            print(f"背面：{card.back}")
            ok = input("对了吗？y/n > ").strip().lower() == "y"
        else:
            typed = input("输入英文 > ")
            ok = card.check(typed)
            print("对。" if ok else f"错。答案 {card.back}。")
        book.review(card, ok)
        print(f"{'升到' if ok else '退回'} {card.box} 号盒")
    book.save()


def list_cards(book):
    print(" 盒  编号   正面")
    for c in sorted(book.cards, key=lambda c: c.box):
        print(f"  {c.box}  {c.id}  {c.front}")


def stats(book):
    for b in range(1, 6):
        n = len(book.boxes[b])
        print(f"{b} 号盒  {'■' * n}  {n}")
    done, total = book.stats()
    print(f"掌握率 {book.rate:.0%}（{done}/{total}）")
    if book.cards:
        print("最近五张：" + "、".join(c.id for c in book.cards[-5:]))


def lookup(book):
    q = input("查词 > ").strip()
    if not q:
        return
    hits = book.lookup(q)
    if not hits:
        print("没有")
        return
    for c in hits:
        print(f"{c.id}  {c.front}  {c.back}  [{c.box} 号盒]  {','.join(c.tags)}")


MENU = {"1": add, "2": review, "3": list_cards, "4": stats, "5": lookup}


def main():
    book = CardBox()
    while True:
        print("\n1 录入  2 复习  3 清单  4 统计  5 查阅  0 退出")
        choice = input("> ").strip()
        if choice == "0":
            book.save()
            print("存好了")
            break
        func = MENU.get(choice)
        if func is None:
            print("没有这个选项")
            continue
        try:
            func(book)
        except (KeyboardInterrupt, EOFError):
            book.save()
            print("\n中途退出，已存盘")
            break


if __name__ == "__main__":
    main()
```

`main()` 里那个 `try` 是给 `Ctrl+C` 用的：复习到一半按 `Ctrl+C` 会抛 `KeyboardInterrupt`，不接住这一轮的盒号就白改了。`EOFError` 是 `Ctrl+D` / `Ctrl+Z`，同一个处理。

---

## 五、跑一遍完整的

第一次跑，照这个顺序走一遍，能同时验证录入、判法、盒子、存档：

```bash
python main.py
```

先录三张，三种题型各一张：

| 输入 | 值 |
|---|---|
| 编号 | `K001` |
| 题型 | `1`（英译汉） |
| 正面 | `abandon` |
| 背面 | `放弃；抛弃` |
| 标签 | `unit3` |

| 输入 | 值 |
|---|---|
| 编号 | `K002` |
| 题型 | `2`（汉译英） |
| 正面 | `坚持` |
| 背面 | `persist\|persevere` |
| 标签 | `unit3` |

| 输入 | 值 |
|---|---|
| 编号 | `K003` |
| 题型 | `3`（填空） |
| 正面 | `He ___ to finish the report by Friday.` |
| 背面 | `managed` |
| 标签 | `unit5` |
| 译文 | `他在周五之前完成了那份报告。` |

然后按 `2`，选 1 号盒，三张轮流出现：

- `K001` 自评，翻面看背面，按 `y`
- `K002` 输入 `persist`，应该显示「对。」
- `K003` 输入 `manage`，应该显示「错。答案 managed。」，退回 1 号盒

按 `0` 退出，再启动一次，按 `3` 看清单：

```
 盒  编号   正面
  1  K003  He ___ to finish the report by Friday.
  2  K001  abandon
  2  K002  坚持
```

前两张在 2 号盒、第三张还在 1 号盒——这就是刚才那三个回答的结果。`review.log` 里应该有六行（三次 `add`、三次 `review`）。

---

## 六、容易踩的坑

**关掉再开数据没了。** 卡在第 6 步之前，`save()` 还没写。检查 `add()` 末尾和退出那一支有没有 `book.save()`，以及同目录下有没有 `cards.json`。

**一次录卡录出两张。** `add()` 里 `if book.add(card):` 已经查了重，但 `main.py` 的 `add()` 开头也查了一次。两次都留着没问题，删掉 `main.py` 那次会变成「静默失败」——`add` 返回 `False`，屏幕上什么都不显示，容易让人以为程序卡了。

**中文变成乱码。** 所有 `open()` 都写了 `encoding="utf-8"`，如果还乱，是终端的问题。Windows cmd 可以先跑 `chcp 65001`；或者换 PowerShell。

**全角输入判错。** 中文输入法下打英文，字母是全角的（`ｐｅｒｓｉｓｔ`）。`norm()` 里的 `NFKC` 就是干这个的，别删。

**改了代码但行为没变。** 同目录的 `cards.json` 是旧数据，不影响的概率很大。真正容易看错的是 `__pycache__`，删掉重跑即可。

**文件找不到。** `Path(__file__).parent / "cards.json"` 永远指向 `cards.py` 所在目录，和你在哪启动无关。所以从别的目录 `python ../flashcards/main.py` 也不会写到别处去。

**`list(book.due(box))` 少了 `list()`。** 复习时删卡会导致跳过某张。原因是在遍历容器的同时修改它。

---

## 七、还能接着加

- 按标签复习：给 `due()` 加一个 `tag=None` 参数，只 yield 带这个标签的卡。
- 隔几天再提醒：给卡片记一个 `last` 日期，`due()` 里跟今天比。
- 导出 CSV：`csv` 模块三行，Excel 能直接打开。
- 网页版：把 `cards.py` 原样搬进浏览器（Pyodide），`main.py` 换成 HTML。判定和盒子规则一行不用改——这就是第 1.2 节那条分工线的回报。
